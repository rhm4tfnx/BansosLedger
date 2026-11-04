import test, { beforeEach, afterEach, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import mongoose, { Types } from 'mongoose'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { AuditLogs, Counters, Disbursements, Enrollments, Programs, RateLimits, Recipients } from '@/lib/db/models'
import { encryptNik } from '@/lib/crypto/nik'
import { hasPermission } from '@/lib/rbac'
import { chainVerifier } from '../chain/verifier'
import { csvCell, wallet } from '../reports/service'
import * as recipients from '../recipients/service'
import * as programs from '../programs/service'
import * as disbursements from '../disbursements/service'
import { processEvidence, publicEvidence, upload } from '../evidence/service'
import { pinata } from '../evidence/pinata'
import { body, boundedBody, DomainError, escapeSearch, pageQuery, periodSchema, type DomainContext } from './http'
import { z } from 'zod'

const id = new Types.ObjectId(), userId = new Types.ObjectId(), recipientId = new Types.ObjectId(), programId = new Types.ObjectId()
const txHash = '0x' + 'a'.repeat(64), commitment = '0x' + 'b'.repeat(64), chainProgramId = '0x' + 'c'.repeat(64)
const nik = '7311010101900001'
const originalEnv = { ...process.env }
const globalState = globalThis as typeof globalThis & { bansosMongo?: Promise<typeof mongoose> }
let previousConnection: typeof globalState.bansosMongo
beforeEach(() => {
  previousConnection = globalState.bansosMongo
  globalState.bansosMongo = Promise.resolve(mongoose)
  Object.assign(process.env, { MONGODB_URI: 'mongodb://localhost/not-used', NIK_ENC_KEY: '11'.repeat(32), NIK_INDEX_KEY: 'i'.repeat(32), COMMITMENT_PEPPER: '22'.repeat(32), APP_BASE_URL: 'https://example.test' })
})
afterEach(() => { globalState.bansosMongo = previousConnection; for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]; Object.assign(process.env, originalEnv) })
function ctx(value: unknown = {}, method = 'POST', search = ''): DomainContext {
  return { request: new Request(`https://example.test/api/v1/resource${search}`, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://example.test' }, ...(method === 'GET' ? {} : { body: JSON.stringify(value) }) }), actor: { userId: String(userId), role: 'OPERATOR_KELURAHAN', walletVerified: true, expiresAt: Date.now() + 60000 }, params: { id: String(id) } }
}
function q<T>(value: T) { const query = { lean: async () => value, select: (_value?: unknown) => query, sort: (_value?: unknown) => query, skip: (_value?: unknown) => query, limit: (_value?: unknown) => query }; return query }
function auditMocks(t: TestContext) {
  t.mock.method(Counters, 'findOneAndUpdate', async () => ({ value: 1 }))
  return t.mock.method(AuditLogs, 'create', async (value: unknown) => value)
}
const program = { _id: programId, programId: chainProgramId, status: 'ACTIVE', amountPerRecipient: 300000, totalBudget: 3000000, startPeriod: 202601, endPeriod: 202612 }
function validDisbursement() { return { programId: String(programId), recipientId: String(recipientId), period: 202610, disbursedDate: '2026-10-30', note: '' } }
function prevalidationMocks(t: TestContext) {
  t.mock.method(Programs, 'findById', () => q(program))
  t.mock.method(Recipients, 'findOne', () => q({ _id: recipientId, commitment }))
  t.mock.method(Enrollments, 'exists', async () => ({ _id: id }))
  t.mock.method(Disbursements, 'exists', async () => null)
}
function pending() { return { _id: id, programId, recipientId, refId: '0x' + 'd'.repeat(64), periodId: 202610, commitment, amount: 300000, status: 'PENDING', chain: { txHash }, evidence: [{ cid: 'bafy' + 'a'.repeat(50), status: 'ACTIVE' }] } }
function code(expected: string) { return (error: unknown) => error instanceof DomainError && error.code === expected }

test('pagination validates bounds, safe sort and escaped name search', () => {
  assert.equal(pageQuery(ctx({}, 'GET', '?limit=100&page=2&sort=name').request, ['name']).skip, 100)
  assert.throws(() => pageQuery(ctx({}, 'GET', '?limit=101').request))
  assert.throws(() => pageQuery(ctx({}, 'GET', '?sort=$where').request), code('INVALID_SORT'))
  assert.equal(escapeSearch('a.*(b)'), 'a\\.\\*\\(b\\)')
  assert.equal(periodSchema.safeParse(202613).success, false)
  assert.equal(periodSchema.safeParse(199912).success, false)
})

test('bounded bodies reject oversized streams and malformed JSON', async () => {
  await assert.rejects(boundedBody(new Request('https://example.test', { method: 'POST', body: 'x'.repeat(10) }), 5), code('PAYLOAD_TOO_LARGE'))
  await assert.rejects(body(new Request('https://example.test', { method: 'POST', body: '{' }), z.object({})), code('INVALID_JSON'))
})

test('all client schemas reject status, chain, malformed dates, codes and NIK', () => {
  assert.equal(recipients.recipientInput.safeParse({ nik: 'invalid', name: 'Test', address: { dusun: 'A', rt: '1', rw: '1' } }).success, false)
  assert.equal(disbursements.disbursementInput.safeParse({ ...validDisbursement(), status: 'SUCCESS' }).success, false)
  assert.equal(disbursements.disbursementInput.safeParse({ ...validDisbursement(), chain: { txHash } }).success, false)
  assert.equal(disbursements.disbursementInput.safeParse({ ...validDisbursement(), disbursedDate: '2026-02-30' }).success, false)
  assert.equal(programs.programInput.safeParse({ ...program, code: 'lowercase' }).success, false)
})

test('recipient duplicate NIK returns no information about the existing person', async t => {
  t.mock.method(Recipients, 'create', async () => { throw { code: 11000, keyValue: { nikBlindIndex: 'private' } } })
  await assert.rejects(recipients.create(ctx({ nik, name: 'Test', address: { dusun: 'A', rt: '1', rw: '1' } })), error => error instanceof DomainError && error.status === 409 && error.message === 'NIK sudah terdaftar')
  assert.doesNotMatch(recipients.recipientProjection, /nikEnc|nikBlindIndex/)
})

test('final recipients cannot be patched or soft deleted', async t => {
  const update = t.mock.method(Recipients, 'findOneAndUpdate', (filter: Record<string, unknown>) => { assert.equal(filter.status, 'DRAFT'); assert.equal(filter.deletedAt, null); return q(null) })
  await assert.rejects(recipients.update(ctx({ name: 'Changed' })), code('IMMUTABLE_RECORD'))
  assert.equal(update.mock.callCount(), 1)
  t.mock.method(Recipients, 'updateOne', async (filter: Record<string, unknown>) => { assert.equal(filter.status, 'DRAFT'); return { modifiedCount: 0 } })
  await assert.rejects(recipients.softDelete(ctx({ reason: 'Duplicate' })), code('IMMUTABLE_RECORD'))
})

test('finalization uses encrypted NIK and a conditional DRAFT write', async t => {
  auditMocks(t)
  const row = { _id: id, status: 'DRAFT', nikEnc: encryptNik(nik), nikBlindIndex: 'blind', updatedAt: new Date() }
  t.mock.method(Recipients, 'findOne', () => q(row))
  t.mock.method(Recipients, 'findOneAndUpdate', (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
    assert.equal(filter.status, 'DRAFT'); assert.equal(filter.nikBlindIndex, 'blind'); assert.equal(filter.updatedAt, row.updatedAt)
    assert.equal(update.$set.status, 'FINAL'); assert.match(String(update.$set.commitment), /^0x[0-9a-f]{64}$/)
    return q({ _id: id, status: 'FINAL', nikMasked: '7311••••••••0001' })
  })
  assert.equal((await recipients.finalize(ctx())).status, 200)
})

test('reveal limits per-user access to 30/hour with retry delay', async t => {
  t.mock.method(RateLimits, 'findOneAndUpdate', async () => ({ count: 31 }))
  await assert.rejects(recipients.reveal(ctx()), error => error instanceof DomainError && error.status === 429 && !!error.retryAfter && error.retryAfter <= 3600)
})

test('reveal is no-store and its audit never includes the decrypted NIK', async t => {
  const log = auditMocks(t)
  t.mock.method(RateLimits, 'findOneAndUpdate', async () => ({ count: 30 }))
  t.mock.method(Recipients, 'findOne', () => q({ nikEnc: encryptNik(nik) }))
  const response = await recipients.reveal(ctx())
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { nik })
  const event = log.mock.calls[0].arguments[0] as Record<string, unknown>
  assert.equal(event.action, 'REVEAL_NIK'); assert.doesNotMatch(JSON.stringify(event), new RegExp(nik))
})

test('active program economic fields are immutable', async t => {
  t.mock.method(Programs, 'findById', () => q(program))
  await assert.rejects(programs.update(ctx({ amountPerRecipient: 1 })), code('IMMUTABLE_RECORD'))
  await assert.rejects(programs.update(ctx({ code: 'NEW-CODE' })), code('IMMUTABLE_RECORD'))
})

test('intent returns encoded wallet payload and never submits transactions', async t => {
  process.env.NEXT_PUBLIC_CHAIN_ID = '250204'; process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x' + '1'.repeat(40)
  t.mock.method(Programs, 'findById', () => q({ ...program, status: 'DRAFT' }))
  const result = await (await programs.intent('create')(ctx())).json()
  assert.equal(result.chainId, 250204)
  const decoded = programs.programABI.parseTransaction({ data: result.data })!
  assert.equal(decoded.name, 'createProgram'); assert.equal(decoded.args[0], chainProgramId); assert.equal(decoded.args[1], BigInt(300000))
})

test('unconfigured chain verifier and wallet status fail closed', async () => {
  await assert.rejects(chainVerifier.verifyProgram('create', txHash, { programId: chainProgramId, amount: 1, startPeriod: 202601, endPeriod: 202612 }), code('CHAIN_NOT_CONFIGURED'))
  await assert.rejects(chainVerifier.verifyDisbursement(txHash, { refId: commitment, programId: chainProgramId, periodId: 202601, commitment, amount: 1, evidenceCids: [] }), code('CHAIN_NOT_CONFIGURED'))
  const context = ctx({}, 'GET'); context.actor.role = 'KECAMATAN'; context.actor.boundWalletAddress = 'secret-own-wallet'
  await assert.rejects(wallet(context), code('CHAIN_NOT_CONFIGURED'))
})

test('disbursement creation rejects even an amount matching the program', async () => {
  await assert.rejects(disbursements.create(ctx({ ...validDisbursement(), amount: 300000 })), code('AMOUNT_NOT_ALLOWED'))
})

test('prevalidation maps inactive, out-of-range, unenrolled and duplicate conflicts', async t => {
  prevalidationMocks(t)
  t.mock.method(Programs, 'findById', () => q({ ...program, status: 'CLOSED' }))
  await assert.rejects(disbursements.prevalidate(programId, recipientId, 202610), code('ProgramClosed'))
  t.mock.method(Programs, 'findById', () => q(program))
  await assert.rejects(disbursements.prevalidate(programId, recipientId, 202701), code('PeriodOutOfRange'))
  t.mock.method(Enrollments, 'exists', async () => null)
  await assert.rejects(disbursements.prevalidate(programId, recipientId, 202610), code('RecipientNotRegistered'))
  t.mock.method(Enrollments, 'exists', async () => ({ _id: id }))
  t.mock.method(Disbursements, 'exists', async () => ({ _id: id }))
  await assert.rejects(disbursements.prevalidate(programId, recipientId, 202610), code('AlreadyDisbursed'))
})

test('creation copies amount and replays scoped idempotency without another insert', async t => {
  prevalidationMocks(t); auditMocks(t)
  let stored: Record<string, unknown> | null = null
  t.mock.method(Disbursements, 'findOne', () => q(stored))
  const create = t.mock.method(Disbursements, 'create', async (value: Record<string, unknown>) => { stored = value; return value })
  const first = ctx(validDisbursement()); first.request.headers.set('Idempotency-Key', 'same-key')
  assert.equal((await disbursements.create(first)).status, 201)
  assert.equal(stored!.amount, 300000); assert.equal(stored!.status, 'DRAFT'); assert.notEqual(stored!.idempotencyKey, 'same-key')
  const second = ctx(validDisbursement()); second.request.headers.set('Idempotency-Key', 'same-key')
  assert.equal((await disbursements.create(second)).status, 200); assert.equal(create.mock.callCount(), 1)
  const different = ctx({ ...validDisbursement(), note: 'Changed' }); different.request.headers.set('Idempotency-Key', 'same-key')
  await assert.rejects(disbursements.create(different), code('IDEMPOTENCY_CONFLICT'))
})

test('submission requires evidence and translates unique-index races to 409', async t => {
  prevalidationMocks(t)
  t.mock.method(Disbursements, 'findOne', () => q({ ...pending(), status: 'DRAFT', evidence: [] }))
  await assert.rejects(disbursements.submitted(ctx({ txHash })), code('EVIDENCE_REQUIRED'))
  t.mock.method(Disbursements, 'findOne', () => q({ ...pending(), status: 'DRAFT' }))
  t.mock.method(Disbursements, 'findOneAndUpdate', () => { throw { code: 11000 } })
  await assert.rejects(disbursements.submitted(ctx({ txHash })), code('AlreadyDisbursed'))
})

test('unmined confirmation returns 202 without mutating the disbursement', async t => {
  t.mock.method(Disbursements, 'findOne', () => q(pending()))
  t.mock.method(Programs, 'findById', () => q(program))
  t.mock.method(chainVerifier, 'verifyDisbursement', async () => ({ status: 'PENDING' as const }))
  const update = t.mock.method(Disbursements, 'findOneAndUpdate', () => { throw new Error('Must not write') })
  const response = await disbursements.confirm(ctx({ txHash }))
  assert.equal(response.status, 202); assert.deepEqual(await response.json(), { status: 'PENDING' }); assert.equal(update.mock.callCount(), 0)
})

test('verified confirmation is the only SUCCESS write and is conditional on pending tx', async t => {
  auditMocks(t)
  t.mock.method(Disbursements, 'findOne', () => q(pending()))
  t.mock.method(Programs, 'findById', () => q(program))
  t.mock.method(chainVerifier, 'verifyDisbursement', async (_hash: string, expected: { amount: number; commitment: string }) => {
    assert.equal(expected.amount, 300000); assert.equal(expected.commitment, commitment)
    return { status: 'CONFIRMED' as const, receipt: { txHash, blockNumber: 5, logIndex: 2, blockTimestamp: new Date(), from: '0x' + '1'.repeat(40) } }
  })
  t.mock.method(Disbursements, 'findOneAndUpdate', (filter: Record<string, unknown>, update: { $set: { status: string; chain: Record<string, unknown> } }) => {
    assert.equal(filter.status, 'PENDING'); assert.equal(filter['chain.txHash'], txHash)
    assert.equal(update.$set.status, 'SUCCESS'); assert.ok(update.$set.chain.confirmedAt)
    return q({ ...pending(), ...update.$set })
  })
  assert.equal((await (await disbursements.confirm(ctx({ txHash }))).json()).status, 'SUCCESS')
})

test('reverted confirmation appends failure without deleting earlier attempts', async t => {
  auditMocks(t)
  t.mock.method(Disbursements, 'findOne', () => q(pending()))
  t.mock.method(Programs, 'findById', () => q(program))
  t.mock.method(chainVerifier, 'verifyDisbursement', async () => ({ status: 'REVERTED' as const, errorCode: 'AlreadyDisbursed' }))
  t.mock.method(Disbursements, 'findOneAndUpdate', (_filter: unknown, update: { $set: Record<string, unknown>; $push: Record<string, unknown> }) => {
    assert.equal(update.$set.status, 'FAILED'); assert.equal(update.$set.attempts, undefined); assert.ok(update.$push.attempts)
    return q({ ...pending(), status: 'FAILED' })
  })
  const response = await (await disbursements.confirm(ctx({ txHash }))).json()
  assert.equal(response.status, 'FAILED'); assert.equal(response.errorCode, 'AlreadyDisbursed')
})

test('retry appends attempt and clears active chain only after FAILED', async t => {
  prevalidationMocks(t); auditMocks(t)
  t.mock.method(Disbursements, 'findOne', () => q({ ...pending(), status: 'FAILED' }))
  t.mock.method(Disbursements, 'findOneAndUpdate', (filter: Record<string, unknown>, update: { $set: Record<string, unknown>; $unset: Record<string, unknown>; $push: Record<string, unknown> }) => {
    assert.equal(filter.status, 'FAILED'); assert.equal(update.$set.status, 'DRAFT'); assert.equal(update.$unset.chain, 1); assert.ok(update.$push.attempts)
    return q({ ...pending(), status: 'DRAFT' })
  })
  assert.equal((await disbursements.retry(ctx())).status, 200)
})

test('evidence validates bytes rather than supplied MIME and strips JPEG metadata', async () => {
  await assert.rejects(processEvidence(new File(['not jpeg'], 'fake.jpg', { type: 'image/jpeg' })), code('FILE_TYPE'))
  await assert.rejects(processEvidence(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf')), code('FILE_SIZE'))
  const jpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } }).jpeg().withExif({ IFD0: { Artist: 'private identity' } }).toBuffer()
  assert.ok((await sharp(jpeg).metadata()).exif)
  const processed = await processEvidence(new File([new Uint8Array(jpeg)], 'private-name.jpg', { type: 'application/octet-stream' }))
  assert.equal(processed.mime, 'image/jpeg'); assert.equal((await sharp(processed.bytes).metadata()).exif, undefined)
  assert.equal(processed.sha256, createHash('sha256').update(processed.bytes).digest('hex')); assert.doesNotMatch(processed.name, /private/)
})

test('all privacy attestations must be true before uploads', async () => {
  const form = new FormData(); form.set('privacyNoPii', 'false'); form.set('file', new File(['test'], 'test.pdf'))
  const context = ctx(); context.request = new Request('https://example.test/api', { method: 'POST', body: form })
  await assert.rejects(upload(context), error => error instanceof z.ZodError)
})

test('public evidence reads SUCCESS only and omits private storage fields', async t => {
  t.mock.method(Disbursements, 'findOne', (filter: Record<string, unknown>) => {
    assert.equal(filter.status, 'SUCCESS')
    return q({ evidence: [{ cid: 'bafy' + 'a'.repeat(50), status: 'WITHDRAWN', mime: 'application/pdf', size: 10, pinataId: 'private-id' }] })
  })
  const result = await (await publicEvidence(ctx().request, { id: String(id) })).json()
  assert.equal(result.data[0].gatewayUrl, null); assert.equal(result.data[0].pinataId, undefined)
})

test('Pinata uses explicit public network and current V3 upload/unpin URLs', async t => {
  process.env.PINATA_JWT = 'synthetic-test-token'
  const requests: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    requests.push(url)
    if (init.method === 'POST') { assert.equal((init.body as FormData).get('network'), 'public'); return Response.json({ data: { id: 'file-id', cid: 'bafy' + 'a'.repeat(50) } }) }
    assert.equal(init.method, 'DELETE'); return new Response(null, { status: 204 })
  })
  const result = await pinata.upload(new Uint8Array([1]), 'opaque.pdf', 'application/pdf'); await pinata.unpin(result.pinataId)
  assert.deepEqual(requests, ['https://uploads.pinata.cloud/v3/files', 'https://api.pinata.cloud/v3/files/public/file-id'])
})

test('CSV escapes quotes, newlines and spreadsheet formula injection', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"'); assert.equal(csvCell('safe"value'), '"safe""value"')
  assert.equal(csvCell('\t=SUM(A1)'), '"\'\t=SUM(A1)"'); assert.equal(csvCell('a\nb'), '"a\nb"')
})

test('monitoring roles cannot write wallet or business records', () => {
  for (const role of ['KECAMATAN', 'DINAS_SOSIAL'] as const) {
    for (const permission of ['wallet:verify-session', 'transaction:sign', 'recipient:create', 'recipient:update', 'recipient:soft-delete', 'program:create', 'program:update', 'disbursement:create', 'evidence:upload'] as const) assert.equal(hasPermission(role, permission), false)
    for (const permission of ['wallet:read', 'audit:read', 'recipient:read', 'recipient:reveal-nik', 'program:read', 'disbursement:read', 'report:read'] as const) assert.equal(hasPermission(role, permission), true)
  }
})

test('domain code has no Mongo transactions, hard deletes or alternate SUCCESS writers', () => {
  const files = readdirSync('src/modules', { recursive: true }).filter((file): file is string => typeof file === 'string' && file.endsWith('.ts') && !file.endsWith('.test.ts'))
  for (const file of files) {
    const source = readFileSync(`src/modules/${file}`, 'utf8')
    assert.doesNotMatch(source, /\.deleteOne\(|\.deleteMany\(|\.findOneAndDelete\(|\.remove\(|ClientSession|\.transaction\(|\.startSession\(/, file)
    if (file.replace(/\\/g, '/') !== 'disbursements/service.ts') assert.doesNotMatch(source, /\$set:\s*\{\s*status:\s*'SUCCESS'/, file)
  }
  const source = readFileSync('src/modules/disbursements/service.ts', 'utf8')
  assert.equal(source.match(/\$set:\s*\{\s*status:\s*'SUCCESS'/g)?.length, 1)
  assert.doesNotMatch(source, /export\s+(?:async\s+)?function\s+persistConfirmed/)
  const indexes = Disbursements.schema.indexes()
  assert.ok(indexes.some(([keys, options]) => keys.idempotencyKey && options.unique && options.sparse))
  assert.ok(indexes.some(([keys, options]) => keys.programId && options.unique && options.partialFilterExpression))
})
