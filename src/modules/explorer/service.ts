import 'server-only'
import { z } from 'zod'
import { ledgerABI, ledgerInterface } from '@/lib/blockchain/abi'
import { ChainEvents, Programs } from '@/lib/db/models'
import { connectDatabase } from '@/lib/db/connection'
import { chainConfig, provider, readChain } from '@/modules/chain/config'
import { chainVerifier } from '@/modules/chain/verifier'
import { networkStatus } from '@/modules/chain/network'
import { toNetworkStatusDto } from '@/modules/chain/dto'
import {
  toExplorerBlockDto,
  toExplorerBlockListDto,
  toExplorerTxDto,
  toExplorerAddressDto,
  toExplorerContractDto,
  toExplorerValidatorsDto,
  toExplorerSearchDto,
} from './dto'
import { gatewayUrl, cidSchema } from '@/modules/evidence/pinata'
import { json, notFound, pageQuery } from '@/modules/domain/http'
const hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/), address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
export function safeEvent(args: Record<string, unknown>) {
  const cid = String(args.evidenceCid ?? ''), timestamp = Number(args.recordedAt)
  const time = Number.isSafeInteger(timestamp) && timestamp > 0 && timestamp < 8640000000000 ? new Date(timestamp * 1000) : null
  return { refId: args.refId, programId: args.programId, period: Number(args.periodId), amount: String(args.amount), commitment: args.recipientCommitment, cid, gatewayUrl: cidSchema.safeParse(cid).success ? gatewayUrl(cid) : null, recordedBy: args.recordedBy, utc: time?.toISOString() ?? null, wita: time ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'long', timeZone: 'Asia/Makassar' }).format(time) : null }
}
async function blockData(n: number) {
  const value = await readChain(() => provider().getBlock(n)); if (!value) notFound()
  return { number: value.number, hash: value.hash, parentHash: value.parentHash, timestamp: value.timestamp, proposer: value.miner, transactionCount: value.transactions.length }
}
export async function blocks(request: Request) {
  const { page, limit: rawLimit } = pageQuery(request)
  const limit = Math.min(rawLimit, 20), latest = await readChain(() => provider().getBlockNumber())
  const start = latest - (page - 1) * limit
  const data = await Promise.all(Array.from({ length: Math.max(0, Math.min(limit, start + 1)) }, (_, i) => blockData(start - i)))
  return json(toExplorerBlockListDto({ data, page, limit, total: latest + 1 }))
}
export async function block(_request: Request, params: Record<string, string>) { return json(toExplorerBlockDto(await blockData(z.coerce.number().int().nonnegative().safe().parse(params.n)))) }
async function loadProgramMetaMap(
  programIds: string[],
): Promise<Map<string, { code: string; name: string; totalBudget: number | null }>> {
  const map = new Map<string, { code: string; name: string; totalBudget: number | null }>()
  const uniqueLower = Array.from(new Set(programIds.filter(Boolean).map((id) => id.toLowerCase())))
  if (uniqueLower.length === 0) return map
  try {
    await connectDatabase()
    const candidates = Array.from(
      new Set([...uniqueLower, ...programIds.filter(Boolean)]),
    )
    const rows = await Programs.find({ programId: { $in: candidates } })
      .select('programId code name totalBudget')
      .lean()
    for (const row of rows) {
      if (!row?.programId) continue
      map.set(String(row.programId).toLowerCase(), {
        code: String(row.code ?? ''),
        name: String(row.name ?? ''),
        totalBudget:
          row.totalBudget != null && Number.isFinite(Number(row.totalBudget))
            ? Number(row.totalBudget)
            : null,
      })
    }
  } catch {
    // Off-chain enrichment is best-effort; on-chain receipt data remains authoritative.
  }
  return map
}

type RawDecodedTxEvent =
  | ({ name: 'DisbursementRecorded' } & ReturnType<typeof safeEvent>)
  | {
      name: 'ProgramCreated'
      programId: string
      amountPerRecipient: string
      startPeriod: number
      endPeriod: number
    }
  | {
      name: 'RecipientsRegistered'
      programId: string
      count: number
    }
  | {
      name: 'ProgramClosed'
      programId: string
      status: 'CLOSED'
    }

export async function transaction(_request: Request, params: Record<string, string>) {
  const txHash = hash.parse(params.hash), rpc = provider(), config = chainConfig()
  const receipt = await readChain(() => rpc.getTransactionReceipt(txHash)); if (!receipt) notFound()
  const block = await readChain(() => rpc.getBlock(receipt.blockNumber)); if (!block) notFound()
  const rawEvents = receipt.logs.flatMap<RawDecodedTxEvent>(log => {
    if (log.address.toLowerCase() !== config.address) return []
    try {
      const parsed = ledgerInterface.parseLog(log)
      if (!parsed) return []
      const args = Object.fromEntries(
        parsed.fragment.inputs.map((field, i) => [field.name, parsed.args[i]]),
      )
      if (parsed.name === 'DisbursementRecorded') {
        return [{ name: 'DisbursementRecorded' as const, ...safeEvent(args) }]
      }
      if (parsed.name === 'ProgramCreated') {
        return [
          {
            name: 'ProgramCreated' as const,
            programId: String(args.programId ?? ''),
            amountPerRecipient: String(args.amountPerRecipient ?? '0'),
            startPeriod: Number(args.startPeriod ?? 0),
            endPeriod: Number(args.endPeriod ?? 0),
          },
        ]
      }
      if (parsed.name === 'RecipientsRegistered') {
        return [
          {
            name: 'RecipientsRegistered' as const,
            programId: String(args.programId ?? ''),
            count: Number(args.count ?? 0),
          },
        ]
      }
      if (parsed.name === 'ProgramClosed') {
        return [
          {
            name: 'ProgramClosed' as const,
            programId: String(args.programId ?? ''),
            status: 'CLOSED' as const,
          },
        ]
      }
      return []
    } catch { return [] }
  })
  const programMetaMap = await loadProgramMetaMap(
    rawEvents.map(ev => String(ev.programId ?? '')),
  )
  const events = rawEvents.map(ev => {
    if (ev.name === 'DisbursementRecorded') return ev
    const meta = programMetaMap.get(String(ev.programId ?? '').toLowerCase()) ?? null
    return { ...ev, program: meta }
  })
  return json(toExplorerTxDto({ txHash, from: receipt.from, to: receipt.to, blockNumber: receipt.blockNumber, status: receipt.status === 1 ? 'SUCCESS' : 'REVERTED', utc: new Date(block.timestamp * 1000).toISOString(), events }))
}
export async function addressDetails(request: Request, params: Record<string, string>) {
  const addr = address.parse(params.addr).toLowerCase(); await connectDatabase()
  const paging = pageQuery(request, ['createdAt', 'blockNumber'])
  const config = chainConfig(), filter = { name: 'DisbursementRecorded', chainId: config.chainId, contractAddress: config.address, 'args.recordedBy': addr }
  const [rows, total] = await Promise.all([ChainEvents.find(filter).sort({ blockNumber: -1, logIndex: -1 }).skip(paging.skip).limit(paging.limit).lean(), ChainEvents.countDocuments(filter)])
  return json(toExplorerAddressDto({ address: addr, data: rows.map(row => ({ txHash: row.txHash, ...safeEvent(row.args) })), total, page: paging.page, limit: paging.limit }))
}
export async function contract() { return json(toExplorerContractDto({ address: chainConfig().address, ...await chainVerifier.walletStatus(), abi: ledgerABI })) }
export async function validators() { const status = await networkStatus(); return json(toExplorerValidatorsDto({ data: status.validators, count: status.validatorCount })) }
export async function network() { const status = await networkStatus(); const { validators: _validators, ...publicStatus } = status; return json(toNetworkStatusDto(publicStatus)) }
export async function search(request: Request) {
  const q = z.string().min(1).max(66).parse(new URL(request.url).searchParams.get('q'))
  if (/^\d+$/.test(q)) return block(request, { n: q })
  if (address.safeParse(q).success) return addressDetails(request, { addr: q })
  hash.parse(q); await connectDatabase()
  const config = chainConfig(), normalized = q.toLowerCase()
  const rows = await ChainEvents.find({ chainId: config.chainId, contractAddress: config.address, name: 'DisbursementRecorded', $or: [{ txHash: normalized }, { 'args.refId': normalized }, { 'args.recipientCommitment': normalized }] }).sort({ blockNumber: -1 }).limit(100).lean()
  if (rows.length) return json(toExplorerSearchDto({ data: rows.map(row => ({ txHash: row.txHash, ...safeEvent(row.args) })), limit: 100 }))
  return transaction(request, { hash: q })
}
