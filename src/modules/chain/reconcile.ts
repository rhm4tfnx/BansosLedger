import 'server-only'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { Types } from 'mongoose'
import { getEnv } from '@/lib/env'
import { connectDatabase } from '@/lib/db/connection'
import { ChainEvents, Disbursements, Settings } from '@/lib/db/models'
import { ledgerInterface } from '@/lib/blockchain/abi'
import { confirm } from '@/modules/disbursements/service'
import { toReconciliationDto } from './dto'
import { DomainError, duplicate, json, pageQuery, type DomainContext } from '@/modules/domain/http'
import { chainConfig, provider, readChain, chainDeadline, assertDeadline } from './config'
export function requireCron(request: Request) {
  const secret = getEnv('CRON_SECRET')
  if (!secret) throw new DomainError(503, 'CRON_NOT_CONFIGURED', 'Cron belum dikonfigurasi.')
  const candidate = request.headers.get('authorization') ?? ''
  const hash = (value: string) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(hash(candidate), hash(`Bearer ${secret}`))) throw new DomainError(401, 'UNAUTHORIZED', 'Akses cron ditolak.')
}
async function settingsId() {
  const config = chainConfig()
  const existing = await Settings.findOne({ chainId: config.chainId, contractAddress: config.address }).select('_id').maxTimeMS(3000).lean()
  return existing?._id ?? new Types.ObjectId(createHash('sha256').update(`${config.chainId}:${config.address}`).digest('hex').slice(0, 24))
}
async function run(request: Request) {
  await connectDatabase()
  const config = chainConfig(), rpc = provider(), _id = await settingsId(), token = randomUUID()
  let state
  try {
    state = await Settings.findOneAndUpdate({ _id, $or: [{ 'reconcileLease.expiresAt': { $lte: new Date() } }, { 'reconcileLease.token': { $exists: false } }] }, { $set: { chainId: config.chainId, contractAddress: config.address, reconcileLease: { token, expiresAt: new Date(Date.now() + 65000) } }, $setOnInsert: { lastIndexedBlock: -1 } }, { upsert: true, new: true }).lean()
  } catch (error) { if (duplicate(error)) return json({ status: 'busy' }, 202); throw error }
  if (!state) return json({ status: 'busy' }, 202)
  let indexed = 0, confirmed = 0, failures = 0
  try {
    const latest = await readChain(() => rpc.getBlockNumber(), 0)
    for (let start = (state.lastIndexedBlock ?? -1) + 1; start <= latest && Date.now() < (chainDeadline.getStore()! - 20000); start += 200) {
      const end = Math.min(latest, start + 199)
      const logs = await readChain(() => rpc.getLogs({ address: config.address, fromBlock: start, toBlock: end }), 0)
      for (const log of logs) {
        assertDeadline()
        const parsed = ledgerInterface.parseLog(log); if (!parsed) continue
        const args = Object.fromEntries(parsed.fragment.inputs.map((input, i) => { const value = parsed.args[i]; return [input.name, typeof value === 'bigint' ? value.toString() : typeof value === 'string' && value.startsWith('0x') ? value.toLowerCase() : value] }))
        await ChainEvents.updateOne({ txHash: log.transactionHash.toLowerCase(), logIndex: log.index }, { $set: { blockNumber: log.blockNumber, blockHash: log.blockHash, chainId: config.chainId, contractAddress: config.address, name: parsed.name, args, at: args.recordedAt ? new Date(Number(args.recordedAt) * 1000) : new Date() } }, { upsert: true, maxTimeMS: 3000 })
        indexed++
      }
      assertDeadline()
      await Settings.updateOne({ _id, 'reconcileLease.token': token }, { $set: { lastIndexedBlock: end } }, { maxTimeMS: 3000 })
    }
    const pending = await Disbursements.find({ status: 'PENDING', deletedAt: null, updatedAt: { $lt: new Date(Date.now() - 120000) } }).sort({ updatedAt: 1 }).limit(50).maxTimeMS(3000).lean()
    for (const row of pending) {
      if (Date.now() >= chainDeadline.getStore()! - 4000) break
      try {
        let txHash = row.chain?.txHash
        if (!txHash) {
          const topic = ledgerInterface.getEvent('DisbursementRecorded')!.topicHash
          const logs = await readChain(() => rpc.getLogs({ address: config.address, fromBlock: 0, toBlock: latest, topics: [topic, row.refId] }), 0)
          if (logs.length !== 1) continue
          txHash = logs[0].transactionHash.toLowerCase()
          assertDeadline()
          await Disbursements.updateOne({ _id: row._id, status: 'PENDING', $or: [{ 'chain.txHash': null }, { 'chain.txHash': { $exists: false } }] }, { $set: { 'chain.txHash': txHash } }, { maxTimeMS: 3000 })
        }
        assertDeadline()
        // System principal is not an authenticated browser session; only the secret-gated cron invokes it.
        const response = await confirm({ request: new Request(request.url, { method: 'POST', body: JSON.stringify({ txHash }) }), params: { id: String(row._id) }, actor: { userId: '000000000000000000000000', role: 'OPERATOR_KELURAHAN', walletVerified: false, expiresAt: Date.now() + 60000 } })
        if (response.status === 200) confirmed++
      } catch { failures++ }
    }
    return json({ indexed, processed: confirmed, failures })
  } finally { await Settings.updateOne({ _id, 'reconcileLease.token': token }, { $unset: { reconcileLease: 1 } }, { maxTimeMS: 3000 }) }
}
export async function reconcile(request: Request) { requireCron(request); return chainDeadline.run(Date.now() + 55000, () => run(request)) }
export interface ReconciliationDiff {
  field: string
  label: string
  offChain: string | null
  onChain: string | null
}

function buildMismatchDiffs(row: {
  txHash?: string | null
  recordStatus?: string | null
  recordDeletedAt?: Date | string | null
  recordTxHash?: string | null
  recordAmount?: number | string | null
  recordPeriodId?: number | string | null
  recordCommitment?: string | null
  recordEvidenceCid?: string | null
  eventAmount?: string | number | null
  eventPeriodId?: string | number | null
  eventCommitment?: string | null
  eventEvidenceCid?: string | null
}): ReconciliationDiff[] {
  const diffs: ReconciliationDiff[] = []
  const norm = (val: unknown) => (val == null ? null : String(val))

  if (row.recordStatus !== 'SUCCESS' || row.recordDeletedAt != null) {
    diffs.push({
      field: 'status',
      label: 'Status / Penghapusan',
      offChain: row.recordDeletedAt != null ? `${row.recordStatus ?? '—'} (dihapus)` : norm(row.recordStatus),
      onChain: 'SUCCESS (aktif)',
    })
  }
  const offTx = norm(row.recordTxHash)
  const onTx = norm(row.txHash)
  if ((offTx ?? '').toLowerCase() !== (onTx ?? '').toLowerCase()) {
    diffs.push({
      field: 'txHash',
      label: 'TxHash',
      offChain: offTx,
      onChain: onTx,
    })
  }
  const offAmount = norm(row.recordAmount)
  const onAmount = norm(row.eventAmount)
  if (offAmount !== onAmount) {
    diffs.push({
      field: 'amount',
      label: 'Nominal bantuan',
      offChain: offAmount,
      onChain: onAmount,
    })
  }
  const offPeriod = norm(row.recordPeriodId)
  const onPeriod = norm(row.eventPeriodId)
  if (offPeriod !== onPeriod) {
    diffs.push({
      field: 'periodId',
      label: 'Periode',
      offChain: offPeriod,
      onChain: onPeriod,
    })
  }
  const offCommit = norm(row.recordCommitment)
  const onCommit = norm(row.eventCommitment)
  if ((offCommit ?? '').toLowerCase() !== (onCommit ?? '').toLowerCase()) {
    diffs.push({
      field: 'commitment',
      label: 'Commitment penerima',
      offChain: offCommit,
      onChain: onCommit,
    })
  }
  const offCid = norm(row.recordEvidenceCid)
  const onCid = norm(row.eventEvidenceCid)
  if (offCid !== onCid) {
    diffs.push({
      field: 'evidenceCid',
      label: 'CID bukti IPFS',
      offChain: offCid,
      onChain: onCid,
    })
  }
  return diffs
}

export async function report(ctx: DomainContext) {
  await connectDatabase()
  const config = chainConfig(), paging = pageQuery(ctx.request), state = await Settings.findById(await settingsId()).lean()
  const chainMatch = { chainId: config.chainId, contractAddress: config.address, name: 'DisbursementRecorded' }
  const dbMatch = { status: 'SUCCESS', deletedAt: null }
  const [db, chain, missing, rawOrphaned] = await Promise.all([
    Disbursements.aggregate([{ $match: dbMatch }, { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $toDecimal: '$amount' } } } }]).option({ maxTimeMS: 5000 }),
    ChainEvents.aggregate([{ $match: chainMatch }, { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $convert: { input: '$args.amount', to: 'decimal', onError: 0, onNull: 0 } } } } }]).option({ maxTimeMS: 5000 }),
    Disbursements.aggregate([{ $match: { ...dbMatch, 'chain.blockNumber': { $lte: state?.lastIndexedBlock ?? -1 } } }, { $lookup: { from: 'chain_events', let: { hash: '$chain.txHash', ref: '$refId' }, pipeline: [{ $match: { ...chainMatch, $expr: { $and: [{ $eq: ['$txHash', '$$hash'] }, { $eq: ['$args.refId', '$$ref'] }] } } }], as: 'events' } }, { $match: { $expr: { $ne: [{ $size: '$events' }, 1] } } }, { $sort: { _id: 1 } }, { $skip: paging.skip }, { $limit: paging.limit }, { $project: { _id: 0, refId: 1, txHash: '$chain.txHash', code: { $literal: 'DB_SUCCESS_WITHOUT_EVENT' } } }]).option({ maxTimeMS: 5000 }),
    ChainEvents.aggregate([{ $match: chainMatch }, { $lookup: { from: 'disbursements', localField: 'args.refId', foreignField: 'refId', as: 'records' } }, { $set: { record: { $arrayElemAt: ['$records', 0] } } }, { $match: { $expr: { $or: [{ $ne: [{ $ifNull: ['$record.status', ''] }, 'SUCCESS'] }, { $ne: [{ $ifNull: ['$record.deletedAt', null] }, null] }, { $ne: ['$record.chain.txHash', '$txHash'] }, { $ne: [{ $toString: '$record.amount' }, '$args.amount'] }, { $ne: [{ $toString: '$record.periodId' }, '$args.periodId'] }, { $ne: ['$record.commitment', '$args.recipientCommitment'] }, { $ne: [{ $arrayElemAt: ['$record.evidence.cid', 0] }, '$args.evidenceCid'] }] } } }, { $sort: { blockNumber: 1, logIndex: 1 } }, { $skip: paging.skip }, { $limit: paging.limit }, { $project: { _id: 0, txHash: 1, refId: '$args.refId', code: { $cond: [{ $eq: ['$record.status', 'SUCCESS'] }, 'MISMATCH', 'EVENT_WITHOUT_DB_SUCCESS'] }, recordStatus: '$record.status', recordDeletedAt: '$record.deletedAt', recordTxHash: '$record.chain.txHash', recordAmount: '$record.amount', recordPeriodId: '$record.periodId', recordCommitment: '$record.commitment', recordEvidenceCid: { $arrayElemAt: ['$record.evidence.cid', 0] }, eventAmount: '$args.amount', eventPeriodId: '$args.periodId', eventCommitment: '$args.recipientCommitment', eventEvidenceCid: '$args.evidenceCid' } }]).option({ maxTimeMS: 5000 }),
  ])
  const orphaned = rawOrphaned.map((item) => {
    const base = { txHash: item.txHash, refId: item.refId, code: item.code }
    if (item.code === 'MISMATCH') {
      return { ...base, diffs: buildMismatchDiffs(item) }
    }
    return base
  })
  return json(toReconciliationDto({ db: { count: db[0]?.count ?? 0, amount: db[0]?.amount?.toString() ?? '0' }, chain: { count: chain[0]?.count ?? 0, amount: chain[0]?.amount?.toString() ?? '0' }, indexedThrough: state?.lastIndexedBlock ?? -1, anomalies: { missingEvents: missing, inconsistentEvents: orphaned, page: paging.page, limitPerCategory: paging.limit } }))
}
