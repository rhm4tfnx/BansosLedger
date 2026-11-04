import { randomBytes } from 'node:crypto'
import { hash } from '@node-rs/argon2'
import { NextResponse } from 'next/server'
import { connectDatabase } from '@/lib/db/connection'
import { Users } from '@/lib/db/models'
import { backendError } from '@/lib/service-error'
import { isSameOriginRequest, requestContext } from '@/lib/auth/request-origin'
import { SESSION_COOKIE_NAME, createSession, currentTokenHash, revokeSession, getSessionCookieOptions, tokenHash } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/password'
import { toAppRole, dbRoleSchema } from '@/lib/auth/role-map'
import { appendAudit, appendAuditBestEffort } from '@/modules/audit/service'
import { expectedWallet } from '@/lib/auth/expected-wallet'
import { reserveLoginAttempt, releaseLoginAttempt } from '@/lib/auth/login-limit'
import { getEnv } from '@/lib/env'
import { verifyUserMfa } from '@/lib/auth/mfa'
export const runtime = 'nodejs'
let dummyHash: Promise<string> | undefined
const invalid = () => NextResponse.json({ error: 'UNAUTHENTICATED', message: 'Email dinas atau kata sandi tidak valid.' }, { status: 401 })
const limited = () => NextResponse.json({ message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429, headers: { 'Retry-After': '900' } })
export async function POST(request: Request) {
  try {
    await connectDatabase()
    if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origin ditolak.' }, { status: 403 })
    let body
    try { body = await request.json() } catch { return NextResponse.json({ message: 'JSON tidak valid.' }, { status: 400 }) }
    if (!body || typeof body.email !== 'string' || !body.email.trim() || typeof body.password !== 'string' || body.email.length > 254 || body.password.length > 1024) return NextResponse.json({ message: 'Input tidak valid.' }, { status: 400 })
    const context = requestContext(request)
    const identifier = body.email.trim().toLowerCase()
    const ipAttempt = await reserveLoginAttempt('ip', context.ip)
    if (!ipAttempt) return limited()
    const user = await Users.findOne({ $or: [{ email: identifier }, { username: identifier }] }).lean()
    const accountAttempt = await reserveLoginAttempt('account', user ? String(user._id) : identifier)
    if (!accountAttempt || (user?.lockedUntil && user.lockedUntil > new Date())) return limited()
    dummyHash ??= hash(randomBytes(32).toString('hex'), { memoryCost: 19456, timeCost: 2, parallelism: 1 })
    const matches = await verifyPassword(user?.passwordHash || await dummyHash, body.password)
    if (!user || !matches || !user.isActive || !dbRoleSchema.safeParse(user.role).success) {
      if (user) await Users.updateOne({ _id: user._id }, [{ $set: { failedAttempts: { $add: [{ $cond: [{ $gt: ['$failureWindowStart', new Date(Date.now() - 900000)] }, { $ifNull: ['$failedAttempts', 0] }, 0] }, 1] }, failureWindowStart: { $cond: [{ $gt: ['$failureWindowStart', new Date(Date.now() - 900000)] }, '$failureWindowStart', new Date()] } } }, { $set: { lockedUntil: { $cond: [{ $gte: ['$failedAttempts', 5] }, new Date(Date.now() + 900000), null] } } }])
      await appendAuditBestEffort({ actor: user ? String(user._id) : 'anonymous', action: 'LOGIN_FAILED', entity: 'users', ...context })
      return invalid()
    }
    if (getEnv('AUTH_REQUIRE_TOTP') && user.mfa?.enabledAt && !await verifyUserMfa(user, body.totp)) {
      await appendAuditBestEffort({ actor: String(user._id), action: 'LOGIN_FAILED', entity: 'users', ...context })
      return NextResponse.json({ error: 'TOTP_REQUIRED' }, { status: 401 })
    }
    const role = toAppRole(dbRoleSchema.parse(user.role))
    const boundWalletAddress = role === 'OPERATOR_KELURAHAN' ? await expectedWallet() : undefined
    const oldHash = await currentTokenHash()
    const token = await createSession(String(user._id), { ...context, boundWalletAddress })
    try {
      const active = await Users.updateOne({ _id: user._id, isActive: true, passwordHash: user.passwordHash }, { $set: { failedAttempts: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: 1, failureWindowStart: 1 } })
      if (!active.matchedCount) throw new Error('Account changed')
      await appendAudit({ actor: String(user._id), role: user.role, action: 'LOGIN_SUCCESS', entity: 'users', ...context })
      await revokeSession(oldHash)
      await releaseLoginAttempt(ipAttempt); await releaseLoginAttempt(accountAttempt)
    } catch (error) {
      await revokeSession(tokenHash(token))
      throw error
    }
    const response = NextResponse.json({ authenticated: true, userId: String(user._id), role, walletVerificationRequired: role === 'OPERATOR_KELURAHAN', redirectTo: '/dashboard', ...(user.mustChangePassword ? { mustChangePassword: true } : {}) }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
    return response
  } catch (error) { return backendError(error) }
}
