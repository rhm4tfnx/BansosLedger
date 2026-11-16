import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers'
import { DEMO_PROGRAM } from '../seed-demo'
import { isLocalhostRpcUrl } from '../scenarios/run-scenarios'
import { ledgerABI } from '../../src/lib/blockchain/abi'
import { programIdFromCode, refIdFromDataId } from '../../src/lib/blockchain/chain-keys'

export interface PerfBatchMetrics {
  batchSize: number
  successCount: number
  failCount: number
  successRatePercent: number
  p50Ms: number
  p95Ms: number
  maxMs: number
  meanMs: number
}

export interface PerfEnvConfig {
  chainId: number
  rpcUrl: string
  contractAddress: string
  authorizedKey: string
}

export function assertPerfEnvironment(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): PerfEnvConfig {
  if (env.PERF_ALLOW !== 'true') {
    throw new Error('Eksekusi uji beban ditolak: PERF_ALLOW harus bernilai "true".')
  }
  const rpcUrl = env.RPC_URL_SERVER?.trim() ?? ''
  if (!isLocalhostRpcUrl(rpcUrl)) {
    throw new Error(
      `Eksekusi uji beban ditolak: RPC_URL_SERVER harus mengarah ke localhost atau 127.0.0.1 (diterima: "${rpcUrl}").`,
    )
  }
  const chainId = Number(env.NEXT_PUBLIC_CHAIN_ID ?? '250204')
  if (chainId !== 250204) {
    throw new Error(`NEXT_PUBLIC_CHAIN_ID harus 250204 (diterima: "${env.NEXT_PUBLIC_CHAIN_ID ?? ''}").`)
  }
  const contractAddress = env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ?? ''
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS tidak valid atau belum diatur.')
  }
  const authorizedKey = (env.SCENARIO_AUTHORIZED_KEY ?? env.PERF_AUTHORIZED_KEY ?? '').trim()
  if (!/^0x[0-9a-fA-F]{64}$/.test(authorizedKey)) {
    throw new Error(
      'SCENARIO_AUTHORIZED_KEY (atau PERF_AUTHORIZED_KEY) wajib berupa private key 32-byte (0x + 64 hex).',
    )
  }
  return {
    chainId,
    rpcUrl,
    contractAddress: contractAddress.toLowerCase(),
    authorizedKey,
  }
}

export function parseBatchSizes(raw = '10,50,100,200'): number[] {
  const sizes = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isSafeInteger(n) && n > 0 && n <= 1000)
  if (sizes.length === 0) {
    throw new Error('Argumen --n tidak valid. Contoh: --n 10,50,100,200')
  }
  return sizes
}

export function computeLatencyStats(
  batchSize: number,
  latenciesMs: number[],
  failCount: number,
): PerfBatchMetrics {
  const sorted = [...latenciesMs].sort((a, b) => a - b)
  const successCount = sorted.length
  const total = successCount + failCount
  const percentile = (p: number): number => {
    if (sorted.length === 0) return 0
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
    return Math.round(sorted[idx]! * 100) / 100
  }
  const sum = sorted.reduce((acc, v) => acc + v, 0)
  return {
    batchSize,
    successCount,
    failCount,
    successRatePercent: total > 0 ? Math.round((successCount / total) * 10000) / 100 : 0,
    p50Ms: percentile(50),
    p95Ms: percentile(95),
    maxMs: sorted.length > 0 ? Math.round(sorted[sorted.length - 1]! * 100) / 100 : 0,
    meanMs: sorted.length > 0 ? Math.round((sum / sorted.length) * 100) / 100 : 0,
  }
}

export function formatMetricsCsv(rows: PerfBatchMetrics[], timestampIso: string): string {
  const header = [
    'timestamp',
    'batch_n',
    'success_count',
    'fail_count',
    'success_rate_pct',
    'p50_ms',
    'p95_ms',
    'max_ms',
    'mean_ms',
  ].join(',')
  const lines = rows.map((r) =>
    [
      timestampIso,
      r.batchSize,
      r.successCount,
      r.failCount,
      r.successRatePercent,
      r.p50Ms,
      r.p95Ms,
      r.maxMs,
      r.meanMs,
    ].join(','),
  )
  return [header, ...lines].join('\n') + '\n'
}

const PERF_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

export async function runDisbursementLoad(batchSizes: number[]): Promise<{
  metrics: PerfBatchMetrics[]
  csvPath: string
}> {
  const cfg = assertPerfEnvironment(process.env)
  const rpc = new JsonRpcProvider(cfg.rpcUrl, cfg.chainId, { staticNetwork: true })
  const signer = new Wallet(cfg.authorizedKey, rpc)
  const contract = new Contract(cfg.contractAddress, ledgerABI, signer)

  const runId = Date.now().toString(36).toUpperCase()
  const metrics: PerfBatchMetrics[] = []

  for (const n of batchSizes) {
    const programId = programIdFromCode(`PERF-${n}-${runId}`)
    const createTx = await contract.createProgram(
      programId,
      DEMO_PROGRAM.amountPerRecipient,
      DEMO_PROGRAM.startPeriod,
      DEMO_PROGRAM.endPeriod,
    )
    await createTx.wait(1)

    const commitments = Array.from({ length: n }, (_, idx) =>
      keccak256(toUtf8Bytes(`perf-commitment-${runId}-${n}-${idx}`)),
    )

    // Register commitments in chunks of <= 100 (contract limit per call)
    for (let offset = 0; offset < commitments.length; offset += 100) {
      const chunk = commitments.slice(offset, offset + 100)
      const regTx = await contract.registerRecipients(programId, chunk)
      await regTx.wait(1)
    }

    const latenciesMs: number[] = []
    let failCount = 0

    for (let i = 0; i < n; i++) {
      const refId = refIdFromDataId(`perf-ref-${runId}-${n}-${i}`)
      const start = performance.now()
      try {
        const tx = await contract.recordDisbursement({
          refId,
          programId,
          periodId: DEMO_PROGRAM.startPeriod,
          recipientCommitment: commitments[i]!,
          amount: DEMO_PROGRAM.amountPerRecipient,
          evidenceCid: PERF_CID,
        })
        await tx.wait(1)
        latenciesMs.push(performance.now() - start)
      } catch {
        failCount++
      }
    }

    metrics.push(computeLatencyStats(n, latenciesMs, failCount))
  }

  const timestampIso = new Date().toISOString()
  const safeDate = timestampIso.replace(/[:.]/g, '-')
  const outDir = join(process.cwd(), 'docs', 'evidence', 'PF')
  mkdirSync(outDir, { recursive: true })
  const csvContent = formatMetricsCsv(metrics, timestampIso)
  const csvPath = join(outDir, `disbursement-load-${safeDate}.csv`)
  writeFileSync(csvPath, csvContent, 'utf8')
  writeFileSync(join(outDir, 'latest.csv'), csvContent, 'utf8')

  return { metrics, csvPath }
}

async function main() {
  try {
    const { values } = parseArgs({
      allowPositionals: true,
      options: {
        n: { type: 'string', default: '10,50,100,200' },
      },
    })
    const batchSizes = parseBatchSizes(values.n)
    const { metrics, csvPath } = await runDisbursementLoad(batchSizes)
    console.table(
      metrics.map((m) => ({
        'Batch (N)': m.batchSize,
        Sukses: m.successCount,
        Gagal: m.failCount,
        'Tingkat Sukses (%)': m.successRatePercent,
        'p50 (ms)': m.p50Ms,
        'p95 (ms)': m.p95Ms,
        'Max (ms)': m.maxMs,
        'Mean (ms)': m.meanMs,
      })),
    )
    console.info(`Hasil uji beban disimpan ke: ${csvPath}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Uji beban penyaluran gagal.'
    console.error(message)
    process.exitCode = 1
  }
}

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isDirectExecution) {
  void main()
}
