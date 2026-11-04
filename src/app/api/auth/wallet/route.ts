import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAddress, verifyMessage } from 'ethers'
import { Sessions, Users } from '@/lib/db/models'
import { getEnv } from '@/lib/env'
import { backendError, ServiceUnavailableError } from '@/lib/service-error'
import { requirePermission } from '@/lib/auth/authorization'
import { expectedWallet } from '@/lib/auth/expected-wallet'
import { isSameOriginRequest, requestContext } from '@/lib/auth/request-origin'
import { currentTokenHash, SESSION_COOKIE_NAME, rotateSession, revokeSession, tokenHash, getSessionCookieOptions, IDLE_LIFETIME } from '@/lib/auth/session'
import { appendAudit } from '@/modules/audit/service'
export const runtime = 'nodejs'
async function walletInput(request: Request) {
  const body = await request.json()
  if (!body || typeof body.address !== 'string' || typeof body.chainId !== 'string' || !/^0x[0-9a-f]+$/i.test(body.chainId)) throw new Error('Wallet invalid')
  const chainId = getEnv('NEXT_PUBLIC_CHAIN_ID')
  if (!chainId) throw new ServiceUnavailableError()
  const address = getAddress(body.address)
  if (BigInt(body.chainId) !== BigInt(chainId) || address !== await expectedWallet()) throw new Error('Wallet mismatch')
  return { address, chainId, signature: body.signature }
}
export async function POST(request: Request) {
  const auth = await requirePermission('wallet:verify-session')
  if (auth.response) return auth.response
  try {
    if (auth.session.role !== 'OPERATOR_KELURAHAN' || !isSameOriginRequest(request)) return NextResponse.json({ message: 'Origin atau role ditolak.' }, { status: 403 })
    const { address, chainId } = await walletInput(request)
    const base = new URL(getEnv('APP_BASE_URL'))
    const nonce = randomBytes(32).toString('hex')
    const expiresAt = new Date(Math.min(Date.now() + 300000, auth.session.expiresAt))
    const message = `${base.host} wants you to sign in with your Ethereum account:\n${address}\n\nIkat wallet Kelurahan ke akun BansosLedger.\n\nURI: ${base.origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}\nExpiration Time: ${expiresAt.toISOString()}`
    const result = await Sessions.updateOne({ tokenHash: await currentTokenHash(), revokedAt: null, expiresAt: { $gt: new Date() } }, { $set: { challenge: { nonce, message, address, chainId, expiresAt } } })
    if (!result.matchedCount) throw new Error('Session expired')
    return NextResponse.json({ message }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof ServiceUnavailableError) return backendError(error)
    return NextResponse.json({ message: 'Permintaan wallet tidak valid.' }, { status: 400 })
  }
}
export async function PATCH(request: Request) {
  const auth = await requirePermission('wallet:verify-session')
  if (auth.response) return auth.response
  try {
    if (auth.session.role !== 'OPERATOR_KELURAHAN' || !isSameOriginRequest(request)) return NextResponse.json({ message: 'Origin atau role ditolak.' }, { status: 403 })
    const { address, chainId, signature } = await walletInput(request)
    const hash = await currentTokenHash()
    // Consume before verification, including failed signatures. Concurrent replays cannot reuse the nonce.
    const consumed = await Sessions.findOneAndUpdate({ tokenHash: hash, revokedAt: null, expiresAt: { $gt: new Date() }, lastSeenAt: { $gt: new Date(Date.now() - IDLE_LIFETIME) }, 'challenge.expiresAt': { $gt: new Date() } }, { $unset: { challenge: 1 } }, { new: false }).lean()
    const challenge = consumed?.challenge
    if (!challenge?.message || !challenge.nonce || challenge.address !== address || challenge.chainId !== chainId || typeof signature !== 'string' || !/^0x[0-9a-f]{130}$/i.test(signature) || getAddress(verifyMessage(challenge.message, signature)) !== address || !hash) throw new Error('Invalid challenge')
    const context = requestContext(request)
    const rotated = await rotateSession(hash, address)
    try {
      const active = await Users.updateOne({ _id: auth.session.userId, isActive: true, mustChangePassword: false, role: 'OPERATOR' }, { $set: { wallet: { address, boundAt: new Date(), lastSiweNonceUsed: challenge.nonce } } })
      if (!active.matchedCount) throw new Error('Account changed')
      await appendAudit({ actor: auth.session.userId, role: 'OPERATOR', action: 'WALLET_BOUND', entity: 'users', entityId: auth.session.userId, ...context })
    } catch {
      await revokeSession(tokenHash(rotated.token))
      throw new ServiceUnavailableError()
    }
    const response = NextResponse.json({ verified: true }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(SESSION_COOKIE_NAME, rotated.token, { ...getSessionCookieOptions(Math.max(0, Math.floor((rotated.expiresAt.getTime() - Date.now()) / 1000))), expires: rotated.expiresAt })
    return response
  } catch (error) {
    if (error instanceof ServiceUnavailableError) return backendError(error)
    return NextResponse.json({ message: 'Tantangan kedaluwarsa atau tanda tangan tidak valid. Ulangi verifikasi.' }, { status: 403 })
  }
}
