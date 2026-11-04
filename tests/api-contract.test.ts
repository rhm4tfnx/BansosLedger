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
  programEnrollmentItemDtoSchema,
  disbursementDtoSchema,
  disbursementCreatedDtoSchema,
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
  safeEventDtoSchema,
  explorerBlockDtoSchema,
  explorerBlockListDtoSchema,
  explorerTxDtoSchema,
  explorerAddressDtoSchema,
  explorerContractDtoSchema,
  explorerValidatorsDtoSchema,
  explorerSearchDtoSchema,
  publicSummaryDtoSchema,
  publicProgramDtoSchema,
  publicProgramDetailDtoSchema,
  publicStatusCheckDtoSchema,
  loginResultDtoSchema,
  logoutResultDtoSchema,
  changePasswordResultDtoSchema,
  mfaVerifyResultDtoSchema,
  walletNonceDtoSchema,
  walletBindDtoSchema,
  cronReconcileDtoSchema,
  withdrawEvidenceDtoSchema,
} from '@/lib/api-contract/dto'

import { GET as getAuditLogs } from '@/app/api/v1/audit-logs/route'
import { GET as verifyAuditLogs } from '@/app/api/v1/audit-logs/verify/route'
import { POST as authChangePasswordRoute } from '@/app/api/v1/auth/change-password/route'
import { POST as authLoginRoute } from '@/app/api/v1/auth/login/route'
import { POST as authLogoutRoute } from '@/app/api/v1/auth/logout/route'
import { GET as getAuthMe } from '@/app/api/v1/auth/me/route'
import { POST as authMfaVerifyRoute } from '@/app/api/v1/auth/mfa/verify/route'
import { POST as authWalletBindRoute } from '@/app/api/v1/auth/wallet/bind/route'
import { POST as authWalletNonceRoute } from '@/app/api/v1/auth/wallet/nonce/route'
import { POST as cronReconcileRoute } from '@/app/api/v1/cron/reconcile/route'
import { GET as getDashboardSummary } from '@/app/api/v1/dashboard/summary/route'
import { GET as listDisbursements, POST as createDisbursement } from '@/app/api/v1/disbursements/route'
import { GET as getDisbursement, DELETE as deleteDisbursement } from '@/app/api/v1/disbursements/[id]/route'
import { POST as confirmDisbursement } from '@/app/api/v1/disbursements/[id]/confirm/route'
import { GET as getPublicEvidence } from '@/app/api/v1/disbursements/[id]/evidence/route'
import { POST as withdrawEvidenceRoute } from '@/app/api/v1/disbursements/[id]/evidence/[cid]/withdraw/route'
import { POST as retryDisbursement } from '@/app/api/v1/disbursements/[id]/retry/route'
import { PATCH as submitDisbursementTx } from '@/app/api/v1/disbursements/[id]/tx-submitted/route'
import { GET as explorerAddressRoute } from '@/app/api/v1/explorer/address/[addr]/route'
import { GET as explorerBlocksRoute } from '@/app/api/v1/explorer/blocks/route'
import { GET as explorerBlockDetailRoute } from '@/app/api/v1/explorer/blocks/[n]/route'
import { GET as explorerContractRoute } from '@/app/api/v1/explorer/contract/route'
import { GET as explorerSearchRoute } from '@/app/api/v1/explorer/search/route'
import { GET as explorerTxRoute } from '@/app/api/v1/explorer/tx/[hash]/route'
import { GET as explorerValidatorsRoute } from '@/app/api/v1/explorer/validators/route'
import { GET as healthRoute } from '@/app/api/v1/health/route'
import { GET as healthReadyRoute } from '@/app/api/v1/health/ready/route'
import { GET as networkStatusRoute } from '@/app/api/v1/network/status/route'
import { GET as listPrograms, POST as createProgram } from '@/app/api/v1/programs/route'
import { GET as getProgram, PATCH as updateProgram } from '@/app/api/v1/programs/[id]/route'
import { POST as activateProgram } from '@/app/api/v1/programs/[id]/activate-intent/route'
import { POST as chainConfirmProgramRoute } from '@/app/api/v1/programs/[id]/chain-confirm/route'
import { POST as closeProgram } from '@/app/api/v1/programs/[id]/close-intent/route'
import { GET as listProgramEnrollments, POST as enrollRecipients } from '@/app/api/v1/programs/[id]/enrollments/route'
import { POST as registerIntent } from '@/app/api/v1/programs/[id]/register-intent/route'
import { GET as publicProgramsRoute } from '@/app/api/v1/public/programs/route'
import { GET as publicProgramRoute } from '@/app/api/v1/public/programs/[code]/route'
import { POST as publicStatusCheckRoute } from '@/app/api/v1/public/status-check/route'
import { GET as publicSummaryRoute } from '@/app/api/v1/public/summary/route'
import { GET as listRecipients, POST as createRecipient } from '@/app/api/v1/recipients/route'
import { GET as getRecipient, PATCH as updateRecipient, DELETE as deleteRecipient } from '@/app/api/v1/recipients/[id]/route'
import { POST as finalizeRecipient } from '@/app/api/v1/recipients/[id]/finalize/route'
import { POST as revealNik } from '@/app/api/v1/recipients/[id]/reveal-nik/route'
import { GET as reportsExportRoute } from '@/app/api/v1/reports/export/route'
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

    // GET /api/v1/programs/:id/enrollments
    const enrollListRes = await listProgramEnrollments(req(undefined, 'GET', `/api/v1/programs/${progId}/enrollments`), { params: Promise.resolve({ id: progId }) })
    expect(enrollListRes.status).toBe(200)
    const enrollListData = await enrollListRes.json()
    expect(listEnvelope(programEnrollmentItemDtoSchema).parse(enrollListData)).toEqual(enrollListData)
  })

  test('Disbursements create, list and detail routes return enriched DTOs', async () => {
    const prog = await Programs.create({
      code: 'DISB-2026',
      programId: '0x' + 'd'.repeat(64),
      name: 'Program Penyaluran 2026',
      fundSource: 'APBD',
      kind: 'TUNAI',
      amountPerRecipient: 600000,
      totalBudget: 6000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
      isPublic: true,
    })
    const rec = await Recipients.create({
      nikEnc: encryptNik(nik),
      nikBlindIndex: nikBlindIndex(nik),
      nikMasked: '7305••••••••0001',
      name: 'Penerima Bantuan',
      address: { dusun: 'Dusun II', rt: '02', rw: '01' },
      status: 'FINAL',
      commitment: recipientCommitment(nik),
    })
    await Enrollments.create({
      programId: prog._id,
      recipientId: rec._id,
      status: 'REGISTERED_ONCHAIN',
    })

    // POST /api/v1/disbursements
    const createRes = await createDisbursement(req({
      programId: String(prog._id),
      recipientId: String(rec._id),
      period: 202602,
      disbursedDate: '2026-02-15',
      note: 'Tahap Februari',
    }, 'POST', '/api/v1/disbursements'))
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(disbursementCreatedDtoSchema.parse(created)).toEqual(created)
    expect(created.program).toEqual({ id: String(prog._id), code: 'DISB-2026', name: 'Program Penyaluran 2026' })
    expect(created.recipient).toEqual({ id: String(rec._id), name: 'Penerima Bantuan', nikMasked: '7305••••••••0001' })

    // GET /api/v1/disbursements
    const listRes = await listDisbursements(req(undefined, 'GET', '/api/v1/disbursements'))
    expect(listRes.status).toBe(200)
    const listData = await listRes.json()
    expect(listEnvelope(disbursementDtoSchema).parse(listData)).toEqual(listData)
    expect(listData.data[0].program.code).toBe('DISB-2026')
    expect(listData.data[0].recipient.name).toBe('Penerima Bantuan')

    // GET /api/v1/disbursements/:id
    const detailRes = await getDisbursement(req(undefined, 'GET', `/api/v1/disbursements/${created.id}`), { params: Promise.resolve({ id: created.id }) })
    expect(detailRes.status).toBe(200)
    const detailData = await detailRes.json()
    expect(disbursementDtoSchema.parse(detailData)).toEqual(detailData)
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
    expect(publicSummaryDtoSchema.parse(sumData)).toEqual(sumData)

    const progRes = await publicProgramsRoute(req(undefined, 'GET', '/api/v1/public/programs'))
    expect(progRes.status).toBe(200)
    const progData = await progRes.json()
    expect(listEnvelope(publicProgramDtoSchema).parse(progData)).toEqual(progData)
  })

  test('Problem JSON conforms to ProblemDto schema on 404 / 401', async () => {
    const notFoundRes = await getRecipient(req(undefined, 'GET', '/api/v1/recipients/507f1f77bcf86cd799439099'), { params: Promise.resolve({ id: '507f1f77bcf86cd799439099' }) })
    expect(notFoundRes.status).toBe(404)
    const errData = await notFoundRes.json()
    expect(problemDtoSchema.parse(errData)).toEqual(errData)
    expect(errData.code).toBe('NOT_FOUND')
    expect(errData.requestId).toBeTruthy()
  })

  test('Auth and session routes return valid contract DTOs', async () => {
    vi.spyOn(networkMod, 'contractRead').mockResolvedValue(contract)

    // POST /api/v1/auth/change-password (run with existing valid session)
    const chRes = await authChangePasswordRoute(req({ currentPassword: 'Synthetic-pass-123!', newPassword: 'NewPassword999!xyz' }, 'POST', '/api/v1/auth/change-password'))
    expect(chRes.status).toBe(200)
    const chData = await chRes.json()
    expect(changePasswordResultDtoSchema.parse(chData)).toEqual(chData)

    // POST /api/v1/auth/login
    const loginRes = await authLoginRoute(req({ email: 'op@kelurahan.test', password: 'NewPassword999!xyz' }, 'POST', '/api/v1/auth/login'))
    expect(loginRes.status).toBe(200)
    const loginData = await loginRes.json()
    expect(loginResultDtoSchema.parse(loginData)).toEqual(loginData)

    // Re-create active session token for subsequent tests
    const newToken = await createSession(userId, { boundWalletAddress: contract })
    jar.set(SESSION_COOKIE_NAME, newToken)

    // POST /api/v1/auth/mfa/verify
    const mfaMod = await import('@/lib/auth/mfa')
    vi.spyOn(mfaMod, 'verifyUserMfa').mockResolvedValue(true)
    const mfaRes = await authMfaVerifyRoute(req({ totp: '123456' }, 'POST', '/api/v1/auth/mfa/verify'))
    expect(mfaRes.status).toBe(200)
    const mfaData = await mfaRes.json()
    expect(mfaVerifyResultDtoSchema.parse(mfaData)).toEqual(mfaData)

    // POST /api/v1/auth/wallet/nonce
    const { Wallet } = await import('ethers')
    const testWallet = Wallet.createRandom()
    vi.spyOn(networkMod, 'contractRead').mockResolvedValue(testWallet.address)

    const nonceRes = await authWalletNonceRoute(req({ address: testWallet.address, chainId: '0x539' }, 'POST', '/api/v1/auth/wallet/nonce'))
    expect(nonceRes.status).toBe(200)
    const nonceData = await nonceRes.json()
    expect(walletNonceDtoSchema.parse(nonceData)).toEqual(nonceData)

    // POST /api/v1/auth/wallet/bind
    const signature = await testWallet.signMessage(nonceData.message)
    const bindRes = await authWalletBindRoute(req({ address: testWallet.address, chainId: '0x539', signature }, 'POST', '/api/v1/auth/wallet/bind'))
    expect(bindRes.status).toBe(200)
    const bindData = await bindRes.json()
    expect(walletBindDtoSchema.parse(bindData)).toEqual(bindData)

    // POST /api/v1/auth/logout
    const logoutRes = await authLogoutRoute(req(undefined, 'POST', '/api/v1/auth/logout'))
    expect(logoutRes.status).toBe(200)
    const logoutData = await logoutRes.json()
    expect(logoutResultDtoSchema.parse(logoutData)).toEqual(logoutData)
  })

  test('Explorer routes return valid DTOs', async () => {
    const cfg = await import('@/modules/chain/config')
    const mockBlock = {
      number: 10,
      hash: '0x' + 'b'.repeat(64),
      parentHash: '0x' + 'c'.repeat(64),
      timestamp: 1700000000,
      miner: contract,
      transactions: [],
    }
    const mockRpc = {
      getBlockNumber: vi.fn().mockResolvedValue(10),
      getBlock: vi.fn().mockResolvedValue(mockBlock),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        hash: txHash,
        from: contract,
        to: contract,
        blockNumber: 10,
        status: 1,
        logs: [],
      }),
    }
    vi.spyOn(cfg, 'provider').mockReturnValue(mockRpc as any)

    // GET /api/v1/explorer/blocks
    const blocksRes = await explorerBlocksRoute(req(undefined, 'GET', '/api/v1/explorer/blocks'))
    expect(blocksRes.status).toBe(200)
    const blocksData = await blocksRes.json()
    expect(explorerBlockListDtoSchema.parse(blocksData)).toEqual(blocksData)

    // GET /api/v1/explorer/blocks/[n]
    const blockRes = await explorerBlockDetailRoute(req(undefined, 'GET', '/api/v1/explorer/blocks/10'), { params: Promise.resolve({ n: '10' }) })
    expect(blockRes.status).toBe(200)
    const blockData = await blockRes.json()
    expect(explorerBlockDtoSchema.parse(blockData)).toEqual(blockData)

    // GET /api/v1/explorer/tx/[hash]
    const txRes = await explorerTxRoute(req(undefined, 'GET', `/api/v1/explorer/tx/${txHash}`), { params: Promise.resolve({ hash: txHash }) })
    expect(txRes.status).toBe(200)
    const txData = await txRes.json()
    expect(explorerTxDtoSchema.parse(txData)).toEqual(txData)

    // GET /api/v1/explorer/address/[addr]
    const addrRes = await explorerAddressRoute(req(undefined, 'GET', `/api/v1/explorer/address/${contract}`), { params: Promise.resolve({ addr: contract }) })
    expect(addrRes.status).toBe(200)
    const addrData = await addrRes.json()
    expect(explorerAddressDtoSchema.parse(addrData)).toEqual(addrData)

    // GET /api/v1/explorer/contract
    const contractRes = await explorerContractRoute(req(undefined, 'GET', '/api/v1/explorer/contract'))
    expect(contractRes.status).toBe(200)
    const contractData = await contractRes.json()
    expect(explorerContractDtoSchema.parse(contractData)).toEqual(contractData)

    // GET /api/v1/explorer/validators
    vi.spyOn(networkMod, 'networkStatus').mockResolvedValue({
      status: 'Normal',
      latestBlock: 100,
      timestamp: 1700000000,
      ageSeconds: 5,
      validatorCount: 1,
      validators: [{ address: contract, institution: 'Kelurahan' }],
    })
    const valRes = await explorerValidatorsRoute(req(undefined, 'GET', '/api/v1/explorer/validators'))
    expect(valRes.status).toBe(200)
    const valData = await valRes.json()
    expect(explorerValidatorsDtoSchema.parse(valData)).toEqual(valData)

    // GET /api/v1/explorer/search
    const searchRes = await explorerSearchRoute(req(undefined, 'GET', '/api/v1/explorer/search?q=10'))
    expect(searchRes.status).toBe(200)
    const searchData = await searchRes.json()
    expect(explorerSearchDtoSchema.parse(searchData)).toEqual(searchData)
  })

  test('Action routes (withdraw evidence, chain-confirm, reports export, cron reconcile) return valid DTOs', async () => {
    const { pinata } = await import('@/modules/evidence/pinata')
    vi.spyOn(pinata, 'unpin').mockResolvedValue(undefined as any)
    const prog = await Programs.create({ code: 'WITHDRAW-PROG', name: 'Withdraw Prog', status: 'ACTIVE', totalBudget: 1000000, amountPerRecipient: 100000, startPeriod: 202601, endPeriod: 202602 })
    const rec = await Recipients.create({ nikEnc: encryptNik(nik), nikBlindIndex: nikBlindIndex(nik), name: 'Withdraw Target', address: { dusun: 'Dus', rt: '01', rw: '01' }, status: 'FINAL' })
    const testCid = 'bafy' + 'c'.repeat(50)
    const disb = await Disbursements.create({
      refId: '0x' + '9'.repeat(64),
      programId: prog._id,
      recipientId: rec._id,
      periodId: 202601,
      amount: 100000,
      status: 'DRAFT',
      evidence: [{ cid: testCid, mime: 'image/jpeg', size: 1024, sha256: 'sha', name: 'ev.jpg', access: 'PUBLIC', status: 'ACTIVE', pinataId: 'pin123' }],
    })

    // POST /api/v1/disbursements/[id]/evidence/[cid]/withdraw
    const withdrawRes = await withdrawEvidenceRoute(req({ reason: 'Salah berkas unggahan' }, 'POST', `/api/v1/disbursements/${disb._id}/evidence/${testCid}/withdraw`), { params: Promise.resolve({ id: String(disb._id), cid: testCid }) })
    expect(withdrawRes.status).toBe(200)
    const withdrawData = await withdrawRes.json()
    expect(withdrawEvidenceDtoSchema.parse(withdrawData)).toEqual(withdrawData)

    // POST /api/v1/programs/[id]/chain-confirm
    const draftProg = await Programs.create({
      code: 'CONFIRM-PROG',
      name: 'Confirm Prog',
      programId: '0x' + 'b'.repeat(64),
      kind: 'TUNAI',
      status: 'DRAFT',
      totalBudget: 1000000,
      amountPerRecipient: 100000,
      startPeriod: 202601,
      endPeriod: 202602,
    })
    vi.spyOn(chainVerifier, 'verifyProgram').mockResolvedValue({
      status: 'CONFIRMED',
      receipt: { txHash, blockNumber: 10, logIndex: 0, blockTimestamp: new Date(), from: contract },
    })
    const confRes = await chainConfirmProgramRoute(req({ txHash, kind: 'create' }, 'POST', `/api/v1/programs/${draftProg._id}/chain-confirm`), { params: Promise.resolve({ id: String(draftProg._id) }) })
    expect(confRes.status).toBe(200)
    const confData = await confRes.json()
    expect(programDtoSchema.parse(confData)).toEqual(confData)

    // GET /api/v1/reports/export (CSV)
    const expRes = await reportsExportRoute(req(undefined, 'GET', '/api/v1/reports/export?format=csv'))
    expect(expRes.status).toBe(200)
    expect(expRes.headers.get('content-type')).toContain('text/csv')
    const text = await expRes.text()
    expect(text).toContain('Laporan realisasi penyaluran')

    // POST /api/v1/cron/reconcile
    const cfg = await import('@/modules/chain/config')
    const mockRpc = {
      getBlockNumber: vi.fn().mockResolvedValue(10),
      getLogs: vi.fn().mockResolvedValue([]),
    }
    vi.spyOn(cfg, 'provider').mockReturnValue(mockRpc as any)
    const cronReq = req(undefined, 'POST', '/api/v1/cron/reconcile')
    cronReq.headers.set('authorization', `Bearer ${process.env.CRON_SECRET}`)
    const cronRes = await cronReconcileRoute(cronReq)
    expect([200, 202]).toContain(cronRes.status)
    const cronData = await cronRes.json()
    expect(cronReconcileDtoSchema.parse(cronData)).toEqual(cronData)
  })

  test('Public status-check returns PublicStatusCheckDto', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ success: true, hostname: 'example.test' }))
    const statusRes = await publicStatusCheckRoute(req({ nik, turnstileToken: 'test-token' }, 'POST', '/api/v1/public/status-check'))
    expect(statusRes.status).toBe(200)
    const statusData = await statusRes.json()
    expect(publicStatusCheckDtoSchema.parse(statusData)).toEqual(statusData)
  })

  test('v1.ts security and error handling behaviors', async () => {
    const { asV1 } = await import('@/lib/auth/v1')

    // 1. Valid x-request-id accepted
    const validReq = new Request('https://example.test/api/v1/test', { headers: { 'x-request-id': 'custom-req-id-12345' } })
    const validRes = await asV1(async () => Response.json({ code: 'INVALID_SORT' }, { status: 400 }), validReq)
    expect(validRes.headers.get('x-request-id')).toBe('custom-req-id-12345')
    const validBody = await validRes.json()
    expect(validBody.requestId).toBe('custom-req-id-12345')

    // 2. Invalid x-request-id replaced by generated UUID
    const invalidReq = new Request('https://example.test/api/v1/test', { headers: { 'x-request-id': 'bad!' } })
    const invalidRes = await asV1(async () => Response.json({ code: 'INVALID_SORT' }, { status: 400 }), invalidReq)
    expect(invalidRes.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)

    // 3. Defaults message from getErrorInfo(code) when handler returns no message
    const noMsgRes = await asV1(async () => Response.json({ code: 'INVALID_SORT' }, { status: 400 }), validReq)
    const noMsgBody = await noMsgRes.json()
    expect(noMsgBody.message).toBe('Kolom pengurutan tidak valid.')

    // 4. Uses data.code only, ignores data.error as code
    const errCodeRes = await asV1(async () => Response.json({ error: 'LEGACY_ERROR', code: 'INVALID_INPUT' }, { status: 400 }), validReq)
    const errCodeBody = await errCodeRes.json()
    expect(errCodeBody.code).toBe('INVALID_INPUT')
  })

  test('Every v1 route is imported by a test file', async () => {
    const { readdirSync, readFileSync } = await import('node:fs')
    const routeRoot = 'src/app/api/v1'
    const allV1Routes = readdirSync(routeRoot, { recursive: true })
      .filter((name): name is string => typeof name === 'string' && name.endsWith('route.ts'))
      .map(name => name.replace(/\\/g, '/'))

    const testFiles = readdirSync('tests', { recursive: true })
      .filter((name): name is string => typeof name === 'string' && name.endsWith('.test.ts'))
      .map(file => readFileSync(`tests/${file}`, 'utf8'))
    const combinedTestCode = testFiles.join('\n')

    for (const routeFile of allV1Routes) {
      const cleanPath = routeFile.replace(/\/route\.ts$/, '').replace(/^route\.ts$/, '')
      const isImported = combinedTestCode.includes(routeFile) || combinedTestCode.includes(cleanPath)
      expect(isImported, `Route not imported in any test: src/app/api/v1/${routeFile}`).toBe(true)
    }
  })
})

