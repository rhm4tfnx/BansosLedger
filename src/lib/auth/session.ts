import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { connectDatabase } from '@/lib/db/connection'
import { Sessions, Users } from '@/lib/db/models'
import { toAppRole, dbRoleSchema } from './role-map'
import type { Role } from '@/types/rbac'

export const SESSION_COOKIE_NAME = 'bansos_session_token'
export const SESSION_LIFETIME = 8 * 60 * 60 * 1000
export const IDLE_LIFETIME = 30 * 60 * 1000
export interface VerifiedSession { userId: string; role: Role; expiresAt: number; walletVerified: boolean; boundWalletAddress?: string; mustChangePassword?: boolean }
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export function getSessionCookieOptions(maxAgeSeconds = SESSION_LIFETIME / 1000) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: maxAgeSeconds }
}
export async function currentTokenHash() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? tokenHash(token) : null
}
export async function loadSession() {
  const hash = await currentTokenHash()
  if (!hash) return null
  await connectDatabase()
  const now = new Date()
  const record = await Sessions.findOne({ tokenHash: hash, revokedAt: null, expiresAt: { $gt: now }, lastSeenAt: { $gt: new Date(Date.now() - IDLE_LIFETIME) } }).lean()
  if (!record) return null
  const user = await Users.findOne({ _id: record.userId, isActive: true }).lean()
  if (!user || !dbRoleSchema.safeParse(user.role).success) return null
  if (record.lastSeenAt.getTime() < Date.now() - 60000) await Sessions.updateOne({ _id: record._id, revokedAt: null, lastSeenAt: record.lastSeenAt }, { $set: { lastSeenAt: now } })
  return { record, user }
}
export async function getVerifiedServerSession(): Promise<VerifiedSession | null> {
  const loaded = await loadSession()
  if (!loaded) return null
  const { user, record } = loaded
  return { userId: String(user._id), role: toAppRole(dbRoleSchema.parse(user.role)), expiresAt: record.expiresAt.getTime(), walletVerified: record.walletVerified === true, boundWalletAddress: record.boundWalletAddress ?? undefined, mustChangePassword: user.mustChangePassword }
}
export async function createSession(userId: string, fields: { ip?: string; userAgent?: string; boundWalletAddress?: string } = {}) {
  await connectDatabase()
  const token = randomBytes(32).toString('base64url')
  await Sessions.create({ userId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + SESSION_LIFETIME), lastSeenAt: new Date(), walletVerified: false, ...fields })
  return token
}
export async function revokeSession(hash?: string | null) {
  const value = hash === undefined ? await currentTokenHash() : hash
  if (!value) return
  await connectDatabase()
  await Sessions.updateOne({ tokenHash: value, revokedAt: null }, { $set: { revokedAt: new Date() }, $unset: { challenge: 1 } })
}
export async function revokeAllUserSessions(userId: string, exceptHash?: string | null) {
  await connectDatabase()
  await Sessions.updateMany({ userId, revokedAt: null, ...(exceptHash ? { tokenHash: { $ne: exceptHash } } : {}) }, { $set: { revokedAt: new Date() }, $unset: { challenge: 1 } })
}
export async function rotateSession(hash: string, address: string) {
  await connectDatabase()
  const original = await Sessions.findOne({ tokenHash: hash, revokedAt: null, expiresAt: { $gt: new Date() }, lastSeenAt: { $gt: new Date(Date.now() - IDLE_LIFETIME) } }).lean()
  if (!original) throw new Error('Sesi tidak valid.')
  const token = randomBytes(32).toString('base64url')
  await Sessions.create({ userId: original.userId, tokenHash: tokenHash(token), expiresAt: original.expiresAt, lastSeenAt: new Date(), ip: original.ip, userAgent: original.userAgent, walletVerified: true, boundWalletAddress: address })
  try {
    const revoked = await Sessions.updateOne({ _id: original._id, revokedAt: null, expiresAt: { $gt: new Date() } }, { $set: { revokedAt: new Date() }, $unset: { challenge: 1 } })
    if (!revoked.modifiedCount) throw new Error('Sesi tidak valid.')
  } catch (error) {
    await revokeSession(tokenHash(token))
    throw error
  }
  return { token, expiresAt: original.expiresAt }
}
