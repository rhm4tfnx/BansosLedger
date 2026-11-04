import 'server-only'
import { connectDatabase } from '@/lib/db/connection'
import { getEnv } from '@/lib/env'
import { requestContext } from '@/lib/auth/request-origin'
import { rateLimit } from '@/lib/ratelimit'
import { provider, readChain } from '@/modules/chain/config'
import { json } from '@/modules/domain/http'
export async function live() { return json({ status: 'ok' }) }
export async function ready(request: Request) {
  const unavailable = { status: 'unavailable', services: { mongo: 'unavailable', rpc: 'unavailable', pinata: 'unavailable' } }
  try {
    const limit = await rateLimit(`health:ready:${requestContext(request).ip}`, 30, 60)
    if (!limit.ok) {
      const response = json(unavailable, 429)
      response.headers.set('Retry-After', String(limit.retryAfter))
      return response
    }
  } catch { return json(unavailable, 503) }
  const checks = await Promise.allSettled([
    (async () => { const db = await connectDatabase(); if (!db.connection.db) throw new Error(); await db.connection.db.command({ ping: 1 }, { timeoutMS: 5000 }) })(),
    readChain(() => provider().getBlockNumber(), 0),
    (async () => { const jwt = getEnv('PINATA_JWT'); if (!jwt) throw new Error(); const response = await fetch('https://api.pinata.cloud/data/testAuthentication', { headers: { Authorization: `Bearer ${jwt}` }, signal: AbortSignal.timeout(5000), cache: 'no-store' }); if (!response.ok) throw new Error() })(),
  ])
  const names = ['mongo', 'rpc', 'pinata'], services = Object.fromEntries(checks.map((check, index) => [names[index], check.status === 'fulfilled' ? 'ok' : 'unavailable']))
  const ok = checks.every(check => check.status === 'fulfilled')
  return json({ status: ok ? 'ready' : 'unavailable', services }, ok ? 200 : 503)
}
