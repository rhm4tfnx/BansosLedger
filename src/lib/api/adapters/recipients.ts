import { z } from 'zod'
import {
  DISBURSEMENT_STATUSES,
  listEnvelope,
  recipientDtoSchema,
  type EnrollmentStatus,
  type ListEnvelope,
  type RecipientDto,
  type RecipientEnrollmentSummaryDto,
  type RecipientStatus,
} from '@/lib/api-contract'
import { formatPeriodId, formatRupiah, formatWitaDateTime, shortenHash } from '@/lib/format'
import type {
  PaginatedResult,
  RecipientDetailViewModel,
  RecipientEnrollmentSummaryViewModel,
  RecipientHistoryItemViewModel,
  RecipientViewModel,
} from '@/types'

export const recipientHistoryItemDtoSchema = z
  .object({
    id: z.string(),
    refId: z.string(),
    programId: z.string(),
    periodId: z.number().int(),
    amount: z.number().int().nonnegative(),
    status: z.enum(DISBURSEMENT_STATUSES),
    disbursedDate: z.string().nullable(),
    chain: z
      .object({
        txHash: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable(),
    createdAt: z.string(),
  })
  .strict()

export type RecipientHistoryItemDto = z.infer<typeof recipientHistoryItemDtoSchema>

export const recipientDetailDtoSchema = recipientDtoSchema
  .extend({
    history: listEnvelope(recipientHistoryItemDtoSchema),
  })
  .strict()

export type RecipientDetailDto = z.infer<typeof recipientDetailDtoSchema>

const RECIPIENT_STATUS_LABELS: Record<RecipientStatus, string> = {
  DRAFT: 'Draf',
  FINAL: 'Terverifikasi (FINAL)',
}

const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ENROLLED: 'Terdaftar di DB',
  REGISTERED_ONCHAIN: 'Tercatat On-Chain',
}

const DISBURSEMENT_STATUS_LABELS: Record<RecipientHistoryItemDto['status'], string> = {
  DRAFT: 'Draf',
  PENDING: 'Menunggu Konfirmasi',
  SUCCESS: 'Tercatat di Blockchain',
  FAILED: 'Gagal',
}

function padRtRw(value: string): string {
  return value.trim().padStart(3, '0')
}

export function toRecipientEnrollmentSummaryViewModel(
  dto: RecipientEnrollmentSummaryDto,
): RecipientEnrollmentSummaryViewModel {
  return {
    programCode: dto.programCode,
    status: dto.status,
    statusLabel: ENROLLMENT_STATUS_LABELS[dto.status],
  }
}

export function toRecipientViewModel(dto: RecipientDto): RecipientViewModel {
  const rtPadded = padRtRw(dto.address.rt)
  const rwPadded = padRtRw(dto.address.rw)
  const regionLabel = `RT ${rtPadded} / RW ${rwPadded}`
  const addressLabel = `${dto.address.dusun}, ${regionLabel}`

  return {
    id: dto.id,
    nikMasked: dto.nikMasked,
    name: dto.name,
    dusun: dto.address.dusun,
    rt: dto.address.rt,
    rw: dto.address.rw,
    regionLabel,
    addressLabel,
    phone: dto.phone,
    status: dto.status,
    statusLabel: RECIPIENT_STATUS_LABELS[dto.status],
    commitment: dto.commitment,
    commitmentShort: shortenHash(dto.commitment),
    enrollments: dto.enrollments.map(toRecipientEnrollmentSummaryViewModel),
    createdAt: dto.createdAt,
    createdAtWita: formatWitaDateTime(dto.createdAt),
    updatedAt: dto.updatedAt,
    updatedAtWita: formatWitaDateTime(dto.updatedAt),
    finalizedAt: dto.finalizedAt,
    finalizedAtWita: formatWitaDateTime(dto.finalizedAt),
  }
}

export function toRecipientListViewModel(
  dto: ListEnvelope<RecipientDto>,
): PaginatedResult<RecipientViewModel> {
  return {
    items: dto.data.map(toRecipientViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  }
}

export function toRecipientHistoryItemViewModel(
  dto: RecipientHistoryItemDto,
): RecipientHistoryItemViewModel {
  const txHash = dto.chain && typeof dto.chain.txHash === 'string' ? dto.chain.txHash : null
  return {
    id: dto.id,
    refId: dto.refId,
    programId: dto.programId,
    periodId: dto.periodId,
    periodLabel: formatPeriodId(dto.periodId),
    amount: dto.amount,
    amountFormatted: formatRupiah(dto.amount),
    status: dto.status,
    statusLabel: DISBURSEMENT_STATUS_LABELS[dto.status],
    disbursedDate: dto.disbursedDate,
    disbursedDateWita: formatWitaDateTime(dto.disbursedDate),
    txHash,
    txHashShort: shortenHash(txHash),
    createdAt: dto.createdAt,
    createdAtWita: formatWitaDateTime(dto.createdAt),
  }
}

export function toRecipientDetailViewModel(dto: RecipientDetailDto): RecipientDetailViewModel {
  const { history, ...base } = dto
  return {
    ...toRecipientViewModel(base),
    history: {
      items: history.data.map(toRecipientHistoryItemViewModel),
      total: history.total,
      page: history.page,
      limit: history.limit,
      totalPages: history.totalPages,
    },
  }
}

