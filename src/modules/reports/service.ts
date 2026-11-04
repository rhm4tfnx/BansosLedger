import 'server-only'
import { z } from 'zod'
import type { FilterQuery } from 'mongoose'
import { Programs, Recipients, Enrollments, Disbursements } from '@/lib/db/models'
import { chainVerifier } from '../chain/verifier'
import { networkStatus } from '../chain/network'
import { toRealizationReportDto, toDashboardSummaryDto, toWalletStatusDto } from './dto'
import { audit, idSchema, json, oid, pageQuery, periodSchema, query, type DomainContext } from '../domain/http'

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value)
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
function row(values: unknown[]) { return values.map(csvCell).join(',') }
async function realizationData(request: Request) {
  const paging = pageQuery(request, ['createdAt', 'periodId', 'amount', 'disbursedDate'])
  const filters = z.object({ programId: idSchema.optional(), period: z.coerce.number().pipe(periodSchema).optional() }).parse(query(request))
  const programs = await Programs.find(filters.programId ? { _id: oid(filters.programId) } : {}).select('code name totalBudget').lean()
  const ids = programs.map(program => program._id)
  const match: FilterQuery<unknown> = { programId: { $in: ids }, status: 'SUCCESS', deletedAt: null, ...(filters.period ? { periodId: filters.period } : {}) }
  const [target, totals, data] = await Promise.all([
    Enrollments.countDocuments({ programId: { $in: ids } }),
    Disbursements.aggregate<{ count: number; rupiah: number }>([{ $match: match }, { $group: { _id: null, count: { $sum: 1 }, rupiah: { $sum: '$amount' } } }]),
    Disbursements.aggregate<{ _id: string; programId: string; refId: string; periodId: number; amount: number; disbursedDate: Date; txHash: string; recipient?: { name: string; nikMasked: string } }>([
      { $match: match }, { $sort: paging.sort }, { $skip: paging.skip }, { $limit: paging.limit },
      { $lookup: { from: 'recipients', localField: 'recipientId', foreignField: '_id', pipeline: [{ $project: { _id: 0, name: 1, nikMasked: 1 } }], as: 'recipient' } },
      { $project: { _id: 1, programId: 1, refId: 1, periodId: 1, amount: 1, disbursedDate: 1, txHash: '$chain.txHash', recipient: { $arrayElemAt: ['$recipient', 0] } } },
    ]),
  ])
  const pagu = programs.reduce((sum, program) => sum + (program.totalBudget ?? 0), 0)
  const realisasi = totals[0] ? { count: totals[0].count, rupiah: totals[0].rupiah } : { count: 0, rupiah: 0 }
  return { filters, summary: { pagu, target, realisasi, sisa: pagu - realisasi.rupiah, percentage: pagu ? realisasi.rupiah / pagu * 100 : 0 }, data, txHashes: data.map(item => item.txHash), total: realisasi.count, page: paging.page, limit: paging.limit }
}
export async function realization(ctx: DomainContext) { return json(toRealizationReportDto(await realizationData(ctx.request))) }
export async function exportCSV(ctx: DomainContext) {
  z.object({ format: z.literal('csv') }).parse(query(ctx.request))
  const result = await realizationData(ctx.request)
  const lines = [
    row(['Laporan realisasi penyaluran']), row(['Dibuat oleh', ctx.actor.userId, ctx.actor.role]), row(['Dibuat pada', new Date().toISOString()]),
    row(['Filter', JSON.stringify(result.filters)]), row(['Halaman', result.page, 'Limit', result.limit, 'Total transaksi', result.total]),
    row(['Pagu', result.summary.pagu, 'Target', result.summary.target, 'Realisasi', result.summary.realisasi.rupiah, 'Sisa', result.summary.sisa, 'Persen', result.summary.percentage]),
    row(['Ref ID', 'Program ID', 'Periode', 'Nama', 'NIK Masked', 'Nominal', 'Tanggal', 'TxHash']),
    ...result.data.map(item => row([item.refId, item.programId, item.periodId, item.recipient?.name, item.recipient?.nikMasked, item.amount, item.disbursedDate?.toISOString(), item.txHash])),
  ]
  await audit(ctx, 'REPORT_EXPORTED', 'reports', 'realization', { filters: result.filters, page: result.page, limit: result.limit })
  return new Response('\uFEFF' + lines.join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="realisasi.csv"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
export async function dashboard(_ctx: DomainContext) {
  const [activePrograms, finalRecipients, programTotals, totals, pending, failed, recentTransactions, network] = await Promise.all([
    Programs.countDocuments({ status: 'ACTIVE' }), Recipients.countDocuments({ status: 'FINAL', deletedAt: null }),
    Programs.aggregate<{ pagu: number }>([{ $group: { _id: null, pagu: { $sum: '$totalBudget' } } }]),
    Disbursements.aggregate<{ count: number; rupiah: number }>([{ $match: { status: 'SUCCESS', deletedAt: null } }, { $group: { _id: null, count: { $sum: 1 }, rupiah: { $sum: '$amount' } } }]),
    Disbursements.countDocuments({ status: 'PENDING', deletedAt: null }), Disbursements.countDocuments({ status: 'FAILED', deletedAt: null }),
    Disbursements.find({ deletedAt: null, status: { $in: ['PENDING', 'SUCCESS', 'FAILED'] } }).select('refId programId periodId amount status chain createdAt updatedAt').sort({ updatedAt: -1, _id: -1 }).limit(10).lean(), networkStatus(),
  ])
  const pagu = programTotals[0]?.pagu ?? 0, realisasi = totals[0] ? { count: totals[0].count, rupiah: totals[0].rupiah } : { count: 0, rupiah: 0 }
  return json(toDashboardSummaryDto({ activePrograms, finalRecipients, pagu, realisasi, percentage: pagu ? realisasi.rupiah / pagu * 100 : 0, pending, failed, network, recentTransactions }))
}
export async function wallet(ctx: DomainContext) {
  return json(toWalletStatusDto({ ...await chainVerifier.walletStatus(), boundWallet: ctx.actor.role === 'OPERATOR_KELURAHAN' ? ctx.actor.boundWalletAddress ?? null : null }))
}
