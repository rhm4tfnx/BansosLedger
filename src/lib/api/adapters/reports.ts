import type {
  RealizationItemDto,
  RealizationReportDto,
  ReconciliationDto,
} from '@/lib/api-contract'
import { formatPeriodId, formatRupiah, formatWitaDate, shortenHash } from '@/lib/format'
import type {
  RealizationItemViewModel,
  RealizationReportViewModel,
  ReconciliationAnomalyViewModel,
  ReconciliationViewModel,
} from '@/types'
import { mapApiErrorCode } from '../errors'
import { toProgramSummaryMetricsViewModel } from './programs'

export function toRealizationItemViewModel(dto: RealizationItemDto): RealizationItemViewModel {
  return {
    id: dto.id,
    programId: dto.programId,
    refId: dto.refId,
    refIdShort: shortenHash(dto.refId),
    periodId: dto.periodId,
    periodLabel: formatPeriodId(dto.periodId),
    amount: dto.amount,
    amountFormatted: formatRupiah(dto.amount),
    disbursedDate: dto.disbursedDate,
    disbursedDateLabel: formatWitaDate(dto.disbursedDate),
    txHash: dto.txHash,
    txHashShort: shortenHash(dto.txHash),
    recipientName: dto.recipient?.name ?? '—',
    recipientNikMasked: dto.recipient?.nikMasked ?? '—',
  }
}

export function toRealizationReportViewModel(
  dto: RealizationReportDto,
): RealizationReportViewModel {
  return {
    filters: {
      programId: dto.filters.programId,
      period: dto.filters.period,
    },
    summary: toProgramSummaryMetricsViewModel(dto.summary),
    items: dto.data.map(toRealizationItemViewModel),
    txHashes: [...dto.txHashes],
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  }
}

function formatDiffValue(field: string, value: string | null): string {
  if (value === null || value === '') return '—'
  if (field === 'amount') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return formatRupiah(parsed)
  }
  if (field === 'periodId') {
    const parsed = Number(value)
    if (Number.isInteger(parsed)) return `${formatPeriodId(parsed)} (${parsed})`
  }
  return value
}

function toAnomalyViewModel(item: {
  refId: string
  txHash: string | null
  code: string
  diffs?: Array<{
    field: string
    label: string
    offChain: string | null
    onChain: string | null
  }>
}): ReconciliationAnomalyViewModel {
  return {
    refId: item.refId,
    refIdShort: shortenHash(item.refId),
    txHash: item.txHash,
    txHashShort: shortenHash(item.txHash),
    code: item.code,
    message: mapApiErrorCode(item.code),
    ...(item.diffs && item.diffs.length > 0
      ? {
          diffs: item.diffs.map((d) => ({
            field: d.field,
            label: d.label,
            offChain: formatDiffValue(d.field, d.offChain),
            onChain: formatDiffValue(d.field, d.onChain),
          })),
        }
      : {}),
  }
}

export function toReconciliationViewModel(dto: ReconciliationDto): ReconciliationViewModel {
  const missingEvents = dto.anomalies.missingEvents.map(toAnomalyViewModel)
  const inconsistentEvents = dto.anomalies.inconsistentEvents.map(toAnomalyViewModel)
  const isBalanced =
    dto.db.count === dto.chain.count &&
    dto.db.amount === dto.chain.amount &&
    missingEvents.length === 0 &&
    inconsistentEvents.length === 0

  return {
    dbCount: dto.db.count,
    dbAmount: dto.db.amount,
    dbAmountFormatted: formatRupiah(dto.db.amount),
    chainCount: dto.chain.count,
    chainAmount: dto.chain.amount,
    chainAmountFormatted: formatRupiah(dto.chain.amount),
    isBalanced,
    indexedThrough: dto.indexedThrough,
    missingEvents,
    inconsistentEvents,
    anomalyPage: dto.anomalies.page,
    limitPerCategory: dto.anomalies.limitPerCategory,
  }
}

