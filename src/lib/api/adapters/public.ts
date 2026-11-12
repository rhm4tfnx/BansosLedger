import type {
  ListEnvelope,
  PublicLedgerItemDto,
  PublicProgramDetailDto,
  PublicProgramDto,
  PublicStatusCheckDto,
  PublicSummaryDto,
} from '@/lib/api-contract'
import { formatPeriodId, formatRupiah, formatWitaDateTime, shortenHash } from '@/lib/format'
import type {
  PaginatedResult,
  PublicLedgerItemViewModel,
  PublicProgramDetailViewModel,
  PublicProgramViewModel,
  PublicRecentDisbursementItemViewModel,
  PublicRecentDisbursementsViewModel,
  PublicStatusCheckViewModel,
  PublicSummaryViewModel,
} from '@/types'

const PUBLIC_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draf',
  ACTIVE: 'Aktif',
  CLOSED: 'Ditutup',
  PENDING: 'Menunggu Konfirmasi',
  SUCCESS: 'Tersalurkan (Tercatat On-Chain)',
  FAILED: 'Gagal',
  ENROLLED: 'Terdaftar',
  REGISTERED_ONCHAIN: 'Terdaftar On-Chain',
  SUDAH_DISALURKAN: 'Sudah disalurkan',
  BELUM_DISALURKAN: 'Belum disalurkan',
}

export function toPublicSummaryViewModel(dto: PublicSummaryDto): PublicSummaryViewModel {
  return {
    programs: dto.programs,
    budget: dto.budget,
    budgetFormatted: formatRupiah(dto.budget),
    transactions: dto.transactions,
    amount: dto.amount,
    amountFormatted: formatRupiah(dto.amount),
  }
}

export function toPublicProgramViewModel(dto: PublicProgramDto): PublicProgramViewModel {
  const startPeriodLabel = formatPeriodId(dto.startPeriod)
  const endPeriodLabel = formatPeriodId(dto.endPeriod)
  const periodRangeLabel =
    dto.startPeriod === dto.endPeriod
      ? startPeriodLabel
      : `${startPeriodLabel} – ${endPeriodLabel}`

  return {
    code: dto.code,
    name: dto.name,
    description: dto.description,
    kind: dto.kind,
    kindLabel: dto.kind === 'TUNAI' ? 'Tunai' : dto.kind === 'BARANG' ? 'Barang' : dto.kind,
    fundSource: dto.fundSource,
    amountPerRecipient: dto.amountPerRecipient,
    amountPerRecipientFormatted: formatRupiah(dto.amountPerRecipient),
    totalBudget: dto.totalBudget,
    totalBudgetFormatted: formatRupiah(dto.totalBudget),
    startPeriod: dto.startPeriod,
    startPeriodLabel,
    endPeriod: dto.endPeriod,
    endPeriodLabel,
    periodRangeLabel,
    status: dto.status,
    statusLabel: PUBLIC_STATUS_LABELS[dto.status] ?? dto.status,
  }
}

export function toPublicProgramListViewModel(
  dto: ListEnvelope<PublicProgramDto>,
): PaginatedResult<PublicProgramViewModel> {
  return {
    items: dto.data.map(toPublicProgramViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  }
}

export function toPublicLedgerItemViewModel(dto: PublicLedgerItemDto): PublicLedgerItemViewModel {
  return {
    txHash: dto.txHash,
    txHashShort: shortenHash(dto.txHash),
    periodId: dto.period,
    periodLabel: formatPeriodId(dto.period),
    amount: dto.amount,
    amountFormatted: formatRupiah(dto.amount),
    time: dto.time,
    timeWita: formatWitaDateTime(dto.time),
  }
}

export function toPublicProgramDetailViewModel(
  dto: PublicProgramDetailDto,
): PublicProgramDetailViewModel {
  return {
    program: toPublicProgramViewModel(dto.program),
    ledger: {
      items: dto.ledger.data.map(toPublicLedgerItemViewModel),
      total: dto.ledger.total,
      page: dto.ledger.page,
      limit: dto.ledger.limit,
      totalPages: dto.ledger.totalPages,
    },
  }
}

export function aggregatePublicRecentDisbursements(
  details: readonly PublicProgramDetailViewModel[],
  options: {
    isProgramListTruncated?: boolean
    failedPrograms?: readonly string[]
  } = {},
): PublicRecentDisbursementsViewModel {
  const seenKeys = new Set<string>()
  const merged: PublicRecentDisbursementItemViewModel[] = []
  let isTruncated = Boolean(options.isProgramListTruncated)

  for (const detail of details) {
    if (detail.ledger.total > detail.ledger.items.length || detail.ledger.totalPages > 1) {
      isTruncated = true
    }
    for (let idx = 0; idx < detail.ledger.items.length; idx++) {
      const item = detail.ledger.items[idx]!
      const normalizedTxHash = item.txHash ? item.txHash.trim().toLowerCase() : null
      const dedupeKey = normalizedTxHash
        ? `tx:${normalizedTxHash}:${detail.program.code}:${item.periodId}`
        : `fallback:${detail.program.code}:${item.periodId}:${item.amount}:${item.time ?? idx}`

      if (seenKeys.has(dedupeKey)) continue
      seenKeys.add(dedupeKey)

      merged.push({
        ...item,
        programCode: detail.program.code,
        programName: detail.program.name,
        kindLabel: detail.program.kindLabel,
      })
    }
  }

  merged.sort((a, b) => {
    const timeA = a.time ? Date.parse(a.time) : Number.NaN
    const timeB = b.time ? Date.parse(b.time) : Number.NaN
    const validA = Number.isFinite(timeA)
    const validB = Number.isFinite(timeB)

    if (validA && validB && timeA !== timeB) {
      return timeB - timeA
    }
    if (validA && !validB) return -1
    if (!validA && validB) return 1

    if (a.periodId !== b.periodId) {
      return b.periodId - a.periodId
    }
    if (a.programCode !== b.programCode) {
      return a.programCode.localeCompare(b.programCode)
    }
    return (a.txHash ?? '').localeCompare(b.txHash ?? '')
  })

  const failedPrograms = [...(options.failedPrograms ?? [])]
  return {
    items: merged,
    totalFetched: merged.length,
    isTruncated,
    partialFailureCount: failedPrograms.length,
    failedPrograms,
  }
}

export function toPublicStatusCheckViewModel(
  dto: PublicStatusCheckDto,
): PublicStatusCheckViewModel {
  if (!dto.found) {
    return { found: false }
  }
  return {
    found: true,
    name: dto.name,
    entries: dto.entries.map((entry) => {
      const txHash = entry.txHash ?? null
      return {
        programCode: entry.program.code ?? '—',
        programName: entry.program.name ?? entry.program.code ?? 'Program Bantuan',
        periodId: entry.period,
        periodLabel: formatPeriodId(entry.period),
        status: entry.status,
        statusLabel: PUBLIC_STATUS_LABELS[entry.status] ?? entry.status,
        txHash,
        txHashShort: shortenHash(txHash),
      }
    }),
  }
}

