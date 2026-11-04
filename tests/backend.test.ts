import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose, { Types } from 'mongoose'
import { Wallet } from 'ethers'
import { readdirSync, readFileSync } from 'node:fs'
import { models, Users, Sessions, Recipients, Programs, Enrollments, Disbursements, RateLimits, AuditLogs, ChainEvents, Settings } from '@/lib/db/models'
import { connectDatabase } from '@/lib/db/connection'
import { encryptNik, decryptNik, nikBlindIndex } from '@/lib/crypto/nik'
import { recipientCommitment } from '@/lib/blockchain/identity-hash'
import { createSession, loadSession, revokeSession, rotateSession, tokenHash, SESSION_COOKIE_NAME, IDLE_LIFETIME } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { requireV1 } from '@/lib/auth/v1'
import { rateLimit } from '@/lib/ratelimit'
import { appendAudit, verifyAuditChain } from '@/modules/audit/service'
import * as recipients from '@/modules/recipients/service'
import * as disbursements from '@/modules/disbursements/service'
import { chainVerifier } from '@/modules/chain/verifier'
import { requireCron, report } from '@/modules/chain/reconcile'
import { DomainError, type DomainContext } from '@/modules/domain/http'
import type { Permission } from '@/types/rbac'
import { POST as statusCheck } from '@/app/api/v1/public/status-check/route'
import { POST as login } from '@/app/api/v1/auth/login/route'
import { POST as nonce } from '@/app/api/v1/auth/wallet/nonce/route'
import { POST as bind } from '@/app/api/v1/auth/wallet/bind/route'
import { GET as health } from '@/app/api/v1/health/route'
import { GET as readiness } from '@/app/api/v1/health/ready/route'
import { POST as cron } from '@/app/api/v1/cron/reconcile/route'
const jar = vi.hoisted(() => new Map<string, string>())
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (key: string) => jar.has(key) ? { value: jar.get(key) } : undefined }) }))
const nik = '1101010101900001', txHash = '0x' + 'a'.repeat(64), programHash = '0x' + 'b'.repeat(64), refId = '0x' + 'c'.repeat(64)
const contract = '0x' + '1'.repeat(40), origin = 'https://example.test'
let mongo: MongoMemoryServer, passwordHash: string, userId: string
const originalEnv = { ...process.env }
function request(body: unknown = {}, method = 'POST', path = '/api/v1/test') { return new Request(origin + path, { method, headers: { origin, 'content-type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) }) }
function ctx(id: string, value: unknown = {}, method = 'POST'): DomainContext { return { request: request(value, method), params: { id }, actor: { userId, role: 'OPERATOR_KELURAHAN', walletVerified: true, expiresAt: Date.now() + 60000 } } }
async function user(role: 'OPERATOR' | 'KECAMATAN' | 'DINAS_SOSIAL' = 'OPERATOR') {
  const record = await Users.create({ username: role.toLowerCase(), email: `${role.toLowerCase()}@example.test`, passwordHash, role, name: 'Synthetic Account', institution: 'Test', isActive: true, mustChangePassword: false })
  userId = String(record._id); return record
}
async function signedIn(role: 'OPERATOR' | 'KECAMATAN' | 'DINAS_SOSIAL' = 'OPERATOR') { const record = await user(role); const token = await createSession(String(record._id)); jar.set(SESSION_COOKIE_NAME, token); return { record, token } }
async function fixture(status: 'DRAFT' | 'FINAL' = 'FINAL') {
  const recipient = await Recipients.create({ nikEnc: encryptNik(nik), nikBlindIndex: nikBlindIndex(nik), status, commitment: recipientCommitment(nik), name: 'Synthetic Recipient', address: { dusun: 'Private location' }, phone: '0800000000' })
  const program = await Programs.create({ code: 'TEST-BLT', programId: programHash, name: 'Test Program', status: 'ACTIVE', amountPerRecipient: 300000, totalBudget: 3000000, startPeriod: 202601, endPeriod: 202602, isPublic: true })
  await Enrollments.create({ programId: program._id, recipientId: recipient._id, status: 'REGISTERED_ONCHAIN' })
  return { recipient, program }
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.24' }, instance: { dbName: 'bansos_test' } })
  Object.assign(process.env, { MONGODB_URI: mongo.getUri(), APP_BASE_URL: origin, APP_TRUST_PROXY: 'false', AUTH_REQUIRE_TOTP: 'false', NIK_ENC_KEY: '11'.repeat(32), NIK_INDEX_KEY: 'test-index-key'.repeat(4), COMMITMENT_PEPPER: '22'.repeat(32), TURNSTILE_SECRET: 'synthetic-test-secret', CRON_SECRET: 'synthetic-cron-secret'.repeat(3) })
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN
  await connectDatabase()
  for (const model of models) { await model.createCollection(); await model.createIndexes() }
  passwordHash = await hashPassword('Synthetic-password-927!', 'operator', 'user@example.test')
})
beforeEach(async () => { jar.clear(); vi.restoreAllMocks(); await Promise.all(models.map(model => model.collection.deleteMany({}))); userId = String(new Types.ObjectId()) })
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]; Object.assign(process.env, originalEnv); delete (globalThis as { bansosMongo?: unknown }).bansosMongo })

test('crypto round trip, deterministic blind index and fixed commitment vector', () => {
  const encrypted = encryptNik(nik)
  expect(decryptNik(encrypted)).toBe(nik)
  expect(encryptNik(nik).iv).not.toBe(encrypted.iv)
  expect(() => decryptNik({ ...encrypted, tag: '00'.repeat(16) })).toThrow()
  expect(nikBlindIndex(nik)).toBe(nikBlindIndex(nik)); expect(nikBlindIndex(nik)).not.toContain(nik)
  expect(recipientCommitment(nik)).toBe('0x31d6e8278a593ef7e20dc409eca36f214009db4f58ca2bbe08a977ed79594f84')
})

test.each(['idle', 'absolute', 'revoked'] as const)('sessions reject %s expiry', async mode => {
  const { token } = await signedIn()
  expect(await loadSession()).not.toBeNull()
  if (mode === 'revoked') await revokeSession(tokenHash(token))
  else await Sessions.updateOne({ tokenHash: tokenHash(token) }, { $set: mode === 'idle' ? { lastSeenAt: new Date(Date.now() - IDLE_LIFETIME - 1000) } : { expiresAt: new Date(Date.now() - 1000) } })
  expect(await loadSession()).toBeNull()
})
test('wallet rotation revokes old token without extending absolute expiry', async () => {
  const { token } = await signedIn(), original = await loadSession()
  const rotated = await rotateSession(tokenHash(token), contract)
  expect(await loadSession()).toBeNull(); jar.set(SESSION_COOKIE_NAME, rotated.token)
  const current = await loadSession(); expect(current?.record.walletVerified).toBe(true)
  expect(current?.record.expiresAt).toEqual(original?.record.expiresAt)
  await expect(rotateSession(tokenHash(token), contract)).rejects.toThrow()
})
test('five failed logins lock the account and sixth request is rate limited', async () => {
  const account = await user('KECAMATAN')
  for (let i = 0; i < 5; i++) expect((await login(request({ email: account.email, password: 'wrong' }))).status).toBe(401)
  expect((await Users.findById(account._id).lean())?.lockedUntil?.getTime()).toBeGreaterThan(Date.now())
  const response = await login(request({ email: account.email, password: 'Synthetic-password-927!' }))
  expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('900')
})
test('SIWE challenge is single-use, binding rotates session and rejects replay', async () => {
  const wallet = Wallet.createRandom(); const { token } = await signedIn()
  vi.stubEnv('NEXT_PUBLIC_CHAIN_ID', '1337'); vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', ''); vi.stubEnv('NEXT_PUBLIC_AUTHORIZED_KELURAHAN_WALLET', wallet.address)
  try {
    const input = { address: wallet.address, chainId: '0x539' }
    const response = await nonce(request(input)); expect(response.status).toBe(200)
    const { message } = await response.json(), signature = await wallet.signMessage(message)
    const bound = await bind(request({ ...input, signature })); expect(bound.status).toBe(200)
    expect((await Sessions.findOne({ tokenHash: tokenHash(token) }).lean())?.revokedAt).toBeTruthy()
    const cookie = bound.headers.get('set-cookie')!.match(/bansos_session_token=([^;]+)/)![1]
    jar.set(SESSION_COOKIE_NAME, cookie)
    expect((await bind(request({ ...input, signature }))).status).toBe(403)
    expect(await Sessions.countDocuments({ walletVerified: true, revokedAt: null })).toBe(1)
  } finally { vi.unstubAllEnvs() }
})

test('FINAL recipient updates and DELETE are 409 and cannot change identity', async () => {
  const { recipient } = await fixture()
  await expect(recipients.update(ctx(String(recipient._id), { name: 'Changed' }))).rejects.toMatchObject({ status: 409 })
  await expect(recipients.softDelete(ctx(String(recipient._id), { reason: 'Test removal' }))).rejects.toMatchObject({ status: 409 })
  const stored = await Recipients.findById(recipient._id).lean(); expect(stored?.name).toBe('Synthetic Recipient'); expect(stored?.deletedAt).toBeFalsy()
})
test('reveal NIK enforces 30/hour and writes an audit entry without plaintext', async () => {
  const { recipient } = await fixture()
  for (let i = 0; i < 30; i++) expect((await recipients.reveal(ctx(String(recipient._id)))).status).toBe(200)
  await expect(recipients.reveal(ctx(String(recipient._id)))).rejects.toMatchObject({ status: 429 })
  const entries = await AuditLogs.find({ action: 'REVEAL_NIK' }).lean()
  expect(entries).toHaveLength(30); expect(JSON.stringify(entries)).not.toContain(nik)
})
test('atomic Mongo fallback enforces concurrent requests without lost increments', async () => {
  const results = await Promise.all(Array.from({ length: 15 }, () => rateLimit('parallel-test', 5, 3600)))
  expect(results.filter(r => r.ok)).toHaveLength(5)
  expect(results.every(r => r.retryAfter > 0)).toBe(true)
  expect((await RateLimits.findOne().lean())?.count).toBe(15)
})
test('client amount and status cannot create SUCCESS; partial unique index blocks duplicates', async () => {
  const { recipient, program } = await fixture()
  const input = { programId: String(program._id), recipientId: String(recipient._id), period: 202601, disbursedDate: '2026-01-15' }
  await expect(disbursements.create(ctx('', { ...input, amount: 300000 }))).rejects.toMatchObject({ code: 'AMOUNT_NOT_ALLOWED' })
  expect(disbursements.disbursementInput.safeParse({ ...input, status: 'SUCCESS' }).success).toBe(false)
  const row = { refId, programId: program._id, recipientId: recipient._id, periodId: 202601, status: 'PENDING' }
  await Disbursements.create(row)
  await expect(Disbursements.create({ ...row, refId: '0x' + 'd'.repeat(64) })).rejects.toMatchObject({ code: 11000 })
  await expect(Disbursements.create({ ...row, refId: '0x' + 'e'.repeat(64), status: 'DRAFT' })).resolves.toBeTruthy()
})
test.each(['CONFIRMED', 'MISMATCH', 'NOT_FOUND'] as const)('shared confirmation handles %s safely', async outcome => {
  const { recipient, program } = await fixture()
  const row = await Disbursements.create({ refId, programId: program._id, recipientId: recipient._id, commitment: recipient.commitment, periodId: 202601, amount: 300000, status: 'PENDING', chain: { txHash }, evidence: [{ cid: 'bafy' + 'a'.repeat(50) }] })
  vi.spyOn(chainVerifier, 'verifyDisbursement').mockResolvedValue(outcome === 'CONFIRMED' ? { status: outcome, receipt: { txHash, blockNumber: 10, logIndex: 0, blockTimestamp: new Date(), from: contract } } : outcome === 'MISMATCH' ? { status: outcome, errorCode: 'MISMATCH' } : { status: outcome })
  const response = await disbursements.confirm(ctx(String(row._id), { txHash }))
  expect(response.status).toBe(outcome === 'NOT_FOUND' ? 202 : 200)
  expect((await Disbursements.findById(row._id).lean())?.status).toBe(outcome === 'CONFIRMED' ? 'SUCCESS' : outcome === 'MISMATCH' ? 'FAILED' : 'PENDING')
})

describe('public status privacy', () => {
  test.each(['cross-origin', 'missing-origin', 'cross-site'] as const)('%s is rejected before parsing, limits, CAPTCHA or database work, with padding', async mode => {
    const input = request({ nik: 'invalid' }, 'POST', '/api/v1/public/status-check?nik=invalid')
    if (mode === 'missing-origin') input.headers.delete('origin')
    else if (mode === 'cross-origin') input.headers.set('origin', 'https://attacker.test')
    else input.headers.set('sec-fetch-site', 'cross-site')
    const parse = vi.spyOn(input, 'text'), fetch = vi.spyOn(globalThis, 'fetch'), lookup = vi.spyOn(Recipients, 'findOne'), limits = vi.spyOn(RateLimits, 'findOneAndUpdate')
    const start = Date.now(), response = await statusCheck(input)
    expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ code: 'FORBIDDEN_ORIGIN' })
    expect(Date.now() - start).toBeGreaterThanOrEqual(600); expect(response.headers.get('cache-control')).toBe('no-store')
    expect(parse).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled(); expect(limits).not.toHaveBeenCalled()
    expect(await AuditLogs.countDocuments()).toBe(0)
  })
  test.each(['FINAL', 'DRAFT', 'deleted', 'unknown'] as const)('%s uses no-store, padded timing and excludes private fields', async mode => {
    if (mode !== 'unknown') { const { recipient } = await fixture(mode === 'DRAFT' ? 'DRAFT' : 'FINAL'); if (mode === 'deleted') await Recipients.updateOne({ _id: recipient._id }, { $set: { deletedAt: new Date() } }) }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: true, hostname: 'example.test' }))
    const start = Date.now(), response = await statusCheck(request({ nik, turnstileToken: 'test-token' }, 'POST', '/api/v1/public/status-check'))
    expect(Date.now() - start).toBeGreaterThanOrEqual(600); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store')
    const result = await response.json(), encoded = JSON.stringify(result)
    expect(result.found).toBe(mode === 'FINAL')
    if (mode === 'FINAL') { expect(result.name).toBe('Synthetic Recipient'); expect(result.entries).toHaveLength(2) } else expect(result).toEqual({ found: false })
    for (const value of [nik, '"nik"', '"address"', '"phone"', 'Private location', '0800000000']) expect(encoded).not.toContain(value)
    const logs = await AuditLogs.find().lean(); expect(JSON.stringify(logs)).not.toContain(nik); expect(JSON.stringify(logs)).not.toContain('Synthetic Recipient')
    expect(logs[0].diff).toEqual({ blindIndexPrefix: nikBlindIndex(nik).slice(0, 12) })
  })
  test('invalid CAPTCHA is delayed and never queries recipients', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: false }))
    const lookup = vi.spyOn(Recipients, 'findOne'), start = Date.now()
    const response = await statusCheck(request({ nik, turnstileToken: 'invalid' }))
    expect(response.status).toBe(400); expect(Date.now() - start).toBeGreaterThanOrEqual(600); expect(lookup).not.toHaveBeenCalled()
  })
  test('malformed input and missing config also have minimum delay', async () => {
    const start = Date.now(), response = await statusCheck(request({ nik: 'invalid', turnstileToken: '' }))
    expect(response.status).toBe(400); expect(Date.now() - start).toBeGreaterThanOrEqual(600)
    vi.stubEnv('TURNSTILE_SECRET', '')
    try { const start = Date.now(), response = await statusCheck(request({ nik, turnstileToken: 'test' })); expect(response.status).toBe(503); expect(Date.now() - start).toBeGreaterThanOrEqual(600) } finally { vi.unstubAllEnvs() }
  })
})

test('audit chain detects tampering', async () => {
  await appendAudit({ actor: 'test', action: 'FIRST' }); await appendAudit({ actor: 'test', action: 'SECOND' })
  expect((await verifyAuditChain(1, 2)).valid).toBe(true)
  await AuditLogs.updateOne({ seq: 1 }, { $set: { action: 'TAMPERED' } })
  expect(await verifyAuditChain(1, 2)).toMatchObject({ valid: false, failedAt: 1 })
})
test('cron fails closed without matching secret; readiness does not leak configuration', async () => {
  expect(() => requireCron(request())).toThrow(DomainError)
  const good = request(); good.headers.set('authorization', `Bearer ${process.env.CRON_SECRET}`); expect(() => requireCron(good)).not.toThrow()
  expect((await cron(request())).status).toBe(401)
  expect((await health(request({}, 'GET'))).status).toBe(200)
  vi.stubEnv('RPC_URL_SERVER', ''); vi.stubEnv('PINATA_JWT', '')
  try { const response = await readiness(request({}, 'GET')); expect(response.status).toBe(503); const value = await response.json(); expect(value.services.mongo).toBe('ok'); expect(JSON.stringify(value)).not.toContain(mongo.getUri()) } finally { vi.unstubAllEnvs() }
})
test('reconciliation flags missing events, orphan events and CID mismatch', async () => {
  vi.stubEnv('RPC_URL_SERVER', 'https://rpc.example.test'); vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', contract); vi.stubEnv('NEXT_PUBLIC_CHAIN_ID', '1337')
  try {
    const { createHash } = await import('node:crypto')
    const _id = new Types.ObjectId(createHash('sha256').update(`1337:${contract}`).digest('hex').slice(0, 24))
    await Settings.create({ _id, chainId: 1337, contractAddress: contract, lastIndexedBlock: 20 })
    const { recipient, program } = await fixture()
    await Disbursements.create({ refId, recipientId: recipient._id, programId: program._id, periodId: 202601, amount: 300000, status: 'SUCCESS', chain: { txHash, blockNumber: 10 }, evidence: [{ cid: 'expected' }] })
    const response = await report(ctx('', {}, 'GET')); expect((await response.json()).anomalies.missingEvents).toHaveLength(1)
    await ChainEvents.create({ txHash, logIndex: 0, name: 'DisbursementRecorded', chainId: 1337, contractAddress: contract, blockNumber: 10, args: { refId, amount: '300000', evidenceCid: 'different' } })
    const mismatch = await (await report(ctx('', {}, 'GET'))).json(); expect(mismatch.anomalies.inconsistentEvents[0].code).toBe('MISMATCH')
    await Disbursements.updateOne({ refId }, { $set: { status: 'FAILED' } })
    expect((await (await report(ctx('', {}, 'GET'))).json()).anomalies.inconsistentEvents[0].code).toBe('EVENT_WITHOUT_DB_SUCCESS')
  } finally { vi.unstubAllEnvs() }
})

test('cron indexes idempotently and confirms stale PENDING through the shared verifier', async () => {
  vi.stubEnv('RPC_URL_SERVER', 'https://rpc.example.test'); vi.stubEnv('NEXT_PUBLIC_CONTRACT_ADDRESS', contract); vi.stubEnv('NEXT_PUBLIC_CHAIN_ID', '1337')
  try {
    const config = await import('@/modules/chain/config'), { ledgerInterface } = await import('@/lib/blockchain/abi')
    const { recipient, program } = await fixture()
    const row = await Disbursements.create({ refId, recipientId: recipient._id, programId: program._id, periodId: 202601, commitment: recipient.commitment, amount: 300000, status: 'PENDING', evidence: [{ cid: 'bafy' + 'a'.repeat(50) }] })
    await Disbursements.collection.updateOne({ _id: row._id }, { $set: { updatedAt: new Date(Date.now() - 180000) } })
    const encoded = ledgerInterface.encodeEventLog(ledgerInterface.getEvent('DisbursementRecorded')!, [refId, programHash, recipient.commitment, 202601, 300000, 'bafy' + 'a'.repeat(50), contract, 1000])
    const log = { ...encoded, index: 0, transactionHash: txHash, blockHash: '0x' + 'f'.repeat(64), blockNumber: 10, address: contract }
    const rpc = { getBlockNumber: vi.fn().mockResolvedValue(10), getLogs: vi.fn().mockResolvedValue([log]) }
    vi.spyOn(config, 'provider').mockReturnValue(rpc as unknown as ReturnType<typeof config.provider>)
    vi.spyOn(chainVerifier, 'verifyDisbursement').mockResolvedValue({ status: 'CONFIRMED', receipt: { txHash, blockNumber: 10, logIndex: 0, blockTimestamp: new Date(1000000), from: contract } })
    const invoke = () => { const req = request(); req.headers.set('authorization', `Bearer ${process.env.CRON_SECRET}`); return cron(req) }
    const first = await invoke(); expect(first.status).toBe(200); expect(await first.json()).toMatchObject({ indexed: 1, processed: 1, failures: 0 })
    expect((await Disbursements.findById(row._id).lean())?.status).toBe('SUCCESS')
    expect((await Settings.findOne().lean())?.lastIndexedBlock).toBe(10)
    await Settings.updateMany({}, { $set: { lastIndexedBlock: -1 } })
    expect((await invoke()).status).toBe(200); expect(await ChainEvents.countDocuments()).toBe(1)
    expect(chainVerifier.verifyDisbursement).toHaveBeenCalledTimes(1)
  } finally { vi.unstubAllEnvs() }
})

const routeRoot = 'src/app/api/v1'
const routes = readdirSync(routeRoot, { recursive: true })
  .filter((name): name is string => typeof name === 'string' && name.endsWith('route.ts'))
  .map(name => name.replace(/\\/g, '/'))
const endpoints = routes.flatMap(file => {
  const source = readFileSync(`${routeRoot}/${file}`, 'utf8')
  return [...source.matchAll(/export (?:const|(?:async )?function) (GET|POST|PATCH|DELETE|PUT)\b/g)].map(match => ({ file, method: match[1], source, permission: source.match(new RegExp(`export const ${match[1]} = route\\('([^']+)'`))?.[1] as Permission | undefined }))
})
test.each(['OPERATOR', 'KECAMATAN', 'DINAS_SOSIAL', 'anonymous'] as const)('every v1 route has classified access and enforces %s permission matrix', async role => {
  if (role !== 'anonymous') await signedIn(role)
  expect(endpoints.length).toBeGreaterThanOrEqual(55)
  for (const endpoint of endpoints) {
    if (endpoint.permission) {
      const monitoringRead = endpoint.method === 'GET' || endpoint.file.includes('reveal-nik')
      const allowed = role !== 'anonymous' && (role === 'OPERATOR' || monitoringRead)
      const result = await requireV1(endpoint.permission)
      expect(result.response?.status ?? 200, `${endpoint.method} ${endpoint.file}`).toBe(allowed ? 200 : role === 'anonymous' ? 401 : 403)
    } else if (endpoint.file.startsWith('auth/')) {
      if (endpoint.file.includes('wallet/')) {
        const result = await requireV1('wallet:verify-session'); expect(result.response?.status ?? 200).toBe(role === 'OPERATOR' ? 200 : role === 'anonymous' ? 401 : 403)
      } else if (['auth/me/route.ts','auth/change-password/route.ts','auth/mfa/verify/route.ts'].includes(endpoint.file)) {
        expect((await requireV1()).response?.status ?? 200).toBe(role === 'anonymous' ? 401 : 200)
      } else expect(['auth/login/route.ts','auth/logout/route.ts']).toContain(endpoint.file)
    } else {
      expect(endpoint.source.includes('openRoute(') || endpoint.source.includes('publicRoute(') || endpoint.file === 'health/ready/route.ts', endpoint.file).toBe(true)
    }
  }
  if (role === 'KECAMATAN' || role === 'DINAS_SOSIAL') {
    expect((await nonce(request())).status).toBe(403); expect((await bind(request())).status).toBe(403)
    expect((await requireV1('wallet:read')).response).toBeNull()
  }
})
