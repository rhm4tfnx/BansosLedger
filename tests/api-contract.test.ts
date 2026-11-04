import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose, { Types } from 'mongoose'
import { z } from 'zod'
import { models, Users, Recipients, Programs, Enrollments, Disbursements, AuditLogs, Settings } from '@/lib/db/models'
import { connectDatabase } from '@/lib/db/connection'
import { encryptNik, nikBlindIndex } from '@/lib/crypto/nik'
import { recipientCommitment } from '@/lib/blockchain/identity-hash'
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { chainVerifier } from '@/modules/chain/verifier'
import * as networkMod from '@/modules/chain/network'
import * as explorerService from '@/modules/explorer/service'
import {
  recipientDtoSchema,
  programDtoSchema,
  disbursementDtoSchema,
  evidenceDtoSchema,
  auditLogDtoSchema,
  realizationReportDtoSchema,
  reconciliationDtoSchema,
  dashboardSummaryDtoSchema,
  walletStatusDtoSchema,
  networkStatusDtoSchema,
  authMeDtoSchema,
  problemDtoSchema,
  listEnvelope,
} from '@/lib/api-contract/dto'

import { GET as getAuditLogs } from '@/app/api/v1/audit-logs/route'
import { GET as verifyAuditLogs } from '@/app/api/v1/audit-logs/verify/route'
import { GET as getAuthMe } from '@/app/api/v1/auth/me/route'
import { GET as getDashboardSummary } from '@/app/api/v1/dashboard/summary/route'
import { GET as listDisbursements, POST as createDisbursement } from '@/app/api/v1/disbursements/route'
import { GET as getDisbursement, DELETE as deleteDisbursement } from '@/app/api/v1/disbursements/[id]/route'
import { POST as confirmDisbursement } from '@/app/api/v1/disbursements/[id]/confirm/route'
import { GET as getPublicEvidence } from '@/app/api/v1/disbursements/[id]/evidence/route'
import { POST as retryDisbursement } from '@/app/api/v1/disbursements/[id]/retry/route'
import { PATCH as submitDisbursementTx } from '@/app/api/v1/disbursements/[id]/tx-submitted/route'
import { GET as healthRoute } from '@/app/api/v1/health/route'
import { GET as healthReadyRoute } from '@/app/api/v1/health/ready/route'
import { GET as networkStatusRoute } from '@/app/api/v1/network/status/route'
import { GET as listPrograms, POST as createProgram } from '@/app/api/v1/programs/route'
import { GET as getProgram, PATCH as updateProgram } from '@/app/api/v1/programs/[id]/route'
import { POST as activateProgram } from '@/app/api/v1/programs/[id]/activate-intent/route'
import { POST as closeProgram } from '@/app/api/v1/programs/[id]/close-intent/route'
import { POST as enrollRecipients } from '@/app/api/v1/programs/[id]/enrollments/route'
import { POST as registerIntent } from '@/app/api/v1/programs/[id]/register-intent/route'
import { GET as publicProgramsRoute } from '@/app/api/v1/public/programs/route'
import { GET as publicProgramRoute } from '@/app/api/v1/public/programs/[code]/route'
import { GET as publicSummaryRoute } from '@/app/api/v1/public/summary/route'
import { GET as listRecipients, POST as createRecipient } from '@/app/api/v1/recipients/route'
import { GET as getRecipient, PATCH as updateRecipient, DELETE as deleteRecipient } from '@/app/api/v1/recipients/[id]/route'
import { POST as finalizeRecipient } from '@/app/api/v1/recipients/[id]/finalize/route'
import { POST as revealNik } from '@/app/api/v1/recipients/[id]/reveal-nik/route'
import { GET as getRealizationReport } from '@/app/api/v1/reports/realization/route'
import { GET as getReconciliationReport } from '@/app/api/v1/reports/reconciliation/route'
import { GET as getWalletStatus } from '@/app/api/v1/wallet/status/route'

const jar = vi.hoisted(() => new Map<string, string>())
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (key: string) => jar.has(key) ? { value: jar.get(key) } : undefined }) }))

const origin = 'https://example.test'
const nik = '7305010101900001'
const txHash = '0x' + 'a'.repeat(64)
const contract = '0x' + '1'.repeat(40)
let mongo: MongoMemoryServer
let userId: string

function req(body?: unknown, method = 'GET', path = '/api/v1/test') {
  return new Request(origin + path, {
    method,
    headers: { origin, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.24' }, instance: { dbName: 'contract_test' } })
  Object.assign(process.env, {
    MONGODB_URI: mongo.getUri(),
    APP_BASE_URL: origin,
    APP_TRUST_PROXY: 'false',
    AUTH_REQUIRE_TOTP: 'false',
    NIK_ENC_KEY: '11'.repeat(32),
    NIK_INDEX_KEY: 'test-index-key'.repeat(4),
    COMMITMENT_PEPPER: '22'.repeat(32),
    TURNSTILE_SECRET: 'test-turnstile',
    CRON_SECRET: 'test-cron-secret'.repeat(3),
    NEXT_PUBLIC_CHAIN_ID: '1337',
    NEXT_PUBLIC_CONTRACT_ADDRESS: contract,
    RPC_URL_SERVER: 'https://rpc.example.test',
  })
  await connectDatabase()
  for (const model of models) {
    await model.createCollection()
    await model.createIndexes()
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo?.stop()
})

beforeEach(async () => {
  jar.clear()
  vi.restoreAllMocks()
  await Promise.all(models.map(m => m.collection.deleteMany({})))

  const passwordHash = await hashPassword('Synthetic-pass-123!', 'operator', 'op@kelurahan.test')
  const user = await Users.create({
    username: 'operator',
    email: 'op@kelurahan.test',
    passwordHash,
    role: 'OPERATOR',
    name: 'Operator Kelurahan',
    institution: 'Kelurahan Takkalasi',
    isActive: true,
    mustChangePassword: false,
  })
  userId = String(user._id)
  const token = await createSession(userId, { boundWalletAddress: contract })
  jar.set(SESSION_COOKIE_NAME, token)

  vi.spyOn(chainVerifier, 'walletStatus').mockResolvedValue({
    authorizedWallet: contract,
    owner: contract,
    chainId: 1337,
    paused: false,
    networkOk: true,
  })
})

describe('API Contract V1 - Route Responses Match Zod DTO Schemas', () => {
  test('GET /api/v1/auth/me returns AuthMeDto', async () => {
    const res = await getAuthMe()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(authMeDtoSchema.parse(data)).toEqual(data)
    expect(data.role).toBe('OPERATOR')
    expect(data.institution).toBe('Kelurahan Takkalasi')
  })

  test('Recipients routes return valid DTOs and envelope', async () => {
    // POST /api/v1/recipients
    const createRes = await createRecipient(req({
      nik,
      name: 'Warga Penerima',
      address: { dusun: 'Dusun I', rt: '01', rw: '01' },
      phone: '08123456789',
    }, 'POST', '/api/v1/recipients'))
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(recipientDtoSchema.parse(created)).toEqual(created)
    expect(created.status).toBe('DRAFT')

    const recId = created.id

    // GET /api/v1/recipients
    const listRes = await listRecipients(req(undefined, 'GET', '/api/v1/recipients'))
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    const listSchema = listEnvelope(recipientDtoSchema)
    expect(listSchema.parse(listData)).toEqual(listData)
    expect(listData.total).toBe(1)
    expect(listData.totalPages).toBe(1)

    // GET /api/v1/recipients/:id
    const detailRes = await getRecipient(req(undefined, 'GET', `/api/v1/recipients/${recId}`), { params: Promise.resolve({ id: recId }) })
    expect(detailRes.status).toBe(200)
    const detailData = await detailRes.json()
    expect(recipientDtoSchema.extend({ history: listEnvelope(z.unknown()) }).parse(detailData)).toEqual(detailData)

    // PATCH /api/v1/recipients/:id
    const patchRes = await updateRecipient(req({ name: 'Warga Penerima Update' }, 'PATCH', `/api/v1/recipients/${recId}`), { params: Promise.resolve({ id: recId }) })
    expect(patchRes.status).toBe(200)
    const patched = await patchRes.json()
    expect(recipientDtoSchema.parse(patched)).toEqual(patched)
    expect(patched.name).toBe('Warga Penerima Update')

    // POST /api/v1/recipients/:id/reveal-nik
    const revealRes = await revealNik(req({}, 'POST', `/api/v1/recipients/${recId}/reveal-nik`), { params: Promise.resolve({ id: recId }) })
    expect(revealRes.status).toBe(200)
    const revealData = await revealRes.json()
    expect(revealData).toEqual({ nik })

    // POST /api/v1/recipients/:id/finalize
    const finalizeRes = await finalizeRecipient(req({}, 'POST', `/api/v1/recipients/${recId}/finalize`), { params: Promise.resolve({ id: recId }) })
    expect(finalizeRes.status).toBe(200)
    const finalized = await finalizeRes.json()
    expect(recipientDtoSchema.parse(finalized)).toEqual(finalized)
    expect(finalized.status).toBe('FINAL')
    expect(finalized.commitment).toBeTruthy()
  })

  test('Programs routes return valid DTOs and envelope', async () => {
    // POST /api/v1/programs
    const createRes = await createProgram(req({
      code: 'BLT-2026',
      name: 'BLT Desa 2026',
      description: 'Bantuan Langsung Tunai',
      fundSource: 'Dana Desa',
      kind: 'TUNAI',
      amountPerRecipient: 300000,
      totalBudget: 30000000,
      startPeriod: 202601,
      endPeriod: 202612,
      isPublic: true,
    }, 'POST', '/api/v1/programs'))
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(programDtoSchema.parse(created)).toEqual(created)
    expect(created.status).toBe('DRAFT')

    const progId = created.id

    // GET /api/v1/programs
    const listRes = await listPrograms(req(undefined, 'GET', '/api/v1/programs'))
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    expect(listEnvelope(programDtoSchema).parse(listData)).toEqual(listData)

    // GET /api/v1/programs/:id
    const detailRes = await getProgram(req(undefined, 'GET', `/api/v1/programs/${progId}`), { params: Promise.resolve({ id: progId }) })
    expect(detailRes.status).toBe(200)
    const detailData = await detailRes.json()
    expect(programDtoSchema.extend({ summary: z.unknown() }).parse(detailData)).toEqual(detailData)

    // PATCH /api/v1/programs/:id
    const patchRes = await updateProgram(req({ name: 'BLT Desa 2026 Revisi' }, 'PATCH', `/api/v1/programs/${progId}`), { params: Promise.resolve({ id: progId }) })
    expect(patchRes.status).toBe(200)
    const patched = await patchRes.json()
    expect(programDtoSchema.parse(patched)).toEqual(patched)
    expect(patched.name).toBe('BLT Desa 2026 Revisi')

    // POST /api/v1/programs/:id/activate-intent
    const activateIntentRes = await activateProgram(req({}, 'POST', `/api/v1/programs/${progId}/activate-intent`), { params: Promise.resolve({ id: progId }) })
    expect(activateIntentRes.status).toBe(200)
    const activateData = await activateIntentRes.json()
    expect(z.object({ to: z.string(), chainId: z.number(), data: z.string() }).parse(activateData)).toEqual(activateData)
  })

  test('Reports & Dashboard return valid DTOs', async () => {
    // GET /api/v1/dashboard/summary
    vi.spyOn(chainVerifier, 'walletStatus').mockResolvedValue({
      authorizedWallet: contract,
      owner: contract,
      chainId: 1337,
      paused: false,
      networkOk: true,
    })

    vi.spyOn(networkMod, 'networkStatus').mockResolvedValue({
      status: 'Normal',
      latestBlock: 100,
      timestamp: Math.floor(Date.now() / 1000),
      ageSeconds: 5,
      validatorCount: 1,
      validators: [{ address: contract, institution: 'Kelurahan' }],
    })

    const dashRes = await getDashboardSummary(req(undefined, 'GET', '/api/v1/dashboard/summary'))
    expect(dashRes.status).toBe(200)
    const dashData = await dashRes.json()
    expect(dashboardSummaryDtoSchema.parse(dashData)).toEqual(dashData)

    // GET /api/v1/reports/realization
    const realRes = await getRealizationReport(req(undefined, 'GET', '/api/v1/reports/realization'))
    expect(realRes.status).toBe(200)
    const realData = await realRes.json()
    expect(realizationReportDtoSchema.parse(realData)).toEqual(realData)

    // GET /api/v1/reports/reconciliation
    const recRes = await getReconciliationReport(req(undefined, 'GET', '/api/v1/reports/reconciliation'))
    expect(recRes.status).toBe(200)
    const recData = await recRes.json()
    expect(reconciliationDtoSchema.parse(recData)).toEqual(recData)

    // GET /api/v1/wallet/status
    const walRes = await getWalletStatus(req(undefined, 'GET', '/api/v1/wallet/status'))
    expect(walRes.status).toBe(200)
    const walData = await walRes.json()
    expect(walletStatusDtoSchema.parse(walData)).toEqual(walData)

    // GET /api/v1/network/status
    const netRes = await networkStatusRoute(req(undefined, 'GET', '/api/v1/network/status'))
    expect(netRes.status).toBe(200)
    const netData = await netRes.json()
    expect(networkStatusDtoSchema.parse(netData)).toEqual(netData)
  })

  test('Audit logs list returns envelope of AuditLogDto', async () => {
    await AuditLogs.create({
      seq: 1,
      prevHash: '0'.repeat(64),
      hash: '1'.repeat(64),
      actorId: userId,
      role: 'OPERATOR',
      action: 'LOGIN',
      entity: 'users',
      entityId: userId,
      diff: null,
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      requestId: 'test-req',
      at: new Date(),
    })

    const res = await getAuditLogs(req(undefined, 'GET', '/api/v1/audit-logs'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(listEnvelope(auditLogDtoSchema).parse(data)).toEqual(data)
    expect(data.total).toBe(1)
  })

  test('Public routes return valid structures', async () => {
    const sumRes = await publicSummaryRoute(req(undefined, 'GET', '/api/v1/public/summary'))
    expect(sumRes.status).toBe(200)
    const sumData = await sumRes.json()
    expect(z.object({ programs: z.number(), budget: z.number(), transactions: z.number(), amount: z.number() }).parse(sumData)).toEqual(sumData)

    const progRes = await publicProgramsRoute(req(undefined, 'GET', '/api/v1/public/programs'))
    expect(progRes.status).toBe(200)
    const progData = await progRes.json()
    expect(listEnvelope(z.object({ code: z.string(), name: z.string() }).passthrough()).parse(progData)).toEqual(progData)
  })

  test('Problem JSON conforms to ProblemDto schema on 404 / 401', async () => {
    const notFoundRes = await getRecipient(req(undefined, 'GET', '/api/v1/recipients/507f1f77bcf86cd799439099'), { params: Promise.resolve({ id: '507f1f77bcf86cd799439099' }) })
    expect(notFoundRes.status).toBe(404)
    const errData = await notFoundRes.json()
    expect(problemDtoSchema.parse(errData)).toEqual(errData)
    expect(errData.code).toBe('NOT_FOUND')
    expect(errData.requestId).toBeTruthy()
  })
})

