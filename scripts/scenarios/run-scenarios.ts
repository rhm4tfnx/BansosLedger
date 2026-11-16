import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers'
import mongoose, { Types } from 'mongoose'
import { DEMO_PROGRAM } from '../seed-demo'
import { ledgerABI, ledgerInterface } from '../../src/lib/blockchain/abi'
import { programIdFromCode, refIdFromDataId } from '../../src/lib/blockchain/chain-keys'
import { recipientCommitment } from '../../src/lib/blockchain/identity-hash'
import { connectDatabase } from '../../src/lib/db/connection'
import { ChainEvents, Disbursements, Programs, Recipients, Settings } from '../../src/lib/db/models'
import { report as reconciliationReport } from '../../src/modules/chain/reconcile'

export interface ScenarioEvidence {
  scenarioId: string
  description: string
  timestamp: string
  txHash: string | null
  expected: string
  actual: string
  pass: boolean
}

export interface ScenarioEnvConfig {
  chainId: number
  rpcUrl: string
  contractAddress: string
  authorizedKey: string
  strangerKey: string
}

export function isLocalhostRpcUrl(rpcUrl: string): boolean {
  try {
    const parsed = new URL(rpcUrl)
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}

export function assertScenarioEnvironment(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): ScenarioEnvConfig {
  if (env.SCENARIO_ALLOW !== 'true') {
    throw new Error('Eksekusi skenario ditolak: SCENARIO_ALLOW harus bernilai "true".')
  }
  if (env.NEXT_PUBLIC_CHAIN_ID !== '250204') {
    throw new Error(
      `Eksekusi skenario ditolak: NEXT_PUBLIC_CHAIN_ID harus "250204" (diterima: "${env.NEXT_PUBLIC_CHAIN_ID ?? ''}").`,
    )
  }
  const rpcUrl = env.RPC_URL_SERVER?.trim() ?? ''
  if (!isLocalhostRpcUrl(rpcUrl)) {
    throw new Error(
      `Eksekusi skenario ditolak: RPC_URL_SERVER harus mengarah ke localhost atau 127.0.0.1 (diterima: "${rpcUrl}").`,
    )
  }
  const contractAddress = env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? ''
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS tidak valid atau belum diatur.')
  }
  const authorizedKey = env.SCENARIO_AUTHORIZED_KEY?.trim() ?? ''
  const strangerKey = env.SCENARIO_STRANGER_KEY?.trim() ?? ''
  if (!/^0x[0-9a-fA-F]{64}$/.test(authorizedKey) || !/^0x[0-9a-fA-F]{64}$/.test(strangerKey)) {
    throw new Error(
      'SCENARIO_AUTHORIZED_KEY dan SCENARIO_STRANGER_KEY wajib berupa private key 32-byte (0x + 64 hex).',
    )
  }
  return {
    chainId: 250204,
    rpcUrl,
    contractAddress: contractAddress.toLowerCase(),
    authorizedKey,
    strangerKey,
  }
}

export function decodeRevertErrorName(error: unknown): { name: string; txHash: string | null } {
  const errObj = error as {
    data?: string
    transactionHash?: string
    receipt?: { hash?: string }
    info?: { error?: { data?: string } }
    shortMessage?: string
    message?: string
  }
  const txHash = errObj?.transactionHash ?? errObj?.receipt?.hash ?? null
  const rawData = errObj?.data ?? errObj?.info?.error?.data
  if (typeof rawData === 'string' && rawData.startsWith('0x') && rawData.length >= 10) {
    try {
      const parsed = ledgerInterface.parseError(rawData)
      if (parsed?.name) {
        return { name: parsed.name, txHash }
      }
    } catch {
      // Fallback to message matching below
    }
  }
  const text = `${errObj?.shortMessage ?? ''} ${errObj?.message ?? ''}`
  const knownErrors = [
    'AlreadyDisbursed',
    'AmountMismatch',
    'NotAuthorized',
    'RecipientNotRegistered',
    'RefIdAlreadyUsed',
    'PeriodOutOfRange',
    'ProgramClosed',
    'InvalidEvidenceCid',
    'ProgramNotFound',
    'EnforcedPause',
  ]
  for (const known of knownErrors) {
    if (text.includes(known)) {
      return { name: known, txHash }
    }
  }
  return { name: 'UNKNOWN_REVERT', txHash }
}

function writeScenarioEvidence(evidence: ScenarioEvidence, rootDir = process.cwd()): void {
  const dir = join(rootDir, 'docs', 'evidence', evidence.scenarioId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'result.json'),
    JSON.stringify(
      {
        scenarioId: evidence.scenarioId,
        description: evidence.description,
        timestamp: evidence.timestamp,
        txHash: evidence.txHash,
        expected: evidence.expected,
        actual: evidence.actual,
        pass: evidence.pass,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )
}

async function expectContractRevert(
  action: () => Promise<unknown>,
  expectedErrors: string[],
): Promise<{ txHash: string | null; actual: string; pass: boolean }> {
  try {
    const tx = (await action()) as { hash?: string; wait?: () => Promise<{ hash?: string }> }
    const receipt = tx?.wait ? await tx.wait() : undefined
    return {
      txHash: receipt?.hash ?? tx?.hash ?? null,
      actual: 'TX_SUCCEEDED_UNEXPECTEDLY',
      pass: false,
    }
  } catch (error) {
    const decoded = decodeRevertErrorName(error)
    return {
      txHash: decoded.txHash,
      actual: decoded.name,
      pass: expectedErrors.includes(decoded.name),
    }
  }
}

const SAMPLE_CID_A = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const SAMPLE_CID_B = 'bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'

export async function runAllScenarios(): Promise<ScenarioEvidence[]> {
  const cfg = assertScenarioEnvironment(process.env)
  await connectDatabase()

  const rpc = new JsonRpcProvider(cfg.rpcUrl, cfg.chainId, { staticNetwork: true })
  const authorizedWallet = new Wallet(cfg.authorizedKey, rpc)
  const strangerWallet = new Wallet(cfg.strangerKey, rpc)

  const contractAsAuthorized = new Contract(cfg.contractAddress, ledgerABI, authorizedWallet)
  const contractAsStranger = new Contract(cfg.contractAddress, ledgerABI, strangerWallet)

  const runSuffix = Date.now().toString(36).toUpperCase()
  const programId = programIdFromCode(`${DEMO_PROGRAM.code}-${runSuffix}`)
  const closeableProgramId = programIdFromCode(`${DEMO_PROGRAM.code}-CLOSE-${runSuffix}`)

  const registeredNik = '7311010108900001'
  const unregisteredDraftNik = '7311011308900013'
  const registeredCommitment = recipientCommitment(registeredNik)
  const unregisteredCommitment = recipientCommitment(unregisteredDraftNik)

  // Setup: create active program and register R01 commitment on-chain
  const createTx = await contractAsAuthorized.createProgram(
    programId,
    DEMO_PROGRAM.amountPerRecipient,
    DEMO_PROGRAM.startPeriod,
    DEMO_PROGRAM.endPeriod,
  )
  await createTx.wait(1)

  const regTx = await contractAsAuthorized.registerRecipients(programId, [registeredCommitment])
  await regTx.wait(1)

  // Baseline valid disbursement for SP-01 and SP-06
  const baseRefId = refIdFromDataId(`sp01-base-${runSuffix}`)
  const baseTx = await contractAsAuthorized.recordDisbursement({
    refId: baseRefId,
    programId,
    periodId: DEMO_PROGRAM.startPeriod,
    recipientCommitment: registeredCommitment,
    amount: DEMO_PROGRAM.amountPerRecipient,
    evidenceCid: SAMPLE_CID_A,
  })
  const baseReceipt = await baseTx.wait(1)
  const baseTxHash = String(baseReceipt?.hash ?? baseTx.hash).toLowerCase()

  const results: ScenarioEvidence[] = []

  // SP-01: Duplicate (programId, periodId, commitment) -> AlreadyDisbursed
  {
    const dupRefId = refIdFromDataId(`sp01-dup-${runSuffix}`)
    const outcome = await expectContractRevert(
      () =>
        contractAsAuthorized.recordDisbursement({
          refId: dupRefId,
          programId,
          periodId: DEMO_PROGRAM.startPeriod,
          recipientCommitment: registeredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: SAMPLE_CID_A,
        }),
      ['AlreadyDisbursed'],
    )
    results.push({
      scenarioId: 'SP-01',
      description: 'Duplikasi (programId, periodId, commitment) ditolak kontrak',
      timestamp: new Date().toISOString(),
      txHash: outcome.txHash ?? baseTxHash,
      expected: 'AlreadyDisbursed',
      actual: outcome.actual,
      pass: outcome.pass,
    })
  }

  // SP-02: Amount mismatch -> AmountMismatch
  {
    const refId = refIdFromDataId(`sp02-${runSuffix}`)
    const outcome = await expectContractRevert(
      () =>
        contractAsAuthorized.recordDisbursement({
          refId,
          programId,
          periodId: DEMO_PROGRAM.startPeriod + 1,
          recipientCommitment: registeredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient + 50000,
          evidenceCid: SAMPLE_CID_A,
        }),
      ['AmountMismatch'],
    )
    results.push({
      scenarioId: 'SP-02',
      description: 'Nominal penyaluran tidak sesuai ketentuan program ditolak kontrak',
      timestamp: new Date().toISOString(),
      txHash: outcome.txHash,
      expected: 'AmountMismatch',
      actual: outcome.actual,
      pass: outcome.pass,
    })
  }

  // SP-03: Unauthorized wallet -> NotAuthorized
  {
    const refId = refIdFromDataId(`sp03-${runSuffix}`)
    const outcome = await expectContractRevert(
      () =>
        contractAsStranger.recordDisbursement({
          refId,
          programId,
          periodId: DEMO_PROGRAM.startPeriod + 1,
          recipientCommitment: registeredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: SAMPLE_CID_A,
        }),
      ['NotAuthorized'],
    )
    results.push({
      scenarioId: 'SP-03',
      description: 'Pengiriman dari wallet tidak berwenang ditolak kontrak',
      timestamp: new Date().toISOString(),
      txHash: outcome.txHash,
      expected: 'NotAuthorized',
      actual: outcome.actual,
      pass: outcome.pass,
    })
  }

  // SP-04: Unregistered / DRAFT recipient -> RecipientNotRegistered
  {
    const refId = refIdFromDataId(`sp04-${runSuffix}`)
    const outcome = await expectContractRevert(
      () =>
        contractAsAuthorized.recordDisbursement({
          refId,
          programId,
          periodId: DEMO_PROGRAM.startPeriod,
          recipientCommitment: unregisteredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: SAMPLE_CID_A,
        }),
      ['RecipientNotRegistered'],
    )
    results.push({
      scenarioId: 'SP-04',
      description: 'Penerima belum terdaftar on-chain / masih DRAFT ditolak kontrak',
      timestamp: new Date().toISOString(),
      txHash: outcome.txHash,
      expected: 'RecipientNotRegistered',
      actual: outcome.actual,
      pass: outcome.pass,
    })
  }

  // SP-05: Manipulate MongoDB record then run reconciliation -> anomaly detected
  {
    const fakeTxHash = keccak256(toUtf8Bytes(`sp05-fake-tx-${runSuffix}`)).toLowerCase()
    const fakeRefId = refIdFromDataId(`sp05-ref-${runSuffix}`).toLowerCase()
    const latestBlock = await rpc.getBlockNumber()

    await Settings.updateOne(
      { chainId: cfg.chainId, contractAddress: cfg.contractAddress },
      { $set: { lastIndexedBlock: latestBlock } },
      { upsert: true },
    )

    const progDoc =
      (await Programs.findOne({ code: DEMO_PROGRAM.code }).lean()) ??
      (await Programs.create({
        code: DEMO_PROGRAM.code,
        programId: programIdFromCode(DEMO_PROGRAM.code),
        name: DEMO_PROGRAM.name,
        kind: DEMO_PROGRAM.kind,
        amountPerRecipient: DEMO_PROGRAM.amountPerRecipient,
        totalBudget: DEMO_PROGRAM.totalBudget,
        startPeriod: DEMO_PROGRAM.startPeriod,
        endPeriod: DEMO_PROGRAM.endPeriod,
        fundSource: DEMO_PROGRAM.fundSource,
        status: 'ACTIVE',
        isPublic: true,
      }))
    const recDoc =
      (await Recipients.findOne({ status: 'FINAL' }).lean()) ??
      (await Recipients.create({
        nikBlindIndex: keccak256(toUtf8Bytes(`sp05-nik-${runSuffix}`)).slice(2),
        nikMasked: '7311••••••••0001',
        name: 'Penerima Uji 01',
        status: 'FINAL',
        commitment: registeredCommitment,
      }))

    const tamperedDisb = await Disbursements.create({
      refId: fakeRefId,
      programId: progDoc._id as Types.ObjectId,
      recipientId: recDoc._id as Types.ObjectId,
      periodId: DEMO_PROGRAM.startPeriod,
      commitment: registeredCommitment,
      amount: DEMO_PROGRAM.amountPerRecipient,
      status: 'SUCCESS',
      evidence: [
        {
          cid: SAMPLE_CID_A,
          mime: 'image/jpeg',
          size: 1024,
          sha256: 'a'.repeat(64),
          name: 'bukti.jpg',
          access: 'PUBLIC',
          status: 'ACTIVE',
        },
      ],
      chain: {
        txHash: fakeTxHash,
        blockNumber: latestBlock,
        logIndex: 0,
        blockTimestamp: new Date(),
        from: authorizedWallet.address.toLowerCase(),
        confirmedAt: new Date(),
      },
    })

    try {
      const res = await reconciliationReport({
        request: new Request('http://localhost:3000/api/v1/reports/reconciliation?page=1&limit=50'),
        params: {},
        actor: {
          userId: '000000000000000000000001',
          role: 'AUDITOR',
          walletVerified: false,
          expiresAt: Date.now() + 60_000,
        },
      })
      const payload = (await res.json()) as {
        anomalies?: {
          missingEvents?: Array<{ refId: string; code: string }>
        }
      }
      const detected = payload.anomalies?.missingEvents?.find(
        (item) => item.refId.toLowerCase() === fakeRefId,
      )
      results.push({
        scenarioId: 'SP-05',
        description: 'Manipulasi status/txHash di MongoDB terdeteksi oleh rekonsiliasi',
        timestamp: new Date().toISOString(),
        txHash: fakeTxHash,
        expected: 'DB_SUCCESS_WITHOUT_EVENT',
        actual: detected?.code ?? 'NOT_DETECTED',
        pass: detected?.code === 'DB_SUCCESS_WITHOUT_EVENT',
      })
    } finally {
      await Disbursements.deleteOne({ _id: tamperedDisb._id })
    }
  }

  // SP-06: Replay same refId -> RefIdAlreadyUsed
  {
    const outcome = await expectContractRevert(
      () =>
        contractAsAuthorized.recordDisbursement({
          refId: baseRefId,
          programId,
          periodId: DEMO_PROGRAM.startPeriod + 1,
          recipientCommitment: registeredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: SAMPLE_CID_A,
        }),
      ['RefIdAlreadyUsed'],
    )
    results.push({
      scenarioId: 'SP-06',
      description: 'Replay refId yang sama ditolak kontrak',
      timestamp: new Date().toISOString(),
      txHash: outcome.txHash ?? baseTxHash,
      expected: 'RefIdAlreadyUsed',
      actual: outcome.actual,
      pass: outcome.pass,
    })
  }

  // SP-07: Period out of range & after closeProgram -> PeriodOutOfRange / ProgramClosed
  {
    const outOfRangeOutcome = await expectContractRevert(
      () =>
        contractAsAuthorized.recordDisbursement({
          refId: refIdFromDataId(`sp07-range-${runSuffix}`),
          programId,
          periodId: 202501,
          recipientCommitment: registeredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: SAMPLE_CID_A,
        }),
      ['PeriodOutOfRange'],
    )

    const createCloseTx = await contractAsAuthorized.createProgram(
      closeableProgramId,
      DEMO_PROGRAM.amountPerRecipient,
      DEMO_PROGRAM.startPeriod,
      DEMO_PROGRAM.endPeriod,
    )
    await createCloseTx.wait(1)
    const regCloseTx = await contractAsAuthorized.registerRecipients(closeableProgramId, [
      registeredCommitment,
    ])
    await regCloseTx.wait(1)
    const closeTx = await contractAsAuthorized.closeProgram(closeableProgramId)
    const closeReceipt = await closeTx.wait(1)

    const closedOutcome = await expectContractRevert(
      () =>
        contractAsAuthorized.recordDisbursement({
          refId: refIdFromDataId(`sp07-closed-${runSuffix}`),
          programId: closeableProgramId,
          periodId: DEMO_PROGRAM.startPeriod,
          recipientCommitment: registeredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: SAMPLE_CID_A,
        }),
      ['ProgramClosed'],
    )

    const pass = outOfRangeOutcome.pass && closedOutcome.pass
    results.push({
      scenarioId: 'SP-07',
      description: 'Periode di luar rentang atau setelah closeProgram ditolak kontrak',
      timestamp: new Date().toISOString(),
      txHash: String(closeReceipt?.hash ?? closeTx.hash).toLowerCase(),
      expected: 'PeriodOutOfRange & ProgramClosed',
      actual: `${outOfRangeOutcome.actual} & ${closedOutcome.actual}`,
      pass,
    })
  }

  // SP-08: Swap CID in MongoDB vs on-chain event -> reconciliation flags MISMATCH
  {
    const latestBlock = await rpc.getBlockNumber()
    const eventRefId = baseRefId.toLowerCase()

    await Settings.updateOne(
      { chainId: cfg.chainId, contractAddress: cfg.contractAddress },
      { $set: { lastIndexedBlock: latestBlock } },
      { upsert: true },
    )

    await ChainEvents.updateOne(
      { txHash: baseTxHash, logIndex: 0 },
      {
        $set: {
          blockNumber: Number(baseReceipt?.blockNumber ?? latestBlock),
          blockHash: String(baseReceipt?.blockHash ?? '0x' + '1'.repeat(64)),
          chainId: cfg.chainId,
          contractAddress: cfg.contractAddress,
          name: 'DisbursementRecorded',
          args: {
            refId: eventRefId,
            programId: programId.toLowerCase(),
            recipientCommitment: registeredCommitment.toLowerCase(),
            periodId: String(DEMO_PROGRAM.startPeriod),
            amount: String(DEMO_PROGRAM.amountPerRecipient),
            evidenceCid: SAMPLE_CID_A,
            recordedBy: authorizedWallet.address.toLowerCase(),
            recordedAt: String(Math.floor(Date.now() / 1000)),
          },
          at: new Date(),
        },
      },
      { upsert: true },
    )

    const progDoc = await Programs.findOne({ code: DEMO_PROGRAM.code }).lean()
    const recDoc = await Recipients.findOne({ status: 'FINAL' }).lean()

    const swappedDisb = await Disbursements.create({
      refId: eventRefId,
      programId: progDoc!._id as Types.ObjectId,
      recipientId: recDoc!._id as Types.ObjectId,
      periodId: DEMO_PROGRAM.startPeriod,
      commitment: registeredCommitment.toLowerCase(),
      amount: DEMO_PROGRAM.amountPerRecipient,
      status: 'SUCCESS',
      evidence: [
        {
          cid: SAMPLE_CID_B, // Swapped CID different from SAMPLE_CID_A on-chain
          mime: 'image/jpeg',
          size: 2048,
          sha256: 'b'.repeat(64),
          name: 'bukti-ditukar.jpg',
          access: 'PUBLIC',
          status: 'ACTIVE',
        },
      ],
      chain: {
        txHash: baseTxHash,
        blockNumber: Number(baseReceipt?.blockNumber ?? latestBlock),
        logIndex: 0,
        blockTimestamp: new Date(),
        from: authorizedWallet.address.toLowerCase(),
        confirmedAt: new Date(),
      },
    })

    try {
      const res = await reconciliationReport({
        request: new Request('http://localhost:3000/api/v1/reports/reconciliation?page=1&limit=50'),
        params: {},
        actor: {
          userId: '000000000000000000000001',
          role: 'AUDITOR',
          walletVerified: false,
          expiresAt: Date.now() + 60_000,
        },
      })
      const payload = (await res.json()) as {
        anomalies?: {
          inconsistentEvents?: Array<{ refId: string; txHash: string | null; code: string }>
        }
      }
      const mismatchItem = payload.anomalies?.inconsistentEvents?.find(
        (item) => item.refId.toLowerCase() === eventRefId,
      )
      results.push({
        scenarioId: 'SP-08',
        description: 'Penukaran CID di MongoDB vs event on-chain ditandai MISMATCH oleh rekonsiliasi',
        timestamp: new Date().toISOString(),
        txHash: baseTxHash,
        expected: 'MISMATCH',
        actual: mismatchItem?.code ?? 'NOT_DETECTED',
        pass: mismatchItem?.code === 'MISMATCH',
      })
    } finally {
      await Disbursements.deleteOne({ _id: swappedDisb._id })
      await ChainEvents.deleteOne({ txHash: baseTxHash, logIndex: 0 })
    }
  }

  // SP-09: Empty evidenceCid -> InvalidEvidenceCid
  {
    const refId = refIdFromDataId(`sp09-${runSuffix}`)
    const outcome = await expectContractRevert(
      () =>
        contractAsAuthorized.recordDisbursement({
          refId,
          programId,
          periodId: DEMO_PROGRAM.startPeriod + 1,
          recipientCommitment: registeredCommitment,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: '',
        }),
      ['InvalidEvidenceCid'],
    )
    results.push({
      scenarioId: 'SP-09',
      description: 'Pengiriman dengan evidenceCid kosong ditolak kontrak',
      timestamp: new Date().toISOString(),
      txHash: outcome.txHash,
      expected: 'InvalidEvidenceCid',
      actual: outcome.actual,
      pass: outcome.pass,
    })
  }

  for (const item of results) {
    writeScenarioEvidence(item)
  }

  return results
}

async function main() {
  try {
    const results = await runAllScenarios()
    console.table(
      results.map((r) => ({
        Skenario: r.scenarioId,
        Harapan: r.expected,
        Aktual: r.actual,
        Status: r.pass ? 'PASS' : 'FAIL',
        TxHash: r.txHash ?? '-',
      })),
    )
    const passedCount = results.filter((r) => r.pass).length
    console.info(`Ringkasan Skenario: ${passedCount}/${results.length} PASS`)
    if (passedCount !== results.length) {
      process.exitCode = 1
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eksekusi skenario gagal.'
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
