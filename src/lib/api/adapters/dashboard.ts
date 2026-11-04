import type { DashboardSummaryDto } from '@/lib/api-contract'
import { formatPeriodId, formatRupiah, formatWitaDateTime, shortenHash } from '@/lib/format'
import type { DashboardRecentTxViewModel, DashboardSummaryViewModel } from '@/types'
import { toNetworkStatusViewModel } from './chain'

function extractTxHashFromChain(chain: unknown): string | null {
  if (typeof chain === 'object' && chain !== null && 'txHash' in chain) {
    const candidate = (chain as Record<string, unknown>).txHash
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
  }
  return null
}

export function toDashboardRecentTxViewModel(
  dto: DashboardSummaryDto['recentTransactions'][number],
): DashboardRecentTxViewModel {
  const txHash = extractTxHashFromChain(dto.chain)
  return {
    id: dto.id,
    refId: dto.refId,
    refIdShort: shortenHash(dto.refId),
    programId: dto.programId,
    periodId: dto.periodId,
    periodLabel: formatPeriodId(dto.periodId),
    amount: dto.amount,
    amountFormatted: formatRupiah(dto.amount),
    status: dto.status,
    txHash,
    txHashShort: shortenHash(txHash),
    createdAt: dto.createdAt,
    createdAtWita: formatWitaDateTime(dto.createdAt),
  }
}

export function toDashboardSummaryViewModel(dto: DashboardSummaryDto): DashboardSummaryViewModel {
  return {
    activePrograms: dto.activePrograms,
    finalRecipients: dto.finalRecipients,
    pagu: dto.pagu,
    paguFormatted: formatRupiah(dto.pagu),
    realisasiCount: dto.realisasi.count,
    realisasiRupiah: dto.realisasi.rupiah,
    realisasiFormatted: formatRupiah(dto.realisasi.rupiah),
    percentage: dto.percentage,
    pending: dto.pending,
    failed: dto.failed,
    monthly: dto.monthly.map((point) => ({
      periodId: point.periodId,
      periodLabel: formatPeriodId(point.periodId),
      count: point.count,
      amount: point.amount,
      amountFormatted: formatRupiah(point.amount),
    })),
    byProgram: dto.byProgram.map((item) => ({
      code: item.code,
      name: item.name,
      count: item.count,
      amount: item.amount,
      amountFormatted: formatRupiah(item.amount),
    })),
    network: toNetworkStatusViewModel(dto.network),
    recentTransactions: dto.recentTransactions.map(toDashboardRecentTxViewModel),
  }
}

