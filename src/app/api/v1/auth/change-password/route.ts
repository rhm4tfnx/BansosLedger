import { NextResponse } from 'next/server'
import { Users } from '@/lib/db/models'
import { asV1, problem, requireV1 } from '@/lib/auth/v1'
import { isSameOriginRequest, requestContext } from '@/lib/auth/request-origin'
import { verifyPassword, hashPassword, validatePassword } from '@/lib/auth/password'
import { currentTokenHash, revokeAllUserSessions } from '@/lib/auth/session'
import { reserveLoginAttempt, releaseLoginAttempt } from '@/lib/auth/login-limit'
import { appendAudit } from '@/modules/audit/service'
export const runtime = 'nodejs'
export const POST = (request: Request) => asV1(changePassword, request)
async function changePassword(request: Request) {
  const auth = await requireV1(undefined, { allowPasswordChange: true })
  if (auth.response) return auth.response
  if (!isSameOriginRequest(request)) return problem(403, 'ORIGIN_REJECTED', 'Origin ditolak.')
  const body = await request.json().catch(() => null)
  if (!body || typeof body.currentPassword !== 'string' || body.currentPassword.length > 1024 || typeof body.newPassword !== 'string' || body.newPassword.length > 1024) return problem(400, 'INVALID_INPUT', 'Input tidak valid.')
  const user = await Users.findById(auth.session.userId).lean()
  if (!user?.isActive) return problem(401, 'UNAUTHENTICATED', 'Akun tidak aktif.')
  const attempt = await reserveLoginAttempt('account', `password:${user._id}`)
  if (!attempt) return problem(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.')
  if (!await verifyPassword(user.passwordHash, body.currentPassword)) return problem(401, 'INVALID_PASSWORD', 'Kata sandi saat ini tidak valid.')
  try { validatePassword(body.newPassword, user.username, user.email) } catch { return problem(400, 'INVALID_PASSWORD', 'Kata sandi baru tidak memenuhi kebijakan keamanan.') }
  if (body.newPassword === body.currentPassword) return problem(400, 'INVALID_PASSWORD', 'Gunakan kata sandi baru yang berbeda.')
  const passwordHash = await hashPassword(body.newPassword, user.username, user.email)
  const hash = await currentTokenHash()
  const context = requestContext(request)
  const changed = await Users.updateOne({ _id: user._id, isActive: true, passwordHash: user.passwordHash }, { $set: { passwordHash, mustChangePassword: false } })
  if (!changed.matchedCount) return problem(409, 'ACCOUNT_CHANGED', 'Akun berubah. Silakan ulangi autentikasi.')
  await revokeAllUserSessions(String(user._id), hash)
  await appendAudit({ actor: String(user._id), role: user.role, action: 'PASSWORD_CHANGED', entity: 'users', entityId: String(user._id), ...context })
  await releaseLoginAttempt(attempt)
  return NextResponse.json({ changed: true, mustChangePassword: false }, { headers: { 'Cache-Control': 'no-store' } })
}
