export const DEMO_PROGRAM = {
  code: 'BLT-UJI',
  name: 'BLT Uji (simulasi)',
  kind: 'TUNAI',
  amountPerRecipient: 600000,
  startPeriod: 202611,
  endPeriod: 202702,
  totalBudget: 30000000,
  fundSource: 'APBD Kabupaten Barru',
  isPublic: true,
} as const

import { userInfo } from 'node:os'
import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { connectDatabase } from '../src/lib/db/connection'
import { AuditLogs, Counters, Enrollments, Programs, Recipients } from '../src/lib/db/models'
import { encryptNik, maskNik, nikBlindIndex, validateNik } from '../src/lib/crypto/nik'
import { recipientCommitment } from '../src/lib/blockchain/identity-hash'
import { programIdFromCode } from '../src/lib/blockchain/chain-keys'
import { appendAudit } from '../src/modules/audit/service'

export interface DemoRecipientSpec {
  code: string
  index: number
  name: string
  nik: string
  status: 'DRAFT' | 'FINAL'
  enrollInDemoProgram: boolean
  address: {
    dusun: string
    rt: string
    rw: string
  }
}

export function resolveDatabaseName(env: Partial<NodeJS.ProcessEnv> = process.env): string {
  const explicitDbName = env.DB_NAME?.trim()
  if (explicitDbName) {
    return explicitDbName
  }
  const uri = env.MONGODB_URI?.trim()
  if (uri) {
    try {
      const parsed = new URL(uri)
      const pathDb = parsed.pathname.replace(/^\/+/, '').split('/')[0]?.trim()
      if (pathDb) {
        return decodeURIComponent(pathDb)
      }
    } catch {
      const match = uri.match(/\/([^/?]+)(?:\?|$)/)
      if (match?.[1]) {
        return match[1]
      }
    }
  }
  return 'bansosledger'
}

export interface SeedGuardOptions {
  env?: Partial<NodeJS.ProcessEnv>
  isInteractive?: boolean
  promptConfirm?: (question: string) => Promise<string>
  log?: (message: string) => void
}

export async function assertSeedDemoAllowed(options: SeedGuardOptions = {}): Promise<string> {
  const env = options.env ?? process.env
  const log = options.log ?? console.info
  const targetDb = resolveDatabaseName(env)

  log(`Target database seed:demo -> ${targetDb}`)

  if (env.NODE_ENV === 'production') {
    if (env.ALLOW_SEED_DEMO !== 'true') {
      throw new Error(
        `Eksekusi seed:demo ditolak pada NODE_ENV=production untuk database "${targetDb}". Set ALLOW_SEED_DEMO=true dan konfirmasi interaktif bila benar-benar diperlukan.`,
      )
    }

    const isInteractive = options.isInteractive ?? Boolean(process.stdin.isTTY)
    if (!isInteractive && !options.promptConfirm) {
      throw new Error(
        `Konfirmasi interaktif diperlukan pada NODE_ENV=production untuk database "${targetDb}".`,
      )
    }

    const ask =
      options.promptConfirm ??
      (async (question: string) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout })
        try {
          return await rl.question(question)
        } finally {
          rl.close()
        }
      })

    const typed = (
      await ask(`Ketik nama database target (${targetDb}) untuk mengonfirmasi seed:demo: `)
    ).trim()
    if (typed !== targetDb) {
      throw new Error(
        `Konfirmasi nama database tidak cocok (diharapkan "${targetDb}"). Eksekusi seed:demo dibatalkan.`,
      )
    }
  }

  return targetDb
}

export function buildDemoRecipients(): DemoRecipientSpec[] {
  const specs: DemoRecipientSpec[] = []
  for (let i = 1; i <= 15; i++) {
    const padded = String(i).padStart(2, '0')
    // Valid 16-digit synthetic NIK: 731101 (Barru/Tanete Rilau), day 01..15, month 08, year 90, seq 0001..0015
    const nik = `731101${padded}0890${String(i).padStart(4, '0')}`
    if (!validateNik(nik)) {
      throw new Error(`Synthetic NIK invalid at index ${i}`)
    }
    const status: 'DRAFT' | 'FINAL' = i === 13 ? 'DRAFT' : 'FINAL'
    const enrollInDemoProgram = i >= 1 && i <= 10
    specs.push({
      code: `R${padded}`,
      index: i,
      name: `Penerima Uji ${padded}`,
      nik,
      status,
      enrollInDemoProgram,
      address: {
        dusun: `Dusun Uji ${((i - 1) % 3) + 1}`,
        rt: String(((i - 1) % 4) + 1).padStart(3, '0'),
        rw: String(((i - 1) % 2) + 1).padStart(3, '0'),
      },
    })
  }
  return specs
}

export async function seedDemoData(options: SeedGuardOptions = {}) {
  const targetDb = await assertSeedDemoAllowed(options)
  await connectDatabase()

  for (const model of [Programs, Recipients, Enrollments, AuditLogs, Counters]) {
    try {
      await model.createCollection()
    } catch {
      // Collection already exists
    }
  }

  let actorUsername = 'seed-demo'
  try {
    actorUsername = userInfo().username || 'seed-demo'
  } catch {
    // Fallback if os.userInfo() is restricted
  }
  const actor = `cli:${actorUsername}`
  const now = new Date()

  const programId = programIdFromCode(DEMO_PROGRAM.code)
  const programDoc = await Programs.findOneAndUpdate(
    { code: DEMO_PROGRAM.code },
    {
      $set: {
        name: DEMO_PROGRAM.name,
        kind: DEMO_PROGRAM.kind,
        amountPerRecipient: DEMO_PROGRAM.amountPerRecipient,
        startPeriod: DEMO_PROGRAM.startPeriod,
        endPeriod: DEMO_PROGRAM.endPeriod,
        totalBudget: DEMO_PROGRAM.totalBudget,
        fundSource: DEMO_PROGRAM.fundSource,
        isPublic: DEMO_PROGRAM.isPublic,
        programId,
      },
      $setOnInsert: {
        status: 'DRAFT',
        description: 'Program simulasi otomatis untuk pengujian integrasi dan skenario.',
      },
    },
    { upsert: true, new: true },
  ).lean()

  if (!programDoc) {
    throw new Error('Gagal membuat atau memperbarui program BLT-UJI.')
  }

  const recipientSpecs = buildDemoRecipients()
  const enrolledRecipientIds: mongoose.Types.ObjectId[] = []

  for (const spec of recipientSpecs) {
    const blindIndex = nikBlindIndex(spec.nik)
    const masked = maskNik(spec.nik)
    const encrypted = encryptNik(spec.nik)
    const commitment = spec.status === 'FINAL' ? recipientCommitment(spec.nik) : undefined

    const updatePayload: Record<string, unknown> = {
      name: spec.name,
      nikMasked: masked,
      address: spec.address,
      status: spec.status,
      deletedAt: null,
    }
    if (commitment) {
      updatePayload.commitment = commitment
    }

    const insertPayload: Record<string, unknown> = {
      nikEnc: encrypted,
      ...(spec.status === 'FINAL' ? { finalizedAt: now } : {}),
    }

    const recipientDoc = await Recipients.findOneAndUpdate(
      { nikBlindIndex: blindIndex },
      {
        $set: updatePayload,
        $setOnInsert: insertPayload,
        ...(spec.status === 'DRAFT' ? { $unset: { commitment: 1, finalizedAt: 1 } } : {}),
      },
      { upsert: true, new: true },
    ).lean()

    if (!recipientDoc) {
      throw new Error(`Gagal menyimpan penerima ${spec.code}.`)
    }

    if (spec.enrollInDemoProgram) {
      enrolledRecipientIds.push(recipientDoc._id as mongoose.Types.ObjectId)
    }
  }

  for (const recipientId of enrolledRecipientIds) {
    await Enrollments.updateOne(
      { programId: programDoc._id, recipientId },
      {
        $setOnInsert: {
          status: 'ENROLLED',
        },
      },
      { upsert: true },
    )
  }

  await appendAudit({
    actor,
    action: 'SEED_DEMO_EXECUTED',
    entity: 'programs',
    entityId: String(programDoc._id),
    diff: {
      database: targetDb,
      programCode: DEMO_PROGRAM.code,
      recipientsTotal: recipientSpecs.length,
      finalCount: recipientSpecs.filter((r) => r.status === 'FINAL').length,
      draftCount: recipientSpecs.filter((r) => r.status === 'DRAFT').length,
      enrolledCount: enrolledRecipientIds.length,
    },
  })

  return {
    database: targetDb,
    programId: String(programDoc._id),
    programCode: DEMO_PROGRAM.code,
    recipientsTotal: recipientSpecs.length,
    enrolledCount: enrolledRecipientIds.length,
  }
}

async function main() {
  try {
    const summary = await seedDemoData()
    console.info(
      `Seed demo selesai pada database "${summary.database}": program ${summary.programCode}, ${summary.recipientsTotal} penerima, ${summary.enrolledCount} terdaftar (ENROLLED).`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Seed demo gagal dijalankan.'
    console.error(message)
    process.exitCode = 1
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  }
}

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isDirectExecution) {
  void main()
}
