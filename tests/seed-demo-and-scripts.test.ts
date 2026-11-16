import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuditLogs, Enrollments, Programs, Recipients } from '@/lib/db/models'
import { recipientCommitment } from '@/lib/blockchain/identity-hash'
import {
  DEMO_PROGRAM,
  assertSeedDemoAllowed,
  buildDemoRecipients,
  resolveDatabaseName,
  seedDemoData,
} from '../scripts/seed-demo'
import {
  assertScenarioEnvironment,
  decodeRevertErrorName,
  isLocalhostRpcUrl,
} from '../scripts/scenarios/run-scenarios'
import {
  assertPerfEnvironment,
  computeLatencyStats,
  formatMetricsCsv,
  parseBatchSizes,
} from '../scripts/perf/disbursement-load'

describe('Automated testing equipment — seed-demo, scenarios, and perf guards (PRD 17.1, FR-SYS-03/06/07, D-48)', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('defines DEMO_PROGRAM constant at top of seed-demo.ts matching PRD FR-SYS-03 & D-48', () => {
    expect(DEMO_PROGRAM).toEqual({
      code: 'BLT-UJI',
      name: 'BLT Uji (simulasi)',
      kind: 'TUNAI',
      amountPerRecipient: 600000,
      startPeriod: 202611,
      endPeriod: 202702,
      totalBudget: 30000000,
      fundSource: 'APBD Kabupaten Barru',
      isPublic: true,
    })

    const recipients = buildDemoRecipients()
    expect(recipients).toHaveLength(15)
    expect(recipients[0]?.name).toBe('Penerima Uji 01')
    expect(recipients[14]?.name).toBe('Penerima Uji 15')

    // R01..R12 FINAL, R13 DRAFT, R14..R15 FINAL reserve
    for (let i = 0; i < 12; i++) {
      expect(recipients[i]?.status).toBe('FINAL')
    }
    expect(recipients[12]?.status).toBe('DRAFT')
    expect(recipients[13]?.status).toBe('FINAL')
    expect(recipients[14]?.status).toBe('FINAL')

    // R01..R10 enrolled in BLT-UJI
    const enrolled = recipients.filter((r) => r.enrollInDemoProgram)
    expect(enrolled).toHaveLength(10)
    expect(enrolled.map((r) => r.code)).toEqual([
      'R01',
      'R02',
      'R03',
      'R04',
      'R05',
      'R06',
      'R07',
      'R08',
      'R09',
      'R10',
    ])
  })

  it('always prints target database name and rejects production execution unless ALLOW_SEED_DEMO=true AND interactive DB name matches', async () => {
    const logs: string[] = []
    const logFn = (msg: string) => logs.push(msg)

    // 1. Development environment: allowed and prints target DB name
    const devDb = await assertSeedDemoAllowed({
      env: {
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/bansosledger_dev',
      },
      log: logFn,
    })
    expect(devDb).toBe('bansosledger_dev')
    expect(logs.some((l) => l.includes('bansosledger_dev'))).toBe(true)

    // 2. Production without ALLOW_SEED_DEMO=true -> rejected
    await expect(
      assertSeedDemoAllowed({
        env: {
          NODE_ENV: 'production',
          DB_NAME: 'bansosledger_prod',
        },
        log: logFn,
      }),
    ).rejects.toThrow(/ditolak pada NODE_ENV=production/i)

    // 3. Production with ALLOW_SEED_DEMO=true but non-interactive -> rejected
    await expect(
      assertSeedDemoAllowed({
        env: {
          NODE_ENV: 'production',
          ALLOW_SEED_DEMO: 'true',
          DB_NAME: 'bansosledger_prod',
        },
        isInteractive: false,
        log: logFn,
      }),
    ).rejects.toThrow(/Konfirmasi interaktif diperlukan/i)

    // 4. Production with ALLOW_SEED_DEMO=true but wrong typed database name -> rejected
    await expect(
      assertSeedDemoAllowed({
        env: {
          NODE_ENV: 'production',
          ALLOW_SEED_DEMO: 'true',
          DB_NAME: 'bansosledger_prod',
        },
        isInteractive: true,
        promptConfirm: async () => 'wrong_db_name',
        log: logFn,
      }),
    ).rejects.toThrow(/Konfirmasi nama database tidak cocok/i)

    // 5. Production with ALLOW_SEED_DEMO=true AND matching interactive DB name -> allowed
    const prodDb = await assertSeedDemoAllowed({
      env: {
        NODE_ENV: 'production',
        ALLOW_SEED_DEMO: 'true',
        DB_NAME: 'bansosledger_prod',
      },
      isInteractive: true,
      promptConfirm: async () => 'bansosledger_prod',
      log: logFn,
    })
    expect(prodDb).toBe('bansosledger_prod')
    expect(resolveDatabaseName({ MONGODB_URI: 'mongodb://localhost:27017/custom_db?authSource=admin' })).toBe(
      'custom_db',
    )
  })

  it('enforces localhost RPC, chainId 250204, and explicit allow flags on scenarios and perf scripts', () => {
    expect(isLocalhostRpcUrl('http://127.0.0.1:8545')).toBe(true)
    expect(isLocalhostRpcUrl('http://localhost:8545')).toBe(true)
    expect(isLocalhostRpcUrl('https://rpc.bansosledger.icu')).toBe(false)

    // Scenarios guard
    expect(() =>
      assertScenarioEnvironment({
        NODE_ENV: 'test',
        SCENARIO_ALLOW: 'false',
        NEXT_PUBLIC_CHAIN_ID: '250204',
        RPC_URL_SERVER: 'http://127.0.0.1:8545',
      }),
    ).toThrow(/SCENARIO_ALLOW/i)

    expect(() =>
      assertScenarioEnvironment({
        NODE_ENV: 'test',
        SCENARIO_ALLOW: 'true',
        NEXT_PUBLIC_CHAIN_ID: '1337',
        RPC_URL_SERVER: 'http://127.0.0.1:8545',
      }),
    ).toThrow(/250204/)

    expect(() =>
      assertScenarioEnvironment({
        NODE_ENV: 'test',
        SCENARIO_ALLOW: 'true',
        NEXT_PUBLIC_CHAIN_ID: '250204',
        RPC_URL_SERVER: 'https://rpc.bansosledger.icu',
      }),
    ).toThrow(/localhost atau 127\.0\.0\.1/i)

    const validScenarioCfg = assertScenarioEnvironment({
      NODE_ENV: 'test',
      SCENARIO_ALLOW: 'true',
      NEXT_PUBLIC_CHAIN_ID: '250204',
      RPC_URL_SERVER: 'http://127.0.0.1:8545',
      NEXT_PUBLIC_CONTRACT_ADDRESS: '0x' + '1'.repeat(40),
      SCENARIO_AUTHORIZED_KEY: '0x' + 'a'.repeat(64),
      SCENARIO_STRANGER_KEY: '0x' + 'b'.repeat(64),
    })
    expect(validScenarioCfg.chainId).toBe(250204)

    // Perf guard & stats calculation
    expect(() =>
      assertPerfEnvironment({
        NODE_ENV: 'test',
        PERF_ALLOW: 'false',
        RPC_URL_SERVER: 'http://127.0.0.1:8545',
      }),
    ).toThrow(/PERF_ALLOW/i)

    expect(() =>
      assertPerfEnvironment({
        NODE_ENV: 'test',
        PERF_ALLOW: 'true',
        RPC_URL_SERVER: 'https://rpc.bansosledger.icu',
      }),
    ).toThrow(/localhost atau 127\.0\.0\.1/i)

    expect(parseBatchSizes('10,50,100,200')).toEqual([10, 50, 100, 200])
    const stats = computeLatencyStats(10, [100, 120, 150, 200, 250, 300, 350, 400, 450, 900], 0)
    expect(stats.batchSize).toBe(10)
    expect(stats.successRatePercent).toBe(100)
    expect(stats.p50Ms).toBe(250)
    expect(stats.p95Ms).toBe(900)
    expect(stats.maxMs).toBe(900)

    const csv = formatMetricsCsv([stats], '2026-11-16T00:00:00.000Z')
    expect(csv).toContain('timestamp,batch_n,success_count,fail_count,success_rate_pct,p50_ms,p95_ms,max_ms,mean_ms')
    expect(csv).toContain('2026-11-16T00:00:00.000Z,10,10,0,100,250,900,900,322')

    const decoded = decodeRevertErrorName({ message: 'execution reverted: AlreadyDisbursed()' })
    expect(decoded.name).toBe('AlreadyDisbursed')
  })

  it('idempotently seeds BLT-UJI, 15 recipients (R01-R12 FINAL, R13 DRAFT, R14-R15 FINAL), 10 enrollments, and audit log entry', async () => {
    const mongo = await MongoMemoryServer.create({
      binary: { version: '7.0.24' },
      instance: { dbName: 'bansosledger_seed_test' },
    })
    try {
      await mongoose.disconnect()
      delete (globalThis as { bansosMongo?: unknown }).bansosMongo
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        MONGODB_URI: mongo.getUri(),
        DB_NAME: 'bansosledger_seed_test',
        NIK_ENC_KEY: randomBytes(32).toString('hex'),
        NIK_INDEX_KEY: randomBytes(32).toString('hex'),
        COMMITMENT_PEPPER: randomBytes(32).toString('hex'),
      }

      const logs: string[] = []
      const firstRun = await seedDemoData({ log: (m) => logs.push(m) })
      const secondRun = await seedDemoData({ log: (m) => logs.push(m) })

      expect(firstRun.database).toBe('bansosledger_seed_test')
      expect(secondRun.programId).toBe(firstRun.programId)
      expect(logs.filter((l) => l.includes('bansosledger_seed_test')).length).toBeGreaterThanOrEqual(2)

      const programs = await Programs.find({ code: DEMO_PROGRAM.code }).lean()
      expect(programs).toHaveLength(1)
      expect(programs[0]?.amountPerRecipient).toBe(600000)

      const recipients = await Recipients.find().sort({ name: 1 }).lean()
      expect(recipients).toHaveLength(15)

      const specs = buildDemoRecipients()
      const r01 = recipients.find((r) => r.name === 'Penerima Uji 01')
      const r13 = recipients.find((r) => r.name === 'Penerima Uji 13')
      const r15 = recipients.find((r) => r.name === 'Penerima Uji 15')

      expect(r01?.status).toBe('FINAL')
      expect(r01?.commitment).toBe(recipientCommitment(specs[0]!.nik))
      expect(r13?.status).toBe('DRAFT')
      expect(r13?.commitment).toBeUndefined()
      expect(r15?.status).toBe('FINAL')
      expect(r15?.commitment).toBe(recipientCommitment(specs[14]!.nik))

      const enrollments = await Enrollments.find({ programId: programs[0]!._id }).lean()
      expect(enrollments).toHaveLength(10)
      expect(enrollments.every((e) => e.status === 'ENROLLED')).toBe(true)

      const audits = await AuditLogs.find({ action: 'SEED_DEMO_EXECUTED' }).lean()
      expect(audits).toHaveLength(2)
    } finally {
      await mongoose.disconnect()
      delete (globalThis as { bansosMongo?: unknown }).bansosMongo
      await mongo.stop()
    }
  })
})
