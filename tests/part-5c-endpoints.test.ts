import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { Wallet } from 'ethers'
import {
  models,
  Users,
  Recipients,
  Programs,
  Enrollments,
  Disbursements,
  AuditLogs,
} from '@/lib/db/models'
import { connectDatabase } from '@/lib/db/connection'
import { encryptNik, maskNik, nikBlindIndex } from '@/lib/crypto/nik'
import { ledgerInterface } from '@/lib/blockchain/abi'
import { programIdFromCode, refIdFromDataId } from '@/lib/blockchain/chain-keys'
import { recipientCommitment } from '@/lib/blockchain/identity-hash'
import { createSession, rotateSession, tokenHash, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { chainVerifier } from '@/modules/chain/verifier'
import {
  disbursementPreflightDtoSchema,
  disbursementTxIntentDtoSchema,
  listEnvelope,
  problemDtoSchema,
  recipientDtoSchema,
  PREFLIGHT_CHECK_KEYS,
} from '@/lib/api-contract/dto'

import { POST as preflightRoute } from '@/app/api/v1/disbursements/preflight/route'
import { POST as txIntentRoute } from '@/app/api/v1/disbursements/[id]/tx-intent/route'
import { GET as listRecipientsRoute } from '@/app/api/v1/recipients/route'
import { POST as searchRecipientsRoute } from '@/app/api/v1/recipients/search/route'

const jar = vi.hoisted(() => new Map<string, string>())
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
  }),
}))

const origin = 'https://example.test'
const contractAddress = '0x' + '1'.repeat(40)
const officialWallet = Wallet.createRandom().address
const otherWallet = Wallet.createRandom().address
const validNik = '7305010101900001'
const unindexedValidNik = '7305010101900099'
const originalEnv = { ...process.env }

let mongo: MongoMemoryServer
let passwordHash: string

function req(body?: unknown, method = 'POST', path = '/api/v1/test') {
  return new Request(origin + path, {
    method,
    headers: { origin, 'content-type': 'application/json' },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
  })
}

async function signInAs(
  role: 'OPERATOR' | 'KECAMATAN' | 'DINAS_SOSIAL' = 'OPERATOR',
  walletAddress: string | null = officialWallet,
) {
  const user = await Users.create({
    username: `${role.toLowerCase()}-${Date.now()}-${Math.random()}`,
    email: `${role.toLowerCase()}-${Math.random()}@kelurahan.test`,
    passwordHash,
    role,
    name: `Petugas ${role}`,
    institution: 'Kelurahan Takkalasi',
    isActive: true,
    mustChangePassword: false,
  })
  const rawToken = await createSession(String(user._id))
  if (walletAddress) {
    const rotated = await rotateSession(tokenHash(rawToken), walletAddress)
    jar.set(SESSION_COOKIE_NAME, rotated.token)
  } else {
    jar.set(SESSION_COOKIE_NAME, rawToken)
  }
  return user
}

async function seedAllGreenFixture() {
  const recipient = await Recipients.create({
    nikEnc: encryptNik(validNik),
    nikBlindIndex: nikBlindIndex(validNik),
    nikMasked: maskNik(validNik),
    name: 'Siti Aminah',
    address: { dusun: 'Takkalasi Utara', rt: '02', rw: '01' },
    phone: '081234567890',
    status: 'FINAL',
    commitment: recipientCommitment(validNik),
    finalizedAt: new Date('2026-01-10T00:00:00Z'),
  })

  const program = await Programs.create({
    code: 'BLT-DD-2026',
    programId: programIdFromCode('BLT-DD-2026'),
    name: 'BLT Dana Desa 2026',
    description: 'Bantuan Langsung Tunai Dana Desa',
    fundSource: 'APBDes',
    kind: 'TUNAI',
    amountPerRecipient: 600000,
    totalBudget: 60000000,
    startPeriod: 202601,
    endPeriod: 202612,
    status: 'ACTIVE',
    isPublic: true,
  })

  const enrollment = await Enrollments.create({
    programId: program._id,
    recipientId: recipient._id,
    status: 'REGISTERED_ONCHAIN',
    registerTxHash: '0x' + 'a'.repeat(64),
  })

  return { recipient, program, enrollment }
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    binary: { version: '7.0.24' },
    instance: { dbName: 'part_5c_endpoints_test' },
  })
  Object.assign(process.env, {
    MONGODB_URI: mongo.getUri(),
    APP_BASE_URL: origin,
    APP_TRUST_PROXY: 'false',
    AUTH_REQUIRE_TOTP: 'false',
    NIK_ENC_KEY: '11'.repeat(32),
    NIK_INDEX_KEY: 'test-index-key'.repeat(4),
    COMMITMENT_PEPPER: '22'.repeat(32),
    TURNSTILE_SECRET: 'test-turnstile-secret',
    CRON_SECRET: 'test-cron-secret'.repeat(3),
    NEXT_PUBLIC_CHAIN_ID: '250204',
    NEXT_PUBLIC_CONTRACT_ADDRESS: contractAddress,
    RPC_URL_SERVER: 'https://rpc.example.test',
  })
  await connectDatabase()
  for (const model of models) {
    await model.createCollection()
    await model.createIndexes()
  }
  passwordHash = await hashPassword('Synthetic-pass-123!', 'operator', 'op@kelurahan.test')
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongo?.stop()
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key]
  }
  Object.assign(process.env, originalEnv)
  delete (globalThis as { bansosMongo?: unknown }).bansosMongo
})

beforeEach(async () => {
  jar.clear()
  vi.restoreAllMocks()
  await Promise.all(models.map(m => m.collection.deleteMany({})))
  vi.spyOn(chainVerifier, 'walletStatus').mockResolvedValue({
    authorizedWallet: officialWallet,
    owner: officialWallet,
    chainId: 250204,
    paused: false,
    networkOk: true,
  })
})

describe('Part 5C — POST /api/v1/disbursements/preflight', () => {
  test('all-green case returns ok=true with 7 green checks and persists nothing', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()

    const res = await preflightRoute(
      req(
        { programId: String(program._id), period: 202606, recipientId: String(recipient._id) },
        'POST',
        '/api/v1/disbursements/preflight',
      ),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(true)
    expect(body.checks.map(c => c.key)).toEqual([...PREFLIGHT_CHECK_KEYS])
    expect(body.checks.every(c => c.ok && c.message === undefined)).toBe(true)

    // Persists nothing: no Disbursements and no AuditLogs written
    expect(await Disbursements.countDocuments()).toBe(0)
    expect(await AuditLogs.countDocuments()).toBe(0)
  })

  test('failing check 1/7: program_active fails with PRD 10.4 message when program is CLOSED', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()
    await Programs.updateOne({ _id: program._id }, { $set: { status: 'CLOSED' } })

    const res = await preflightRoute(
      req({ programId: String(program._id), period: 202606, recipientId: String(recipient._id) }),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(false)
    const failed = body.checks.filter(c => !c.ok)
    expect(failed).toEqual([
      {
        key: 'program_active',
        label: 'Program aktif',
        ok: false,
        message: 'Periode di luar masa program atau program sudah ditutup.',
      },
    ])
  })

  test('failing check 2/7: period_in_range fails with PRD 10.4 message when period is out of range', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()

    const res = await preflightRoute(
      req({ programId: String(program._id), period: 202701, recipientId: String(recipient._id) }),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(false)
    const failed = body.checks.filter(c => !c.ok)
    expect(failed).toEqual([
      {
        key: 'period_in_range',
        label: 'Periode dalam rentang program',
        ok: false,
        message: 'Periode di luar masa program atau program sudah ditutup.',
      },
    ])
  })

  test('failing check 3/7: recipient_registered fails with PRD 10.4 message when not REGISTERED_ONCHAIN', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program, enrollment } = await seedAllGreenFixture()
    await Enrollments.updateOne({ _id: enrollment._id }, { $set: { status: 'ENROLLED' } })

    const res = await preflightRoute(
      req({ programId: String(program._id), period: 202606, recipientId: String(recipient._id) }),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(false)
    const failed = body.checks.filter(c => !c.ok)
    expect(failed).toEqual([
      {
        key: 'recipient_registered',
        label: 'Penerima terdaftar on-chain',
        ok: false,
        message: 'Penerima belum terdaftar pada program ini di blockchain.',
      },
    ])
  })

  test('failing check 4/7: no_duplicate fails with PRD 10.4 message when PENDING or SUCCESS exists', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()
    const existingId = new mongoose.Types.ObjectId()
    await Disbursements.create({
      _id: existingId,
      refId: refIdFromDataId(String(existingId)),
      programId: program._id,
      recipientId: recipient._id,
      periodId: 202606,
      commitment: recipient.commitment,
      amount: program.amountPerRecipient,
      status: 'SUCCESS',
    })

    const res = await preflightRoute(
      req({ programId: String(program._id), period: 202606, recipientId: String(recipient._id) }),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(false)
    const failed = body.checks.filter(c => !c.ok)
    expect(failed).toEqual([
      {
        key: 'no_duplicate',
        label: 'Duplikasi periode',
        ok: false,
        message: 'Penerima ini sudah menerima bantuan untuk program dan periode yang sama.',
      },
    ])
  })

  test('failing check 5/7: amount_matches_program fails with PRD 10.4 message on mismatched draft or zero nominal', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()
    const draftId = new mongoose.Types.ObjectId()
    await Disbursements.create({
      _id: draftId,
      refId: refIdFromDataId(String(draftId)),
      programId: program._id,
      recipientId: recipient._id,
      periodId: 202606,
      commitment: recipient.commitment,
      amount: 500000, // Mismatched with program.amountPerRecipient (600000)
      status: 'DRAFT',
    })

    const res = await preflightRoute(
      req({ programId: String(program._id), period: 202606, recipientId: String(recipient._id) }),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(false)
    const failed = body.checks.filter(c => !c.ok)
    expect(failed).toEqual([
      {
        key: 'amount_matches_program',
        label: 'Kesesuaian nominal',
        ok: false,
        message: 'Nominal tidak sesuai ketentuan program.',
      },
    ])
  })

  test('failing check 6/7: recipient_final_commitment fails with PRD 10.4 message when recipient is DRAFT or lacks commitment', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()
    await Recipients.updateOne(
      { _id: recipient._id },
      { $set: { status: 'DRAFT' }, $unset: { commitment: 1 } },
    )

    const res = await preflightRoute(
      req({ programId: String(program._id), period: 202606, recipientId: String(recipient._id) }),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(false)
    const failed = body.checks.filter(c => !c.ok)
    expect(failed).toEqual([
      {
        key: 'recipient_final_commitment',
        label: 'Status FINAL & commitment penerima',
        ok: false,
        message: 'Penerima belum terdaftar pada program ini di blockchain.',
      },
    ])
  })

  test('failing check 7/7: authorized_wallet fails with PRD 10.4 message when session wallet differs from official Kelurahan wallet', async () => {
    await signInAs('OPERATOR', otherWallet)
    const { recipient, program } = await seedAllGreenFixture()

    const res = await preflightRoute(
      req({ programId: String(program._id), period: 202606, recipientId: String(recipient._id) }),
    )
    expect(res.status).toBe(200)
    const body = disbursementPreflightDtoSchema.parse(await res.json())
    expect(body.ok).toBe(false)
    const failed = body.checks.filter(c => !c.ok)
    expect(failed).toEqual([
      {
        key: 'authorized_wallet',
        label: 'Kewenangan wallet Kelurahan',
        ok: false,
        message: 'Wallet yang dipakai bukan wallet resmi Kelurahan. Ganti akun di MetaMask.',
      },
    ])
  })
})

describe('Part 5C — POST /api/v1/disbursements/:id/tx-intent', () => {
  test('requires >= 1 ACTIVE evidence (returns 409 EVIDENCE_REQUIRED when none or withdrawn)', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()

    const disbId = new mongoose.Types.ObjectId()
    await Disbursements.create({
      _id: disbId,
      refId: refIdFromDataId(String(disbId)),
      programId: program._id,
      recipientId: recipient._id,
      periodId: 202606,
      commitment: recipient.commitment,
      amount: program.amountPerRecipient,
      status: 'DRAFT',
      evidence: [
        {
          cid: 'bafy' + 'c'.repeat(50),
          mime: 'application/pdf',
          size: 512,
          sha256: 'd'.repeat(64),
          name: 'withdrawn.pdf',
          access: 'PUBLIC',
          status: 'WITHDRAWN',
        },
      ],
    })

    const res = await txIntentRoute(
      req({}, 'POST', `/api/v1/disbursements/${disbId}/tx-intent`),
      { params: Promise.resolve({ id: String(disbId) }) },
    )
    expect(res.status).toBe(409)
    const problem = problemDtoSchema.parse(await res.json())
    expect(problem.code).toBe('EVIDENCE_REQUIRED')
  })

  test.each(['PENDING', 'SUCCESS', 'FAILED'] as const)(
    'allows DRAFT only (returns 409 IMMUTABLE_RECORD when status is %s)',
    async status => {
      await signInAs('OPERATOR', officialWallet)
      const { recipient, program } = await seedAllGreenFixture()

      const disbId = new mongoose.Types.ObjectId()
      await Disbursements.create({
        _id: disbId,
        refId: refIdFromDataId(String(disbId)),
        programId: program._id,
        recipientId: recipient._id,
        periodId: 202606,
        commitment: recipient.commitment,
        amount: program.amountPerRecipient,
        status,
        evidence: [
          {
            cid: 'bafy' + 'a'.repeat(50),
            mime: 'application/pdf',
            size: 1024,
            sha256: 'b'.repeat(64),
            name: 'bukti.pdf',
            access: 'PUBLIC',
            status: 'ACTIVE',
          },
        ],
      })

      const res = await txIntentRoute(
        req({}, 'POST', `/api/v1/disbursements/${disbId}/tx-intent`),
        { params: Promise.resolve({ id: String(disbId) }) },
      )
      expect(res.status).toBe(409)
      const problem = problemDtoSchema.parse(await res.json())
      expect(problem.code).toBe('IMMUTABLE_RECORD')
    },
  )

  test('encodes recordDisbursement calldata on server with ABI and decodes to expected arguments', async () => {
    await signInAs('OPERATOR', officialWallet)
    const { recipient, program } = await seedAllGreenFixture()

    const disbId = new mongoose.Types.ObjectId()
    const expectedRefId = refIdFromDataId(String(disbId))
    const expectedCid = 'bafy' + 'e'.repeat(50)
    await Disbursements.create({
      _id: disbId,
      refId: expectedRefId,
      programId: program._id,
      recipientId: recipient._id,
      periodId: 202606,
      commitment: recipient.commitment,
      amount: program.amountPerRecipient,
      status: 'DRAFT',
      evidence: [
        {
          cid: expectedCid,
          mime: 'image/jpeg',
          size: 2048,
          sha256: 'f'.repeat(64),
          name: 'foto-penyerahan.jpg',
          access: 'PUBLIC',
          status: 'ACTIVE',
        },
      ],
    })

    const res = await txIntentRoute(
      req({}, 'POST', `/api/v1/disbursements/${disbId}/tx-intent`),
      { params: Promise.resolve({ id: String(disbId) }) },
    )
    expect(res.status).toBe(200)
    const body = disbursementTxIntentDtoSchema.parse(await res.json())
    expect(body.to).toBe(contractAddress)
    expect(body.chainId).toBe(250204)
    expect(body.evidenceCid).toBe(expectedCid)

    const parsed = ledgerInterface.parseTransaction({ data: body.data })
    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe('recordDisbursement')
    const tuple = parsed!.args[0]
    expect(tuple.refId).toBe(expectedRefId)
    expect(tuple.programId).toBe(program.programId)
    expect(tuple.periodId).toBe(BigInt(202606))
    expect(tuple.recipientCommitment).toBe(recipient.commitment)
    expect(tuple.amount).toBe(BigInt(600000))
    expect(tuple.evidenceCid).toBe(expectedCid)
  })

  test.each(['KECAMATAN', 'DINAS_SOSIAL'] as const)(
    'non-signing role %s receives 403 FORBIDDEN_PERMISSION',
    async role => {
      await signInAs(role, null)
      const fakeId = String(new mongoose.Types.ObjectId())
      const res = await txIntentRoute(
        req({}, 'POST', `/api/v1/disbursements/${fakeId}/tx-intent`),
        { params: Promise.resolve({ id: fakeId }) },
      )
      expect(res.status).toBe(403)
      const problem = problemDtoSchema.parse(await res.json())
      expect(problem.code).toBe('FORBIDDEN_PERMISSION')
    },
  )
})

describe('Part 5C — POST /api/v1/recipients/search & NIK_IN_QUERY', () => {
  test('POST /api/v1/recipients/search returns list envelope when found, empty when not found, and never writes NIK to audit log', async () => {
    await signInAs('KECAMATAN', null) // Read role has recipient:read permission
    const { recipient } = await seedAllGreenFixture()

    // 1. Found via blind index
    const foundRes = await searchRecipientsRoute(
      req({ nik: validNik }, 'POST', '/api/v1/recipients/search'),
    )
    expect(foundRes.status).toBe(200)
    const foundBody = listEnvelope(recipientDtoSchema).parse(await foundRes.json())
    expect(foundBody.total).toBe(1)
    expect(foundBody.totalPages).toBe(1)
    expect(foundBody.data).toHaveLength(1)
    expect(foundBody.data[0].id).toBe(String(recipient._id))
    expect(foundBody.data[0].nikMasked).toBe(maskNik(validNik))
    expect(foundBody.data[0].enrollments).toEqual([
      { programCode: 'BLT-DD-2026', status: 'REGISTERED_ONCHAIN' },
    ])
    expect(JSON.stringify(foundBody)).not.toContain(validNik)

    // 2. Not found (valid NIK format not in database)
    const notFoundRes = await searchRecipientsRoute(
      req({ nik: unindexedValidNik }, 'POST', '/api/v1/recipients/search'),
    )
    expect(notFoundRes.status).toBe(200)
    const notFoundBody = listEnvelope(recipientDtoSchema).parse(await notFoundRes.json())
    expect(notFoundBody).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    })

    // 3. Audit log never contains raw NIK
    const auditLogs = await AuditLogs.find({ action: 'RECIPIENT_NIK_SEARCH' }).lean()
    expect(auditLogs).toHaveLength(2)
    const serializedAudit = JSON.stringify(auditLogs)
    expect(serializedAudit).not.toContain(validNik)
    expect(serializedAudit).not.toContain(unindexedValidNik)
  })

  test('GET /api/v1/recipients rejects 16-digit q or search query parameters with HTTP 400 NIK_IN_QUERY', async () => {
    await signInAs('OPERATOR', officialWallet)
    await seedAllGreenFixture()

    for (const queryString of [
      `?q=${validNik}`,
      `?q=0000000000000000`,
      `?search=${validNik}`,
      `?nik=${validNik}`,
    ]) {
      const res = await listRecipientsRoute(
        req(undefined, 'GET', `/api/v1/recipients${queryString}`),
      )
      expect(res.status, queryString).toBe(400)
      const problem = problemDtoSchema.parse(await res.json())
      expect(problem.code).toBe('NIK_IN_QUERY')
      expect(problem.message).toBe('NIK tidak boleh dikirim melalui URL; gunakan pencarian POST.')
    }

    // Normal name query via q still succeeds
    const okRes = await listRecipientsRoute(
      req(undefined, 'GET', '/api/v1/recipients?q=Siti'),
    )
    expect(okRes.status).toBe(200)
    const okBody = listEnvelope(recipientDtoSchema).parse(await okRes.json())
    expect(okBody.total).toBe(1)
    expect(okBody.data[0].name).toBe('Siti Aminah')
  })
})

