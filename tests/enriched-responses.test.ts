import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { models, Users, Recipients, Programs, Enrollments, Disbursements } from '@/lib/db/models'
import { encryptNik, maskNik, nikBlindIndex } from '@/lib/crypto/nik'
import { recipientCommitment } from '@/lib/blockchain/identity-hash'
import { programIdFromCode, refIdFromDataId } from '@/lib/blockchain/chain-keys'
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import * as networkMod from '@/modules/chain/network'
import { buildLast12Periods } from '@/modules/reports/service'
import {
  disbursementCreatedDtoSchema,
  disbursementDtoSchema,
  dashboardSummaryDtoSchema,
  listEnvelope,
  problemDtoSchema,
  programDtoSchema,
  programEnrollmentItemDtoSchema,
  recipientDtoSchema,
} from '@/lib/api-contract/dto'

import { GET as listDisbursements, POST as createDisbursement } from '@/app/api/v1/disbursements/route'
import { GET as getDisbursement } from '@/app/api/v1/disbursements/[id]/route'
import { GET as listPrograms } from '@/app/api/v1/programs/route'
import { GET as getProgram } from '@/app/api/v1/programs/[id]/route'
import { GET as listProgramEnrollments } from '@/app/api/v1/programs/[id]/enrollments/route'
import { GET as listRecipients } from '@/app/api/v1/recipients/route'
import { GET as getDashboardSummary } from '@/app/api/v1/dashboard/summary/route'

const jar = vi.hoisted(() => new Map<string, string>())
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
  }),
}))

const origin = 'https://example.test'
const contract = '0x' + '1'.repeat(40)
const originalEnv = { ...process.env }

let mongo: MongoMemoryServer
let userId: string

function makeNik(index: number): string {
  return `730501010190${String(index + 1).padStart(4, '0')}`
}

function req(body?: unknown, method = 'GET', path = '/api/v1/test') {
  return new Request(origin + path, {
    method,
    headers: { origin, 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

async function countMongoCommands<T>(fn: () => Promise<T>): Promise<{ result: T; commands: string[] }> {
  const commands: string[] = []
  const client = mongoose.connection.getClient()
  const onCommand = (event: { commandName: string }) => {
    commands.push(event.commandName)
  }
  client.on('commandStarted', onCommand)
  try {
    const result = await fn()
    return { result, commands }
  } finally {
    client.off('commandStarted', onCommand)
  }
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    binary: { version: '7.0.24' },
    instance: { dbName: 'enriched_responses_test' },
  })
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

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    delete (globalThis as { bansosMongo?: unknown }).bansosMongo
  }
  await mongoose.connect(mongo.getUri(), {
    monitorCommands: true,
    autoIndex: false,
    autoCreate: false,
    bufferCommands: false,
  })
  for (const model of models) {
    await model.createCollection()
    await model.createIndexes()
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  delete (globalThis as { bansosMongo?: unknown }).bansosMongo
  await mongo?.stop()
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key]
  }
  Object.assign(process.env, originalEnv)
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
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Part 5B - Enriched Responses & N+1 Prevention', () => {
  test('No N+1 queries: seeding 25 recipients, programs, enrollments and disbursements executes identical DB command counts at limit=5 vs limit=25', async () => {
    const programs = await Promise.all(
      Array.from({ length: 25 }, (_, i) => {
        const code = `PRG-N1-${String(i + 1).padStart(2, '0')}`
        return Programs.create({
          code,
          programId: programIdFromCode(code),
          name: `Program Sosial ${i + 1}`,
          fundSource: 'APBD',
          kind: 'TUNAI',
          amountPerRecipient: 300000,
          totalBudget: 30000000,
          startPeriod: 202601,
          endPeriod: 202612,
          status: 'ACTIVE',
          isPublic: true,
        })
      }),
    )
    const primaryProgram = programs[0]

    const recipients = await Promise.all(
      Array.from({ length: 25 }, (_, i) => {
        const nik = makeNik(i)
        return Recipients.create({
          nikEnc: encryptNik(nik),
          nikBlindIndex: nikBlindIndex(nik),
          nikMasked: maskNik(nik),
          name: `Warga Penerima ${String(i + 1).padStart(2, '0')}`,
          address: { dusun: 'Dusun I', rt: '01', rw: '01' },
          phone: '081234567890',
          status: 'FINAL',
          commitment: recipientCommitment(nik),
          finalizedAt: new Date('2026-01-05T00:00:00Z'),
        })
      }),
    )

    await Promise.all(
      recipients.map((rec, i) =>
        Enrollments.create({
          programId: primaryProgram._id,
          recipientId: rec._id,
          status: i % 2 === 0 ? 'REGISTERED_ONCHAIN' : 'ENROLLED',
          registerTxHash: i % 2 === 0 ? '0x' + String(i + 1).padStart(64, 'a') : undefined,
        }),
      ),
    )

    await Promise.all(
      recipients.map((rec, i) => {
        const id = new mongoose.Types.ObjectId()
        return Disbursements.create({
          _id: id,
          refId: refIdFromDataId(String(id)),
          programId: primaryProgram._id,
          recipientId: rec._id,
          periodId: 202601,
          commitment: rec.commitment,
          amount: 300000,
          disbursedDate: new Date('2026-01-20T00:00:00Z'),
          note: `Penyaluran ke-${i + 1}`,
          status: 'SUCCESS',
          evidence: [
            {
              cid: 'bafy' + String(i + 1).padStart(50, 'b'),
              mime: 'image/jpeg',
              size: 2048,
              sha256: String(i + 1).padStart(64, 'c'),
              name: 'bukti.jpg',
              access: 'PUBLIC',
              status: 'ACTIVE',
              pinataId: `pin-${i + 1}`,
            },
          ],
          chain: {
            txHash: '0x' + String(i + 1).padStart(64, 'd'),
            blockNumber: 100 + i,
            logIndex: 0,
            blockTimestamp: new Date('2026-01-20T01:00:00Z'),
            from: contract,
            confirmedAt: new Date('2026-01-20T01:01:00Z'),
          },
          attempts: [
            {
              at: new Date('2026-01-20T00:59:00Z'),
              txHash: '0x' + String(i + 1).padStart(64, 'd'),
              outcome: 'CONFIRMED',
              by: userId,
            },
          ],
        })
      }),
    )

    // 1. GET /api/v1/disbursements: limit=5 vs limit=25
    const disb5 = await countMongoCommands(() =>
      listDisbursements(req(undefined, 'GET', '/api/v1/disbursements?page=1&limit=5')),
    )
    const disb25 = await countMongoCommands(() =>
      listDisbursements(req(undefined, 'GET', '/api/v1/disbursements?page=1&limit=25')),
    )
    const disb5Body = listEnvelope(disbursementDtoSchema).parse(await disb5.result.json())
    const disb25Body = listEnvelope(disbursementDtoSchema).parse(await disb25.result.json())
    expect(disb5Body.data).toHaveLength(5)
    expect(disb25Body.data).toHaveLength(25)
    expect(disb5.commands.length).toBeGreaterThan(0)
    expect(disb25.commands.length).toBe(disb5.commands.length)

    // 2. GET /api/v1/recipients: limit=5 vs limit=25
    const rec5 = await countMongoCommands(() =>
      listRecipients(req(undefined, 'GET', '/api/v1/recipients?page=1&limit=5')),
    )
    const rec25 = await countMongoCommands(() =>
      listRecipients(req(undefined, 'GET', '/api/v1/recipients?page=1&limit=25')),
    )
    const rec5Body = listEnvelope(recipientDtoSchema).parse(await rec5.result.json())
    const rec25Body = listEnvelope(recipientDtoSchema).parse(await rec25.result.json())
    expect(rec5Body.data).toHaveLength(5)
    expect(rec25Body.data).toHaveLength(25)
    expect(rec5.commands.length).toBeGreaterThan(0)
    expect(rec25.commands.length).toBe(rec5.commands.length)

    // 3. GET /api/v1/programs: limit=5 vs limit=25
    const prog5 = await countMongoCommands(() =>
      listPrograms(req(undefined, 'GET', '/api/v1/programs?page=1&limit=5')),
    )
    const prog25 = await countMongoCommands(() =>
      listPrograms(req(undefined, 'GET', '/api/v1/programs?page=1&limit=25')),
    )
    const prog5Body = listEnvelope(programDtoSchema).parse(await prog5.result.json())
    const prog25Body = listEnvelope(programDtoSchema).parse(await prog25.result.json())
    expect(prog5Body.data).toHaveLength(5)
    expect(prog25Body.data).toHaveLength(25)
    expect(prog5.commands.length).toBeGreaterThan(0)
    expect(prog25.commands.length).toBe(prog5.commands.length)

    // 4. GET /api/v1/programs/:id/enrollments: limit=5 vs limit=25
    const progIdStr = String(primaryProgram._id)
    const enr5 = await countMongoCommands(() =>
      listProgramEnrollments(req(undefined, 'GET', `/api/v1/programs/${progIdStr}/enrollments?page=1&limit=5`), {
        params: Promise.resolve({ id: progIdStr }),
      }),
    )
    const enr25 = await countMongoCommands(() =>
      listProgramEnrollments(req(undefined, 'GET', `/api/v1/programs/${progIdStr}/enrollments?page=1&limit=25`), {
        params: Promise.resolve({ id: progIdStr }),
      }),
    )
    const enr5Body = listEnvelope(programEnrollmentItemDtoSchema).parse(await enr5.result.json())
    const enr25Body = listEnvelope(programEnrollmentItemDtoSchema).parse(await enr25.result.json())
    expect(enr5Body.data).toHaveLength(5)
    expect(enr25Body.data).toHaveLength(25)
    expect(enr5.commands.length).toBeGreaterThan(0)
    expect(enr25.commands.length).toBe(enr5.commands.length)
  })

  test('Disbursements list, detail and create embed program, recipient, evidence, attempts and chain without private keys', async () => {
    const nik = makeNik(0)
    const prog = await Programs.create({
      code: 'BLT-DESA',
      programId: programIdFromCode('BLT-DESA'),
      name: 'BLT Dana Desa',
      fundSource: 'Dana Desa',
      kind: 'TUNAI',
      amountPerRecipient: 600000,
      totalBudget: 12000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
      isPublic: true,
    })
    const rec = await Recipients.create({
      nikEnc: encryptNik(nik),
      nikBlindIndex: nikBlindIndex(nik),
      nikMasked: maskNik(nik),
      name: 'Siti Aminah',
      address: { dusun: 'Dusun Melati', rt: '03', rw: '02' },
      phone: '081299998888',
      status: 'FINAL',
      commitment: recipientCommitment(nik),
    })
    await Enrollments.create({
      programId: prog._id,
      recipientId: rec._id,
      status: 'REGISTERED_ONCHAIN',
    })

    // Create response (POST /api/v1/disbursements)
    const createRes = await createDisbursement(
      req(
        {
          programId: String(prog._id),
          recipientId: String(rec._id),
          period: 202603,
          disbursedDate: '2026-03-10',
          note: 'Penyaluran Maret',
        },
        'POST',
        '/api/v1/disbursements',
      ),
    )
    expect(createRes.status).toBe(201)
    const created = disbursementCreatedDtoSchema.parse(await createRes.json())
    expect(created.program).toEqual({
      id: String(prog._id),
      code: 'BLT-DESA',
      name: 'BLT Dana Desa',
    })
    expect(created.recipient).toEqual({
      id: String(rec._id),
      name: 'Siti Aminah',
      nikMasked: maskNik(nik),
    })
    expect(created.amount).toBe(600000)
    expect(created.evidence).toEqual([])
    expect(created.attempts).toEqual([])
    expect(created.chain).toBeNull()
    expect(JSON.stringify(created)).not.toContain(nik)

    // Seed an enriched disbursement with evidence, attempts & chain for GET list & detail
    const seededId = new mongoose.Types.ObjectId()
    const txHash = '0x' + '7'.repeat(64)
    await Disbursements.create({
      _id: seededId,
      refId: refIdFromDataId(String(seededId)),
      programId: prog._id,
      recipientId: rec._id,
      periodId: 202604,
      commitment: rec.commitment,
      amount: 600000,
      disbursedDate: new Date('2026-04-12T00:00:00Z'),
      note: 'Penyaluran April',
      status: 'SUCCESS',
      idempotencyKey: 'secret-idempotency-hash',
      requestHash: 'secret-request-hash',
      evidence: [
        {
          cid: 'bafy' + 'e'.repeat(50),
          mime: 'application/pdf',
          size: 4096,
          sha256: 'f'.repeat(64),
          name: 'berita-acara.pdf',
          access: 'PUBLIC',
          status: 'ACTIVE',
          pinataId: 'secret-pinata-id',
        },
      ],
      chain: {
        txHash,
        blockNumber: 222,
        logIndex: 1,
        blockTimestamp: new Date('2026-04-12T02:00:00Z'),
        from: contract,
        confirmedAt: new Date('2026-04-12T02:01:00Z'),
      },
      attempts: [
        {
          at: new Date('2026-04-12T01:59:00Z'),
          txHash,
          outcome: 'CONFIRMED',
          by: userId,
        },
      ],
    })

    // GET /api/v1/disbursements/:id
    const detailRes = await getDisbursement(req(undefined, 'GET', `/api/v1/disbursements/${seededId}`), {
      params: Promise.resolve({ id: String(seededId) }),
    })
    expect(detailRes.status).toBe(200)
    const detailJson = await detailRes.json()
    const detailDto = disbursementDtoSchema.parse(detailJson)
    expect(detailDto.program).toEqual({ id: String(prog._id), code: 'BLT-DESA', name: 'BLT Dana Desa' })
    expect(detailDto.recipient).toEqual({ id: String(rec._id), name: 'Siti Aminah', nikMasked: maskNik(nik) })
    expect(detailDto.evidence).toHaveLength(1)
    expect(detailDto.evidence[0].cid).toBe('bafy' + 'e'.repeat(50))
    expect(detailDto.attempts).toHaveLength(1)
    expect(detailDto.attempts[0].outcome).toBe('CONFIRMED')
    expect(detailDto.chain?.txHash).toBe(txHash)
    const serialized = JSON.stringify(detailJson)
    expect(serialized).not.toContain('secret-pinata-id')
    expect(serialized).not.toContain('secret-idempotency-hash')
    expect(serialized).not.toContain(nik)

    // GET /api/v1/disbursements
    const listRes = await listDisbursements(req(undefined, 'GET', '/api/v1/disbursements?status=SUCCESS'))
    expect(listRes.status).toBe(200)
    const listDto = listEnvelope(disbursementDtoSchema).parse(await listRes.json())
    expect(listDto.total).toBe(1)
    expect(listDto.data[0].id).toBe(String(seededId))
    expect(listDto.data[0].program.code).toBe('BLT-DESA')
    expect(listDto.data[0].recipient.name).toBe('Siti Aminah')
  })

  test('Programs list and detail compute remainingBudget from SUCCESS disbursements only (one seeded case per status)', async () => {
    const prog = await Programs.create({
      code: 'PKH-STATUS',
      programId: programIdFromCode('PKH-STATUS'),
      name: 'Program Uji Status Anggaran',
      fundSource: 'APBN',
      kind: 'TUNAI',
      amountPerRecipient: 500000,
      totalBudget: 2000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
      isPublic: true,
    })

    const statuses = ['DRAFT', 'PENDING', 'SUCCESS', 'FAILED'] as const
    const recs = await Promise.all(
      statuses.map((st, idx) => {
        const nik = makeNik(10 + idx)
        return Recipients.create({
          nikEnc: encryptNik(nik),
          nikBlindIndex: nikBlindIndex(nik),
          nikMasked: maskNik(nik),
          name: `Penerima ${st}`,
          address: { dusun: 'Dusun A', rt: '01', rw: '01' },
          status: 'FINAL',
          commitment: recipientCommitment(nik),
        })
      }),
    )

    // 4 enrollments total: 2 REGISTERED_ONCHAIN, 2 ENROLLED
    await Promise.all(
      recs.map((rec, idx) =>
        Enrollments.create({
          programId: prog._id,
          recipientId: rec._id,
          status: idx < 2 ? 'REGISTERED_ONCHAIN' : 'ENROLLED',
        }),
      ),
    )

    // Seed exactly 1 disbursement per status: DRAFT, PENDING, SUCCESS, FAILED
    await Promise.all(
      statuses.map((status, idx) => {
        const id = new mongoose.Types.ObjectId()
        return Disbursements.create({
          _id: id,
          refId: refIdFromDataId(String(id)),
          programId: prog._id,
          recipientId: recs[idx]._id,
          periodId: 202601 + idx,
          commitment: recs[idx].commitment,
          amount: 500000,
          disbursedDate: new Date('2026-01-15T00:00:00Z'),
          status,
        })
      }),
    )

    // GET /api/v1/programs
    const listRes = await listPrograms(req(undefined, 'GET', '/api/v1/programs'))
    expect(listRes.status).toBe(200)
    const listBody = listEnvelope(programDtoSchema).parse(await listRes.json())
    expect(listBody.data).toHaveLength(1)
    const item = listBody.data[0]
    expect(item.enrolledCount).toBe(4)
    expect(item.registeredCount).toBe(2)
    expect(item.disbursedCount).toBe(1)
    expect(item.disbursedAmount).toBe(500000)
    // remainingBudget = 2_000_000 - 500_000 = 1_500_000 (DRAFT, PENDING, FAILED excluded)
    expect(item.remainingBudget).toBe(1500000)

    // GET /api/v1/programs/:id
    const detailRes = await getProgram(req(undefined, 'GET', `/api/v1/programs/${prog._id}`), {
      params: Promise.resolve({ id: String(prog._id) }),
    })
    expect(detailRes.status).toBe(200)
    const detailBody = await detailRes.json()
    const { summary, ...progFields } = detailBody
    expect(programDtoSchema.parse(progFields)).toEqual(progFields)
    expect(progFields.enrolledCount).toBe(4)
    expect(progFields.registeredCount).toBe(2)
    expect(progFields.disbursedCount).toBe(1)
    expect(progFields.disbursedAmount).toBe(500000)
    expect(progFields.remainingBudget).toBe(1500000)
    expect(summary).toMatchObject({
      pagu: 2000000,
      target: 4,
      realisasi: { count: 1, rupiah: 500000 },
      sisa: 1500000,
    })
  })

  test('Recipients list includes enrollments and supports status, programId, and notEnrolledIn filters; GET /programs/:id/enrollments paginates & filters', async () => {
    const progA = await Programs.create({
      code: 'PROG-A',
      programId: programIdFromCode('PROG-A'),
      name: 'Program Alpha',
      fundSource: 'APBD',
      kind: 'TUNAI',
      amountPerRecipient: 200000,
      totalBudget: 2000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
      isPublic: true,
    })
    const progB = await Programs.create({
      code: 'PROG-B',
      programId: programIdFromCode('PROG-B'),
      name: 'Program Beta',
      fundSource: 'APBD',
      kind: 'BARANG',
      amountPerRecipient: 150000,
      totalBudget: 1500000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
      isPublic: true,
    })

    const nik1 = makeNik(20)
    const nik2 = makeNik(21)
    const nik3 = makeNik(22)
    const nik4 = makeNik(23)

    const rec1 = await Recipients.create({
      nikEnc: encryptNik(nik1),
      nikBlindIndex: nikBlindIndex(nik1),
      nikMasked: maskNik(nik1),
      name: 'Warga Satu',
      address: { dusun: 'Dusun I', rt: '01', rw: '01' },
      status: 'FINAL',
      commitment: recipientCommitment(nik1),
    })
    const rec2 = await Recipients.create({
      nikEnc: encryptNik(nik2),
      nikBlindIndex: nikBlindIndex(nik2),
      nikMasked: maskNik(nik2),
      name: 'Warga Dua',
      address: { dusun: 'Dusun I', rt: '01', rw: '01' },
      status: 'FINAL',
      commitment: recipientCommitment(nik2),
    })
    const rec3 = await Recipients.create({
      nikEnc: encryptNik(nik3),
      nikBlindIndex: nikBlindIndex(nik3),
      nikMasked: maskNik(nik3),
      name: 'Warga Tiga',
      address: { dusun: 'Dusun I', rt: '01', rw: '01' },
      status: 'FINAL',
      commitment: recipientCommitment(nik3),
    })
    const rec4Draft = await Recipients.create({
      nikEnc: encryptNik(nik4),
      nikBlindIndex: nikBlindIndex(nik4),
      nikMasked: maskNik(nik4),
      name: 'Warga Empat Draft',
      address: { dusun: 'Dusun I', rt: '01', rw: '01' },
      status: 'DRAFT',
    })

    // rec1 enrolled in PROG-A (REGISTERED_ONCHAIN) and PROG-B (ENROLLED)
    // rec2 enrolled in PROG-A (ENROLLED)
    // rec3 enrolled in PROG-B (REGISTERED_ONCHAIN) only
    // rec4Draft enrolled in none
    await Enrollments.create({ programId: progA._id, recipientId: rec1._id, status: 'REGISTERED_ONCHAIN' })
    await Enrollments.create({ programId: progB._id, recipientId: rec1._id, status: 'ENROLLED' })
    await Enrollments.create({ programId: progA._id, recipientId: rec2._id, status: 'ENROLLED' })
    await Enrollments.create({ programId: progB._id, recipientId: rec3._id, status: 'REGISTERED_ONCHAIN' })

    // 1. Filter by programId=progA
    const inProgARes = await listRecipients(req(undefined, 'GET', `/api/v1/recipients?programId=${progA._id}`))
    const inProgA = listEnvelope(recipientDtoSchema).parse(await inProgARes.json())
    expect(inProgA.total).toBe(2)
    const rec1Dto = inProgA.data.find(r => r.id === String(rec1._id))!
    expect(rec1Dto.enrollments).toEqual([
      { programCode: 'PROG-A', status: 'REGISTERED_ONCHAIN' },
      { programCode: 'PROG-B', status: 'ENROLLED' },
    ])

    // 2. Filter by notEnrolledIn=progA
    const notInProgARes = await listRecipients(req(undefined, 'GET', `/api/v1/recipients?notEnrolledIn=${progA._id}`))
    const notInProgA = listEnvelope(recipientDtoSchema).parse(await notInProgARes.json())
    expect(notInProgA.total).toBe(2)
    expect(notInProgA.data.map(r => r.id).sort()).toEqual([String(rec3._id), String(rec4Draft._id)].sort())

    // 3. Combined filter: status=FINAL & notEnrolledIn=progA -> only rec3
    const eligibleRes = await listRecipients(
      req(undefined, 'GET', `/api/v1/recipients?status=FINAL&notEnrolledIn=${progA._id}`),
    )
    const eligible = listEnvelope(recipientDtoSchema).parse(await eligibleRes.json())
    expect(eligible.total).toBe(1)
    expect(eligible.data[0].id).toBe(String(rec3._id))
    expect(eligible.data[0].enrollments).toEqual([{ programCode: 'PROG-B', status: 'REGISTERED_ONCHAIN' }])

    // 4. GET /api/v1/programs/:id/enrollments with pagination and status filter
    const allEnrRes = await listProgramEnrollments(
      req(undefined, 'GET', `/api/v1/programs/${progA._id}/enrollments?page=1&limit=1`),
      { params: Promise.resolve({ id: String(progA._id) }) },
    )
    expect(allEnrRes.status).toBe(200)
    const allEnr = listEnvelope(programEnrollmentItemDtoSchema).parse(await allEnrRes.json())
    expect(allEnr.total).toBe(2)
    expect(allEnr.totalPages).toBe(2)
    expect(allEnr.data).toHaveLength(1)

    const regOnlyRes = await listProgramEnrollments(
      req(undefined, 'GET', `/api/v1/programs/${progA._id}/enrollments?status=REGISTERED_ONCHAIN`),
      { params: Promise.resolve({ id: String(progA._id) }) },
    )
    const regOnly = listEnvelope(programEnrollmentItemDtoSchema).parse(await regOnlyRes.json())
    expect(regOnly.total).toBe(1)
    expect(regOnly.data[0].recipient).toEqual({
      id: String(rec1._id),
      name: 'Warga Satu',
      nikMasked: maskNik(nik1),
    })
    expect(regOnly.data[0].status).toBe('REGISTERED_ONCHAIN')

    // 5. Unknown program returns 404 ProblemDto
    const missingId = String(new mongoose.Types.ObjectId())
    const notFoundRes = await listProgramEnrollments(
      req(undefined, 'GET', `/api/v1/programs/${missingId}/enrollments`),
      { params: Promise.resolve({ id: missingId }) },
    )
    expect(notFoundRes.status).toBe(404)
    expect(problemDtoSchema.parse(await notFoundRes.json()).code).toBe('NOT_FOUND')
  })

  test('Dashboard summary builds zero-filled 12-month WITA (Asia/Makassar) series across year-turn boundary and byProgram totals', async () => {
    // Boundary unit checks around New Year in Asia/Makassar (UTC+8):
    // 2025-12-31T15:59:59Z = 2025-12-31 23:59:59 WITA -> ends at 202512
    expect(buildLast12Periods(new Date('2025-12-31T15:59:59Z'))).toEqual([
      202501, 202502, 202503, 202504, 202505, 202506,
      202507, 202508, 202509, 202510, 202511, 202512,
    ])
    // 2025-12-31T17:00:00Z = 2026-01-01 01:00:00 WITA -> crosses year turn to 202601 while UTC is still 2025!
    expect(buildLast12Periods(new Date('2025-12-31T17:00:00Z'))).toEqual([
      202502, 202503, 202504, 202505, 202506, 202507,
      202508, 202509, 202510, 202511, 202512, 202601,
    ])

    // Freeze clock right at the WITA year-turn boundary: 2026-01-01 01:00 WITA (2025-12-31 17:00 UTC)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2025-12-31T17:00:00Z'))

    vi.spyOn(networkMod, 'networkStatus').mockResolvedValue({
      status: 'Normal',
      latestBlock: 100,
      timestamp: 1767200400,
      ageSeconds: 2,
      validatorCount: 1,
      validators: [{ address: contract, institution: 'Kelurahan' }],
    })

    const prog1 = await Programs.create({
      code: 'BLT-01',
      programId: programIdFromCode('BLT-01'),
      name: 'BLT Tunai',
      fundSource: 'APBD',
      kind: 'TUNAI',
      amountPerRecipient: 300000,
      totalBudget: 3000000,
      startPeriod: 202501,
      endPeriod: 202612,
      status: 'ACTIVE',
      isPublic: true,
    })
    const prog2 = await Programs.create({
      code: 'PKH-02',
      programId: programIdFromCode('PKH-02'),
      name: 'PKH Sembako',
      fundSource: 'APBN',
      kind: 'BARANG',
      amountPerRecipient: 450000,
      totalBudget: 4500000,
      startPeriod: 202501,
      endPeriod: 202612,
      status: 'ACTIVE',
      isPublic: true,
    })

    const nikA = makeNik(25)
    const nikB = makeNik(26)
    const recA = await Recipients.create({
      nikEnc: encryptNik(nikA),
      nikBlindIndex: nikBlindIndex(nikA),
      nikMasked: maskNik(nikA),
      name: 'Penerima A',
      address: { dusun: 'Dusun I', rt: '01', rw: '01' },
      status: 'FINAL',
      commitment: recipientCommitment(nikA),
    })
    const recB = await Recipients.create({
      nikEnc: encryptNik(nikB),
      nikBlindIndex: nikBlindIndex(nikB),
      nikMasked: maskNik(nikB),
      name: 'Penerima B',
      address: { dusun: 'Dusun I', rt: '01', rw: '01' },
      status: 'FINAL',
      commitment: recipientCommitment(nikB),
    })

    const seedDisb = async (programId: mongoose.Types.ObjectId, recipientId: mongoose.Types.ObjectId, periodId: number, amount: number, status: 'DRAFT' | 'PENDING' | 'SUCCESS' | 'FAILED') => {
      const id = new mongoose.Types.ObjectId()
      await Disbursements.create({
        _id: id,
        refId: refIdFromDataId(String(id)),
        programId,
        recipientId,
        periodId,
        amount,
        status,
      })
    }

    // Outside 12-month window (202501): counted in overall realisasi & byProgram, excluded from monthly 202502..202601
    await seedDisb(prog1._id, recA._id, 202501, 300000, 'SUCCESS')
    // Inside window: 202512 (2 SUCCESS on prog1) and 202601 (1 SUCCESS on prog2)
    await seedDisb(prog1._id, recA._id, 202512, 300000, 'SUCCESS')
    await seedDisb(prog1._id, recB._id, 202512, 300000, 'SUCCESS')
    await seedDisb(prog2._id, recA._id, 202601, 450000, 'SUCCESS')
    // Non-SUCCESS disbursements must NOT be counted in monthly or byProgram
    await seedDisb(prog2._id, recB._id, 202601, 450000, 'PENDING')
    await seedDisb(prog1._id, recA._id, 202511, 300000, 'FAILED')

    const res = await getDashboardSummary(req(undefined, 'GET', '/api/v1/dashboard/summary'))
    expect(res.status).toBe(200)
    const dto = dashboardSummaryDtoSchema.parse(await res.json())

    expect(dto.monthly).toHaveLength(12)
    expect(dto.monthly.map(m => m.periodId)).toEqual([
      202502, 202503, 202504, 202505, 202506, 202507,
      202508, 202509, 202510, 202511, 202512, 202601,
    ])
    // Zero-filled months
    for (const emptyPeriod of [202502, 202503, 202504, 202505, 202506, 202507, 202508, 202509, 202510, 202511]) {
      expect(dto.monthly.find(m => m.periodId === emptyPeriod)).toEqual({
        periodId: emptyPeriod,
        count: 0,
        amount: 0,
      })
    }
    expect(dto.monthly.find(m => m.periodId === 202512)).toEqual({
      periodId: 202512,
      count: 2,
      amount: 600000,
    })
    expect(dto.monthly.find(m => m.periodId === 202601)).toEqual({
      periodId: 202601,
      count: 1,
      amount: 450000,
    })

    expect(dto.byProgram).toEqual([
      { code: 'BLT-01', name: 'BLT Tunai', count: 3, amount: 900000 },
      { code: 'PKH-02', name: 'PKH Sembako', count: 1, amount: 450000 },
    ])
  })
})

