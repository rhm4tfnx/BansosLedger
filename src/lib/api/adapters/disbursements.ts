import { z } from 'zod'
import {
  EVIDENCE_STATUSES,
  type AttemptDto,
  type DisbursementDto,
  type DisbursementPreflightDto,
  type DisbursementStatus,
  type DisbursementTxIntentDto,
  type EvidenceDto,
  type ListEnvelope,
} from '@/lib/api-contract'
import {
  formatPeriodId,
  formatRupiah,
  formatWitaDate,
  formatWitaDateTime,
  shortenHash,
} from '@/lib/format'
import type {
  DisbursementAttemptViewModel,
  DisbursementChainViewModel,
  DisbursementPreflightViewModel,
  DisbursementTxIntentViewModel,
  DisbursementViewModel,
  EvidenceViewModel,
  PaginatedResult,
  PublicEvidenceItemViewModel,
} from '@/types'
import { mapApiErrorCode } from '../errors'

export const publicEvidenceItemDtoSchema = z
  .object({
    cid: z.string(),
    mime: z.string(),
    size: z.number().int().nonnegative(),
    status: z.enum(EVIDENCE_STATUSES),
    gatewayUrl: z.string().nullable(),
  })
  .strict()

export type PublicEvidenceItemDto = z.infer<typeof publicEvidenceItemDtoSchema>

export const publicEvidenceListDtoSchema = z
  .object({
    data: z.array(publicEvidenceItemDtoSchema),
  })
  .strict()

export type PublicEvidenceListDto = z.infer<typeof publicEvidenceListDtoSchema>

const DISBURSEMENT_STATUS_LABELS: Record<DisbursementStatus, string> = {
  DRAFT: 'Draf',
  PENDING: 'Menunggu Konfirmasi',
  SUCCESS: 'Tercatat di Blockchain',
  FAILED: 'Gagal',
}

export function toEvidenceViewModel(dto: EvidenceDto): EvidenceViewModel {
  return {
    cid: dto.cid,
    cidShort: shortenHash(dto.cid, 8, 6),
    mime: dto.mime,
    size: dto.size,
    sha256: dto.sha256,
    name: dto.name,
    access: dto.access,
    status: dto.status,
    isWithdrawn: dto.status === 'WITHDRAWN',
    withdrawnAt: dto.withdrawnAt,
    withdrawnAtWita: formatWitaDateTime(dto.withdrawnAt),
    withdrawReason: dto.withdrawReason,
  }
}

export function toPublicEvidenceItemViewModel(
  dto: PublicEvidenceItemDto,
): PublicEvidenceItemViewModel {
  return {
    cid: dto.cid,
    cidShort: shortenHash(dto.cid, 8, 6),
    mime: dto.mime,
    size: dto.size,
    status: dto.status,
    isWithdrawn: dto.status === 'WITHDRAWN',
    gatewayUrl: dto.gatewayUrl,
  }
}

export function toDisbursementAttemptViewModel(dto: AttemptDto): DisbursementAttemptViewModel {
  return {
    at: dto.at,
    atWita: formatWitaDateTime(dto.at),
    txHash: dto.txHash,
    txHashShort: shortenHash(dto.txHash),
    outcome: dto.outcome,
    errorCode: dto.errorCode,
    by: dto.by,
  }
}

export function toDisbursementChainViewModel(
  dto: NonNullable<DisbursementDto['chain']>,
): DisbursementChainViewModel {
  return {
    txHash: dto.txHash,
    txHashShort: shortenHash(dto.txHash),
    blockNumber: dto.blockNumber,
    logIndex: dto.logIndex,
    blockTimestamp: dto.blockTimestamp,
    blockTimestampWita: formatWitaDateTime(dto.blockTimestamp),
    from: dto.from,
    fromShort: shortenHash(dto.from),
    confirmedAt: dto.confirmedAt,
    confirmedAtWita: formatWitaDateTime(dto.confirmedAt),
  }
}

export function toDisbursementViewModel(dto: DisbursementDto): DisbursementViewModel {
  const evidence = dto.evidence.map(toEvidenceViewModel)
  const activeEvidenceCount = evidence.filter((item) => !item.isWithdrawn).length

  return {
    id: dto.id,
    refId: dto.refId,
    refIdShort: shortenHash(dto.refId),
    programId: dto.programId,
    recipientId: dto.recipientId,
    programCode: dto.program.code,
    programName: dto.program.name,
    recipientName: dto.recipient.name,
    recipientNikMasked: dto.recipient.nikMasked,
    periodId: dto.periodId,
    periodLabel: formatPeriodId(dto.periodId),
    commitment: dto.commitment,
    commitmentShort: shortenHash(dto.commitment),
    amount: dto.amount,
    amountFormatted: formatRupiah(dto.amount),
    disbursedDate: dto.disbursedDate,
    disbursedDateLabel: formatWitaDate(dto.disbursedDate),
    note: dto.note,
    status: dto.status,
    statusLabel: DISBURSEMENT_STATUS_LABELS[dto.status],
    evidence,
    activeEvidenceCount,
    chain: dto.chain ? toDisbursementChainViewModel(dto.chain) : null,
    attempts: dto.attempts.map(toDisbursementAttemptViewModel),
    lastError: dto.lastError,
    lastErrorMessage: dto.lastError ? mapApiErrorCode(dto.lastError) : null,
    createdAt: dto.createdAt,
    createdAtWita: formatWitaDateTime(dto.createdAt),
    updatedAt: dto.updatedAt,
    updatedAtWita: formatWitaDateTime(dto.updatedAt),
  }
}

export function toDisbursementListViewModel(
  dto: ListEnvelope<DisbursementDto>,
): PaginatedResult<DisbursementViewModel> {
  return {
    items: dto.data.map(toDisbursementViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  }
}

export function toDisbursementPreflightViewModel(
  dto: DisbursementPreflightDto,
): DisbursementPreflightViewModel {
  return {
    ok: dto.ok,
    checks: dto.checks.map((item) => ({
      key: item.key,
      label: item.label,
      ok: item.ok,
      message: item.message ?? null,
    })),
  }
}

export function toDisbursementTxIntentViewModel(
  dto: DisbursementTxIntentDto,
): DisbursementTxIntentViewModel {
  return {
    to: dto.to,
    data: dto.data,
    chainId: dto.chainId,
    evidenceCid: dto.evidenceCid,
  }
}

