import 'server-only'
import { isIP } from 'node:net'
import { getEnv } from '@/lib/env'
export function isSameOriginRequest(request: Request): boolean {
  const base = new URL(getEnv('APP_BASE_URL'))
  const proxy = getEnv('APP_TRUST_PROXY')
  try {
    const origin = new URL(request.headers.get('origin') || '')
    if (!['http:', 'https:'].includes(origin.protocol) || request.headers.get('sec-fetch-site') === 'cross-site') return false
    if (origin.origin === base.origin) return true
    const host = proxy ? request.headers.get('x-forwarded-host')?.split(',')[0].trim() || new URL(request.url).host : new URL(request.url).host
    return process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) && origin.host === host
  } catch { return false }
}
export function requestContext(request: Request) {
  // Without a trusted reverse proxy, share a conservative unknown-IP bucket; never trust arbitrary client headers.
  const forwarded = getEnv('APP_TRUST_PROXY') ? request.headers.get('x-forwarded-for')?.split(',')[0].trim() : undefined
  return { ip: forwarded && isIP(forwarded) ? forwarded : 'unknown', userAgent: (request.headers.get('user-agent') || '').slice(0, 512) }
}
