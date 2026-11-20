import 'server-only'
import { randomBytes } from 'node:crypto'
import { hash } from '@node-rs/argon2'
import { NextResponse } from 'next/server'
import { getAddress, verifyMessage } from 'ethers'
import { connectDatabase } from '@/lib/db/connection'
import { Sessions, Users } from '@/lib/db/models'
import { getEnv } from '@/lib/env'
import { backendError, ServiceUnavailableError } from '@/lib/service-error'
import { requirePermission } from '@/lib/auth/authorization'
import { expectedWallet } from '@/lib/auth/expected-wallet'
import { reserveLoginAttempt, releaseLoginAttempt } from '@/lib/auth/login-limit'
import { verifyUserMfa } from '@/lib/auth/mfa'
import { verifyPassword } from '@/lib/auth/password'
import { isSameOriginRequest, requestContext } from '@/lib/auth/request-origin'
import { toAppRole, dbRoleSchema } from '@/lib/auth/role-map'
import {
  SESSION_COOKIE_NAME,
  IDLE_LIFETIME,
  createSession,
  currentTokenHash,
  getSessionCookieOptions,
  getVerifiedServerSession,
  revokeSession,
  rotateSession,
  tokenHash,
} from '@/lib/auth/session'
import { appendAudit, appendAuditBestEffort } from '@/modules/audit/service'

let dummyHash: Promise<string> | undefined
const invalid = () =>
  NextResponse.json(
    { error: 'UNAUTHENTICATED', message: 'Email dinas atau kata sandi tidak valid.' },
    { status: 401 },
  )
const limited = () =>
  NextResponse.json(
    { message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
    { status: 429, headers: { 'Retry-After': '900' } },
  )

export async function login(request: Request) {
  try {
    await connectDatabase()
    if (!isSameOriginRequest(request))
      return NextResponse.json({ message: 'Origin ditolak.' }, { status: 403 })
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ message: 'JSON tidak valid.' }, { status: 400 })
    }
    if (
      !body ||
      typeof body.email !== 'string' ||
      !body.email.trim() ||
      typeof body.password !== 'string' ||
      body.email.length > 254 ||
      body.password.length > 1024
    )
      return NextResponse.json({ message: 'Input tidak valid.' }, { status: 400 })
    const context = requestContext(request)
    const identifier = body.email.trim().toLowerCase()
    const ipAttempt = await reserveLoginAttempt('ip', context.ip)
    if (!ipAttempt) return limited()
    const user = await Users.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).lean()
    const accountAttempt = await reserveLoginAttempt(
      'account',
      user ? String(user._id) : identifier,
    )
    if (!accountAttempt || (user?.lockedUntil && user.lockedUntil > new Date())) return limited()
    dummyHash ??= hash(randomBytes(32).toString('hex'), {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    })
    const matches = await verifyPassword(user?.passwordHash || (await dummyHash), body.password)
    if (!user || !matches || !user.isActive || !dbRoleSchema.safeParse(user.role).success) {
      if (user)
        await Users.updateOne({ _id: user._id }, [
          {
            $set: {
              failedAttempts: {
                $add: [
                  {
                    $cond: [
                      { $gt: ['$failureWindowStart', new Date(Date.now() - 900000)] },
                      { $ifNull: ['$failedAttempts', 0] },
                      0,
                    ],
                  },
                  1,
                ],
              },
              failureWindowStart: {
                $cond: [
                  { $gt: ['$failureWindowStart', new Date(Date.now() - 900000)] },
                  '$failureWindowStart',
                  new Date(),
                ],
              },
            },
          },
          {
            $set: {
              lockedUntil: {
                $cond: [{ $gte: ['$failedAttempts', 5] }, new Date(Date.now() + 900000), null],
              },
            },
          },
        ])
      await appendAuditBestEffort({
        actor: user ? String(user._id) : 'anonymous',
        action: 'LOGIN_FAILED',
        entity: 'users',
        ...context,
      })
      return invalid()
    }
    if (
      getEnv('AUTH_REQUIRE_TOTP') &&
      user.mfa?.enabledAt &&
      !(await verifyUserMfa(user, body.totp))
    ) {
      await appendAuditBestEffort({
        actor: String(user._id),
        action: 'LOGIN_FAILED',
        entity: 'users',
        ...context,
      })
      return NextResponse.json({ error: 'TOTP_REQUIRED' }, { status: 401 })
    }
    const role = toAppRole(dbRoleSchema.parse(user.role))
    const boundWalletAddress = role === 'OPERATOR_KELURAHAN' ? await expectedWallet() : undefined
    const oldHash = await currentTokenHash()
    const token = await createSession(String(user._id), { ...context, boundWalletAddress })
    try {
      const active = await Users.updateOne(
        { _id: user._id, isActive: true, passwordHash: user.passwordHash },
        {
          $set: { failedAttempts: 0, lastLoginAt: new Date() },
          $unset: { lockedUntil: 1, failureWindowStart: 1 },
        },
      )
      if (!active.matchedCount) throw new Error('Account changed')
      await appendAudit({
        actor: String(user._id),
        role: user.role,
        action: 'LOGIN_SUCCESS',
        entity: 'users',
        ...context,
      })
      await revokeSession(oldHash)
      await releaseLoginAttempt(ipAttempt)
      await releaseLoginAttempt(accountAttempt)
    } catch (error) {
      await revokeSession(tokenHash(token))
      throw error
    }
    const response = NextResponse.json(
      {
        authenticated: true,
        userId: String(user._id),
        role,
        walletVerificationRequired: role === 'OPERATOR_KELURAHAN',
        redirectTo: '/dashboard',
        ...(user.mustChangePassword ? { mustChangePassword: true } : {}),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
    return response
  } catch (error) {
    return backendError(error)
  }
}

export async function logout(request: Request) {
  try {
    await connectDatabase()
    if (!isSameOriginRequest(request))
      return NextResponse.json({ message: 'Origin ditolak.' }, { status: 403 })
    const hash = await currentTokenHash()
    await revokeSession(hash)
    try {
      const record = hash ? await Sessions.findOne({ tokenHash: hash }).lean() : null
      await appendAuditBestEffort({
        actor: record ? String(record.userId) : 'anonymous',
        action: 'LOGOUT',
        entity: 'sessions',
        ...requestContext(request),
      })
    } catch {
      /* Logout remains successful if audit metadata cannot be read. */
    }
    const response = NextResponse.json(
      { loggedOut: true, redirectTo: '/login' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...getSessionCookieOptions(0),
      expires: new Date(0),
    })
    response.cookies.set('bansos_wallet_challenge', '', {
      ...getSessionCookieOptions(0),
      expires: new Date(0),
    })
    return response
  } catch (error) {
    return backendError(error)
  }
}

export async function session() {
  try {
    await connectDatabase()
    const current = await getVerifiedServerSession()
    if (current?.mustChangePassword)
      return NextResponse.json(
        { error: 'PASSWORD_CHANGE_REQUIRED', message: 'Ganti kata sandi terlebih dahulu.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    return NextResponse.json(
      {
        role: current?.role ?? null,
        boundWalletAddress: current?.boundWalletAddress ?? null,
        walletVerified: current?.walletVerified ?? false,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return backendError(error)
  }
}

class WalletValidationError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'WalletValidationError'
    this.status = status
    this.code = code
  }
}

async function walletInput(request: Request) {
  const body = await request.json()
  if (
    !body ||
    typeof body.address !== 'string' ||
    typeof body.chainId !== 'string' ||
    !/^0x[0-9a-f]+$/i.test(body.chainId)
  )
    throw new Error('Wallet invalid')
  const chainId = getEnv('NEXT_PUBLIC_CHAIN_ID')
  if (!chainId) throw new ServiceUnavailableError()
  const address = getAddress(body.address)
  if (BigInt(body.chainId) !== BigInt(chainId)) {
    throw new WalletValidationError(
      400,
      'WALLET_CHAIN_MISMATCH',
      `Jaringan wallet tidak sesuai. Pindah ke jaringan Hyperledger Besu (Chain ID ${chainId}).`,
    )
  }
  if (address !== (await expectedWallet())) {
    throw new WalletValidationError(
      403,
      'WALLET_UNAUTHORIZED',
      'Wallet tidak valid. Alamat ini bukan wallet resmi Kelurahan yang terdaftar pada kontrak pintar.',
    )
  }
  return { address, chainId, signature: body.signature }
}

export async function nonce(request: Request) {
  const auth = await requirePermission('wallet:verify-session')
  if (auth.response) return auth.response
  try {
    if (auth.session.role !== 'OPERATOR_KELURAHAN' || !isSameOriginRequest(request))
      return NextResponse.json({ message: 'Origin atau role ditolak.' }, { status: 403 })
    const { address, chainId } = await walletInput(request)
    const base = new URL(getEnv('APP_BASE_URL'))
    const challengeNonce = randomBytes(32).toString('hex')
    const expiresAt = new Date(Math.min(Date.now() + 300000, auth.session.expiresAt))
    const message = `${base.host} wants you to sign in with your Ethereum account:\n${address}\n\nIkat wallet Kelurahan ke akun BansosLedger.\n\nURI: ${base.origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${challengeNonce}\nIssued At: ${new Date().toISOString()}\nExpiration Time: ${expiresAt.toISOString()}`
    const result = await Sessions.updateOne(
      { tokenHash: await currentTokenHash(), revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { challenge: { nonce: challengeNonce, message, address, chainId, expiresAt } } },
    )
    if (!result.matchedCount) throw new Error('Session expired')
    return NextResponse.json({ message }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof ServiceUnavailableError) return backendError(error)
    if (error instanceof WalletValidationError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status },
      )
    }
    return NextResponse.json({ message: 'Permintaan wallet tidak valid.' }, { status: 400 })
  }
}

export async function bind(request: Request) {
  const auth = await requirePermission('wallet:verify-session')
  if (auth.response) return auth.response
  try {
    if (auth.session.role !== 'OPERATOR_KELURAHAN' || !isSameOriginRequest(request))
      return NextResponse.json({ message: 'Origin atau role ditolak.' }, { status: 403 })
    const { address, chainId, signature } = await walletInput(request)
    const hash = await currentTokenHash()
    // Consume before verification, including failed signatures. Concurrent replays cannot reuse the nonce.
    const consumed = await Sessions.findOneAndUpdate(
      {
        tokenHash: hash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
        lastSeenAt: { $gt: new Date(Date.now() - IDLE_LIFETIME) },
        'challenge.expiresAt': { $gt: new Date() },
      },
      { $unset: { challenge: 1 } },
      { new: false },
    ).lean()
    const challenge = consumed?.challenge
    if (
      !challenge?.message ||
      !challenge.nonce ||
      challenge.address !== address ||
      challenge.chainId !== chainId ||
      typeof signature !== 'string' ||
      !/^0x[0-9a-f]{130}$/i.test(signature) ||
      getAddress(verifyMessage(challenge.message, signature)) !== address ||
      !hash
    )
      throw new Error('Invalid challenge')
    const context = requestContext(request)
    const rotated = await rotateSession(hash, address)
    try {
      const active = await Users.updateOne(
        { _id: auth.session.userId, isActive: true, mustChangePassword: false, role: 'OPERATOR' },
        {
          $set: {
            wallet: { address, boundAt: new Date(), lastSiweNonceUsed: challenge.nonce },
          },
        },
      )
      if (!active.matchedCount) throw new Error('Account changed')
      await appendAudit({
        actor: auth.session.userId,
        role: 'OPERATOR',
        action: 'WALLET_BOUND',
        entity: 'users',
        entityId: auth.session.userId,
        ...context,
      })
    } catch {
      await revokeSession(tokenHash(rotated.token))
      throw new ServiceUnavailableError()
    }
    const response = NextResponse.json(
      { verified: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    response.cookies.set(SESSION_COOKIE_NAME, rotated.token, {
      ...getSessionCookieOptions(
        Math.max(0, Math.floor((rotated.expiresAt.getTime() - Date.now()) / 1000)),
      ),
      expires: rotated.expiresAt,
    })
    return response
  } catch (error) {
    if (error instanceof ServiceUnavailableError) return backendError(error)
    if (error instanceof WalletValidationError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status },
      )
    }
    return NextResponse.json(
      { message: 'Tantangan kedaluwarsa atau tanda tangan tidak valid. Ulangi verifikasi.' },
      { status: 403 },
    )
  }
}

