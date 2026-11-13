import assert from 'node:assert/strict'
import { test } from 'node:test'
import mongoose from 'mongoose'
import { models, Sessions, Disbursements, Recipients, AuditLogs, Counters } from './models'
import { appendAudit, appendAuditBestEffort, verifyAuditChain } from '../../modules/audit/service'
import { rotateSession } from '../auth/session'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { connectDatabase } from './connection'
import { canonicalJSON, redact } from '../../modules/audit/service'
import { isSameOriginRequest } from '../auth/request-origin'
import { getSessionCookieOptions, tokenHash } from '../auth/session'
import { POST as v1login } from '../../app/api/v1/auth/login/route'
import { POST as v1logout } from '../../app/api/v1/auth/logout/route'
import { POST as v1nonce } from '../../app/api/v1/auth/wallet/nonce/route'
import { POST as v1bind } from '../../app/api/v1/auth/wallet/bind/route'
import { POST as changePassword } from '../../app/api/v1/auth/change-password/route'
import { GET as me } from '../../app/api/v1/auth/me/route'

test('model imports do not connect and required indexes exist', () => {
  assert.equal(mongoose.connection.readyState, 0)
  assert.equal(models.length, 11)
  assert.ok(Sessions.schema.indexes().some(([fields, options]) => fields.expiresAt === 1 && options.expireAfterSeconds === 0))
  assert.ok(Recipients.schema.indexes().some(([fields, options]) => fields.commitment === 1 && options.unique && options.sparse))
  assert.ok(Disbursements.schema.indexes().some(([fields, options]) => fields.programId === 1 && options.unique && JSON.stringify(options.partialFilterExpression) === JSON.stringify({ status: { $in: ['PENDING', 'SUCCESS'] } })))
  for (const model of models) {
    assert.ok(model.schema.paths.schemaVersion)
    assert.ok(model.schema.paths.createdAt)
    assert.ok(model.schema.paths.updatedAt)
  }
})

test('missing database returns 503 for every v1 auth handler using problem JSON', async () => {
  const saved = process.env.MONGODB_URI
  delete process.env.MONGODB_URI
  try {
    await assert.rejects(connectDatabase, /Layanan belum dikonfigurasi/)
    for (const handler of [v1login, v1logout, v1nonce, v1bind, changePassword, me]) {
      const response = await handler(new Request('http://localhost/api/v1/auth', { method: 'POST' }))
      assert.equal(response.status, 503)
      assert.match(response.headers.get('content-type') || '', /application\/problem\+json/)
      assert.equal((await response.json()).message, 'Layanan belum dikonfigurasi.')
    }
    assert.equal(mongoose.connection.readyState, 0)
  } finally { if (saved === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = saved }
})

test('audit canonicalization and nested secret redaction', () => {
  assert.equal(canonicalJSON({ z: 1, a: { b: 2, a: 1 } }), canonicalJSON({ a: { a: 1, b: 2 }, z: 1 }))
  assert.deepEqual(redact({ nik: 'private', safe: [{ passwordHash: 'hash', token: 'token', count: 1 }], secretEnc: {} }), { nik: '[REDACTED]', safe: [{ passwordHash: '[REDACTED]', token: '[REDACTED]', count: 1 }], secretEnc: '[REDACTED]' })
  assert.equal(getSessionCookieOptions().sameSite, 'lax')
  assert.equal(getSessionCookieOptions().httpOnly, true)
  assert.match(tokenHash('synthetic-token'), /^[0-9a-f]{64}$/)
})

test('standalone MongoDB uses Mongoose 8 without transaction APIs', () => {
  assert.match(mongoose.version, /^8\./)
  assert.equal(Counters.schema.path('hash'), undefined)
  assert.ok(AuditLogs.schema.path('note'))
  const files = ['src/modules/audit/service.ts', 'src/lib/auth/session.ts', 'scripts/accounts.ts', 'src/modules/auth/service.ts', 'src/app/api/v1/auth/login/route.ts', 'src/app/api/v1/auth/logout/route.ts', 'src/app/api/v1/auth/wallet/nonce/route.ts', 'src/app/api/v1/auth/wallet/bind/route.ts', 'src/app/api/v1/auth/change-password/route.ts']
  for (const file of files) assert.doesNotMatch(readFileSync(file, 'utf8'), /ClientSession|startSession|\.transaction\s*\(|\.session\s*\(|session:\s*(?:transaction|session)/, file)
})

test('standalone audit retries predecessors, records gaps and reports missing sequences', async t => {
  const previousUri = process.env.MONGODB_URI
  const state = globalThis as typeof globalThis & { bansosMongo?: Promise<typeof mongoose> }
  const previousConnection = state.bansosMongo
  process.env.MONGODB_URI = 'mongodb://localhost/synthetic-test'
  state.bansosMongo = Promise.resolve(mongoose)
  type Row = { seq: number; hash: string; prevHash: string; note?: string; [key: string]: unknown }
  const rows: Row[] = []
  let seq = 0
  let reads = 0
  let delayed = false
  t.mock.method(Counters, 'findOneAndUpdate', async (_filter: unknown, update: unknown, options: unknown) => {
    assert.deepEqual(update, { $inc: { value: 1 } })
    assert.deepEqual(options, { upsert: true, new: true })
    return { value: ++seq }
  })
  t.mock.method(AuditLogs, 'create', async (row: Row) => { rows.push(row); return row })
  t.mock.method(AuditLogs, 'findOne', (filter: { seq: number | { $lt: number } }) => {
    const result = { sort: () => result, lean: async () => {
      reads++
      if (delayed) { delayed = false; return null }
      const bound = filter.seq
      return typeof bound === 'number' ? rows.find(row => row.seq === bound) ?? null : [...rows].reverse().find(row => row.seq < bound.$lt) ?? null
    } }
    return result
  })
  t.mock.method(AuditLogs, 'find', (filter: { seq: { $gte: number; $lte: number } }) => {
    const result = { sort: () => result, lean: () => result, cursor: async function* () {
      yield* rows.filter(row => row.seq >= filter.seq.$gte && row.seq <= filter.seq.$lte)
    } }
    return result
  })
  try {
    await appendAudit({ actor: 'test', action: 'FIRST' })
    assert.equal(rows[0].prevHash, '0'.repeat(64))
    delayed = true
    await appendAudit({ actor: 'test', action: 'SECOND' })
    assert.equal(rows[1].prevHash, rows[0].hash)
    assert.ok(reads >= 2)
    assert.equal((await verifyAuditChain(1, 2)).valid, true)
    seq = 3
    reads = 0
    await appendAudit({ actor: 'test', action: 'AFTER_GAP' })
    assert.equal(reads, 22)
    assert.equal(rows[2].note, 'GAP')
    assert.equal(rows[2].prevHash, rows[1].hash)
    const { hash, prevHash, ...entry } = rows[2]
    assert.equal(hash, createHash('sha256').update(canonicalJSON(entry) + prevHash).digest('hex'))
    const report = await verifyAuditChain(1, 5)
    assert.equal(report.valid, false)
    assert.deepEqual(report.missingSequences, [3, 5])
    assert.deepEqual(report.gapEntries, [4])
    assert.deepEqual(report.invalidSequences, [])
    rows[0].action = 'TAMPERED'
    assert.deepEqual((await verifyAuditChain(1, 2)).invalidSequences, [1])
    t.mock.method(Counters, 'findOneAndUpdate', async () => { throw new Error('Audit unavailable') })
    await assert.doesNotReject(appendAuditBestEffort({ actor: 'test', action: 'LOGIN_FAILED' }))
    await assert.doesNotReject(appendAuditBestEffort({ actor: 'test', action: 'LOGOUT' }))
  } finally {
    if (previousUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = previousUri
    state.bansosMongo = previousConnection
  }
})

test('wallet rotation creates a new session before revoking the old session and cleans up on failure', async t => {
  const previousUri = process.env.MONGODB_URI
  const state = globalThis as typeof globalThis & { bansosMongo?: Promise<typeof mongoose> }
  const previousConnection = state.bansosMongo
  process.env.MONGODB_URI = 'mongodb://localhost/synthetic-test'
  state.bansosMongo = Promise.resolve(mongoose)
  const calls: string[] = []
  const expiresAt = new Date(Date.now() + 60000)
  t.mock.method(Sessions, 'findOne', () => ({ lean: async () => ({ _id: 'old', userId: 'user', expiresAt }) }))
  t.mock.method(Sessions, 'create', async () => { calls.push('create') })
  t.mock.method(Sessions, 'updateOne', async (filter: { _id?: string; tokenHash?: string }) => { calls.push(filter._id ? 'revoke-old' : 'revoke-new'); return { modifiedCount: 1 } })
  try {
    const result = await rotateSession('old-hash', 'address')
    assert.deepEqual(calls, ['create', 'revoke-old'])
    assert.equal(result.expiresAt, expiresAt)
    assert.match(result.token, /^[A-Za-z0-9_-]{43}$/)
    calls.length = 0
    t.mock.method(Sessions, 'updateOne', async (filter: { _id?: string }) => { calls.push(filter._id ? 'revoke-old' : 'revoke-new'); return { modifiedCount: filter._id ? 0 : 1 } })
    await assert.rejects(rotateSession('old-hash', 'address'))
    assert.deepEqual(calls, ['create', 'revoke-old', 'revoke-new'])
  } finally {
    if (previousUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = previousUri
    state.bansosMongo = previousConnection
  }
})

test('origin rejects forged forwarded host and cross-site requests', () => {
  const previous = process.env.APP_BASE_URL
  const proxy = process.env.APP_TRUST_PROXY
  process.env.APP_BASE_URL = 'https://bansos.example'
  process.env.APP_TRUST_PROXY = 'false'
  try {
    assert.equal(isSameOriginRequest(new Request('https://bansos.example/api', { headers: { origin: 'https://bansos.example' } })), true)
    assert.equal(isSameOriginRequest(new Request('https://bansos.example/api', { headers: { origin: 'https://attacker.example', 'x-forwarded-host': 'attacker.example' } })), false)
    assert.equal(isSameOriginRequest(new Request('https://bansos.example/api', { headers: { origin: 'https://bansos.example', 'sec-fetch-site': 'cross-site' } })), false)
  } finally {
    if (previous === undefined) delete process.env.APP_BASE_URL; else process.env.APP_BASE_URL = previous
    if (proxy === undefined) delete process.env.APP_TRUST_PROXY; else process.env.APP_TRUST_PROXY = proxy
  }
})
