import 'server-only'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac'
import { connectDatabase } from '@/lib/db/connection'
import { backendError } from '@/lib/service-error'
import { getErrorInfo } from '@/lib/api-contract/errors'
import { getVerifiedServerSession } from './session'
import type { Permission } from '@/types/rbac'

const REQUEST_ID_REGEX = /^[A-Za-z0-9-]{8,64}$/

export function sanitizeRequestId(candidate?: string | null): string {
  return candidate && REQUEST_ID_REGEX.test(candidate) ? candidate : randomUUID()
}

const fallbackCodes: Record<number, string> = {
  400: 'INVALID_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN_PERMISSION',
  404: 'NOT_FOUND',
  409: 'IMMUTABLE_RECORD',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_ATTEMPTS',
  503: 'SERVICE_UNAVAILABLE',
}

export function problem(status: number, code: string, message?: string, requestId?: string) {
  const reqId = sanitizeRequestId(requestId)
  const resolvedMessage = message || getErrorInfo(code).message
  return NextResponse.json(
    { type: `urn:bansos:error:${code}`, title: resolvedMessage, status, code, message: resolvedMessage, requestId: reqId },
    { status, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store', 'X-Request-Id': reqId } }
  )
}

export async function asV1(handler: (request: Request) => Promise<Response>, request: Request) {
  const reqId = sanitizeRequestId(request.headers.get('x-request-id'))
  let response: Response
  try { response = await handler(request) } catch (error) { response = backendError(error) }
  if (response.ok) return response
  const data = await response.json().catch(() => ({}))
  const code = (typeof data.code === 'string' && data.code) || fallbackCodes[response.status] || 'UNKNOWN'
  const message = (typeof data.message === 'string' && data.message) || (typeof data.title === 'string' && data.title) || getErrorInfo(code).message
  const result = problem(response.status, code, message, reqId)
  const retry = response.headers.get('retry-after'); if (retry) result.headers.set('Retry-After', retry)
  return result
}

export async function requireV1(permission?: Permission, options: { allowPasswordChange?: boolean } = {}) {
  try {
    await connectDatabase()
    const session = await getVerifiedServerSession()
    if (!session) return { session: null, response: problem(401, 'UNAUTHENTICATED', 'Sesi autentikasi tidak ditemukan atau tidak valid.') }
    if (session.mustChangePassword && !options.allowPasswordChange) return { session: null, response: problem(403, 'PASSWORD_CHANGE_REQUIRED', 'Ganti kata sandi terlebih dahulu.') }
    if (permission && !hasPermission(session.role, permission)) return { session: null, response: problem(403, 'FORBIDDEN_PERMISSION', 'Akses ditolak.') }
    return { session, response: null }
  } catch { return { session: null, response: problem(503, 'SERVICE_UNAVAILABLE', 'Layanan belum dikonfigurasi.') } }
}
