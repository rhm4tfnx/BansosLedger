import { NextResponse } from 'next/server'
import { asV1, problem, requireV1 } from '@/lib/auth/v1'
import { isSameOriginRequest } from '@/lib/auth/request-origin'
import { verifyUserMfa } from '@/lib/auth/mfa'
import { Users } from '@/lib/db/models'
import { reserveLoginAttempt, releaseLoginAttempt } from '@/lib/auth/login-limit'
export const runtime = 'nodejs'
export const POST = (request: Request) => asV1(verifyMfa, request)
async function verifyMfa(request: Request) {
  const auth = await requireV1()
  if (auth.response) return auth.response
  if (!isSameOriginRequest(request)) return problem(403, 'ORIGIN_REJECTED', 'Origin ditolak.')
  const body = await request.json().catch(() => null)
  const attempt = await reserveLoginAttempt('account', `mfa:${auth.session.userId}`)
  if (!attempt) return problem(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.')
  const user = await Users.findById(auth.session.userId).lean()
  if (!user || !await verifyUserMfa(user, body?.totp)) return problem(401, 'TOTP_INVALID', 'Kode verifikasi tidak valid.')
  await releaseLoginAttempt(attempt)
  return NextResponse.json({ verified: true }, { headers: { 'Cache-Control': 'no-store' } })
}
