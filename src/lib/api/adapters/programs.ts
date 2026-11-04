import { z } from 'zod'
import {
  programDtoSchema,
  type EnrollmentStatus,
  type ListEnvelope,
  type ProgramDto,
  type ProgramEnrollmentItemDto,
  type ProgramStatus,
} from '@/lib/api-contract'
import { formatPeriodId, formatRupiah, formatWitaDateTime, shortenHash } from '@/lib/format'
import type {
  PaginatedResult,
  ProgramDetailViewModel,
  ProgramEnrollmentViewModel,
  ProgramSummaryMetricsViewModel,
  ProgramViewModel,
} from '@/types'

export const programSummaryMetricsDtoSchema = z
  .object({
    pagu: z.number().int().nonnegative(),
    target: z.number().int().nonnegative(),
    realisasi: z
      .object({
        count: z.number().int().nonnegative(),
        rupiah: z.number().int().nonnegative(),
      })
      .strict(),
    sisa: z.number().int(),
    percentage: z.number(),
  })
  .strict()

export type ProgramSummaryMetricsDto = z.infer<typeof programSummaryMetricsDtoSchema>

export const programDetailDtoSchema = programDtoSchema
  .extend({
    summary: programSummaryMetricsDtoSchema,
  })
  .strict()

export type ProgramDetailDto = z.infer<typeof programDetailDtoSchema>

const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  DRAFT: 'Draf',
  ACTIVE: 'Aktif',
  CLOSED: 'Ditutup',
}

const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ENROLLED: 'Terdaftar di DB',
  REGISTERED_ONCHAIN: 'Tercatat On-Chain',
}

export function toProgramSummaryMetricsViewModel(
  dto: ProgramSummaryMetricsDto,
): ProgramSummaryMetricsViewModel {
  return {
    pagu: dto.pagu,
    paguFormatted: formatRupiah(dto.pagu),
    target: dto.target,
    realisasiCount: dto.realisasi.count,
    realisasiRupiah: dto.realisasi.rupiah,
    realisasiFormatted: formatRupiah(dto.realisasi.rupiah),
    sisa: dto.sisa,
    sisaFormatted: formatRupiah(dto.sisa),
    percentage: dto.percentage,
  }
}

export function toProgramViewModel(dto: ProgramDto): ProgramViewModel {
  const startPeriodLabel = formatPeriodId(dto.startPeriod)
  const endPeriodLabel = formatPeriodId(dto.endPeriod)
  const periodRangeLabel =
    dto.startPeriod === dto.endPeriod
      ? startPeriodLabel
      : `${startPeriodLabel} – ${endPeriodLabel}`
  const realizationPercent =
    dto.totalBudget > 0 ? (dto.disbursedAmount / dto.totalBudget) * 100 : 0
  const createTxHash = dto.chain?.createTxHash ?? null

  return {
    id: dto.id,
    code: dto.code,
    programId: dto.programId,
    programIdShort: shortenHash(dto.programId),
    name: dto.name,
    description: dto.description,
    fundSource: dto.fundSource,
    kind: dto.kind,
    kindLabel: dto.kind === 'TUNAI' ? 'Tunai' : 'Barang',
    amountPerRecipient: dto.amountPerRecipient,
    amountPerRecipientFormatted: formatRupiah(dto.amountPerRecipient),
    totalBudget: dto.totalBudget,
    totalBudgetFormatted: formatRupiah(dto.totalBudget),
    enrolledCount: dto.enrolledCount,
    registeredCount: dto.registeredCount,
    disbursedCount: dto.disbursedCount,
    disbursedAmount: dto.disbursedAmount,
    disbursedAmountFormatted: formatRupiah(dto.disbursedAmount),
    remainingBudget: dto.remainingBudget,
    remainingBudgetFormatted: formatRupiah(dto.remainingBudget),
    realizationPercent,
    startPeriod: dto.startPeriod,
    startPeriodLabel,
    endPeriod: dto.endPeriod,
    endPeriodLabel,
    periodRangeLabel,
    status: dto.status,
    statusLabel: PROGRAM_STATUS_LABELS[dto.status],
    createTxHash,
    createTxHashShort: shortenHash(createTxHash),
    createBlockNumber: dto.chain?.blockNumber ?? null,
    isPublic: dto.isPublic,
    createdAt: dto.createdAt,
    createdAtWita: formatWitaDateTime(dto.createdAt),
    updatedAt: dto.updatedAt,
    updatedAtWita: formatWitaDateTime(dto.updatedAt),
  }
}

export function toProgramListViewModel(
  dto: ListEnvelope<ProgramDto>,
): PaginatedResult<ProgramViewModel> {
  return {
    items: dto.data.map(toProgramViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  }
}

export function toProgramDetailViewModel(dto: ProgramDetailDto): ProgramDetailViewModel {
  const { summary, ...base } = dto
  return {
    ...toProgramViewModel(base),
    summary: toProgramSummaryMetricsViewModel(summary),
  }
}

export function toProgramEnrollmentViewModel(
  dto: ProgramEnrollmentItemDto,
): ProgramEnrollmentViewModel {
  return {
    id: dto.id,
    recipientId: dto.recipient.id,
    recipientName: dto.recipient.name,
    recipientNikMasked: dto.recipient.nikMasked,
    status: dto.status,
    statusLabel: ENROLLMENT_STATUS_LABELS[dto.status],
  }
}

export function toProgramEnrollmentListViewModel(
  dto: ListEnvelope<ProgramEnrollmentItemDto>,
): PaginatedResult<ProgramEnrollmentViewModel> {
  return {
    items: dto.data.map(toProgramEnrollmentViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  }
}

