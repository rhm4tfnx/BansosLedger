import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { ledgerInterface } from '@/lib/blockchain/abi'
import * as config from '@/modules/chain/config'
import { GET as ready } from '@/app/api/v1/health/ready/route'
import { GET as alias } from '@/app/api/health/ready/route'
import * as cron from '@/app/api/v1/cron/reconcile/route'
const mocks = vi.hoisted(() => ({ rateLimit: vi.fn(), ping: vi.fn(), connect: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({ rateLimit: mocks.rateLimit }))
vi.mock('@/lib/db/connection', () => ({ connectDatabase: mocks.connect }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('APP_TRUST_PROXY', 'true'); vi.stubEnv('PINATA_JWT', 'synthetic-test-jwt')
  mocks.rateLimit.mockResolvedValue({ ok: true, retryAfter: 10 })
  mocks.connect.mockResolvedValue({ connection: { db: { command: mocks.ping } } })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })
function request(ip = '192.0.2.10') { return new Request('https://example.test/api/v1/health/ready', { headers: { 'x-forwarded-for': ip } }) }
test('readiness and alias share the 30/minute per-IP bucket and retain success response', async () => {
  const getBlockNumber = vi.fn().mockResolvedValue(100)
  vi.spyOn(config, 'provider').mockReturnValue({ getBlockNumber } as unknown as ReturnType<typeof config.provider>)
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
  expect(alias).toBe(ready)
  expect(await (await ready(request())).json()).toEqual({ status: 'ready', services: { mongo: 'ok', rpc: 'ok', pinata: 'ok' } })
  expect(await (await alias(request('192.0.2.11'))).json()).toEqual({ status: 'ready', services: { mongo: 'ok', rpc: 'ok', pinata: 'ok' } })
  expect(mocks.rateLimit).toHaveBeenNthCalledWith(1, 'health:ready:192.0.2.10', 30, 60)
  expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, 'health:ready:192.0.2.11', 30, 60)
})
test('exhausted readiness budget returns 429 and Retry-After before health probes', async () => {
  mocks.rateLimit.mockResolvedValue({ ok: false, retryAfter: 42 })
  const rpc = vi.spyOn(config, 'provider'), fetch = vi.spyOn(globalThis, 'fetch')
  const response = await alias(request())
  expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('42'); expect(response.headers.get('cache-control')).toBe('no-store')
  expect(await response.json()).toEqual({ status: 'unavailable', services: { mongo: 'unavailable', rpc: 'unavailable', pinata: 'unavailable' } })
  expect(mocks.connect).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled()
})
test('readiness limiter failure fails closed with unchanged response shape', async () => {
  mocks.rateLimit.mockRejectedValue(new Error('private infrastructure detail'))
  const response = await ready(request())
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ status: 'unavailable', services: { mongo: 'unavailable', rpc: 'unavailable', pinata: 'unavailable' } })
  expect(mocks.connect).not.toHaveBeenCalled()
})
test('RPC key uses only X-API-Key', () => {
  vi.stubEnv('RPC_URL_SERVER', 'https://rpc.example.test'); vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', '0x' + '1'.repeat(40)); vi.stubEnv('NEXT_PUBLIC_CHAIN_ID', '1337'); vi.stubEnv('RPC_API_KEY', 'synthetic-key')
  const rpc = config.provider()
  try { const request = rpc._getConnection(); expect(request.getHeader('X-API-Key')).toBe('synthetic-key'); expect(request.getHeader('Authorization')).toBeUndefined() } finally { rpc.destroy() }
})
test('host cron replaces Vercel configuration and exposes POST only', () => {
  expect('GET' in cron).toBe(false); expect(typeof cron.POST).toBe('function')
  expect(existsSync('vercel.json')).toBe(false)
  expect(readFileSync('scripts/cron/reconcile.sh', 'utf8')).toContain('curl -fsS --max-time 70 -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_BASE_URL/api/v1/cron/reconcile"')
})
test('ownership functions, events and explicit custom errors are usable', () => {
  for (const name of ['ExpectedPause', 'OwnableUnauthorizedAccount', 'OwnableInvalidOwner']) expect(ledgerInterface.getError(name)).not.toBeNull()
  for (const name of ['pendingOwner', 'transferOwnership', 'acceptOwnership']) expect(ledgerInterface.getFunction(name)).not.toBeNull()
  for (const name of ['OwnershipTransferStarted', 'OwnershipTransferred']) expect(ledgerInterface.getEvent(name)?.inputs.every(input => input.indexed)).toBe(true)
  const account = '0x' + '2'.repeat(40)
  expect(ledgerInterface.parseError(ledgerInterface.encodeErrorResult('OwnableUnauthorizedAccount', [account]))?.args[0]).toBe(account)
})
