import { NextResponse } from 'next/server'
import { connectDatabase } from '@/lib/db/connection'
import { backendError } from '@/lib/service-error'
import { Sessions } from '@/lib/db/models'
import { appendAuditBestEffort } from '@/modules/audit/service'
import { isSameOriginRequest, requestContext } from '@/lib/auth/request-origin'
import { SESSION_COOKIE_NAME, revokeSession, currentTokenHash, getSessionCookieOptions } from '@/lib/auth/session'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  try {
    await connectDatabase()
    if (!isSameOriginRequest(request)) return NextResponse.json({ message: 'Origin ditolak.' }, { status: 403 })
    const hash = await currentTokenHash()
    await revokeSession(hash)
    try {
      const record = hash ? await Sessions.findOne({ tokenHash: hash }).lean() : null
      await appendAuditBestEffort({ actor: record ? String(record.userId) : 'anonymous', action: 'LOGOUT', entity: 'sessions', ...requestContext(request) })
    } catch { /* Logout remains successful if audit metadata cannot be read. */ }
    const response = NextResponse.json({ loggedOut: true, redirectTo: '/login' }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(SESSION_COOKIE_NAME, '', { ...getSessionCookieOptions(0), expires: new Date(0) })
    response.cookies.set('bansos_wallet_challenge', '', { ...getSessionCookieOptions(0), expires: new Date(0) })
    return response
  } catch (error) { return backendError(error) }
}
