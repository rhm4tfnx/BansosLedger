import 'server-only'
import {
  disbursementDtoSchema,
  disbursementCreatedDtoSchema,
  evidenceDtoSchema,
  attemptDtoSchema,
  withdrawEvidenceDtoSchema,
  type DisbursementDto,
  type DisbursementCreatedDto,
  type EvidenceDto,
  type AttemptDto,
  type WithdrawEvidenceDto,
} from '@/lib/api-contract/dto'

export function toEvidenceDto(doc: any): EvidenceDto {
  const dto = {
    cid: String(doc.cid ?? ''),
    mime: String(doc.mime ?? ''),
    size: Math.round(Number(doc.size ?? 0)),
    sha256: String(doc.sha256 ?? ''),
    name: String(doc.name ?? ''),
    access: 'PUBLIC' as const,
    status: doc.status ?? 'ACTIVE',
    withdrawnAt: doc.withdrawnAt ? (doc.withdrawnAt instanceof Date ? doc.withdrawnAt.toISOString() : String(doc.withdrawnAt)) : null,
    withdrawReason: doc.withdrawReason ? String(doc.withdrawReason) : null,
  }
  return evidenceDtoSchema.parse(dto)
}

export function toAttemptDto(doc: any): AttemptDto {
  const dto = {
    at: doc.at instanceof Date ? doc.at.toISOString() : String(doc.at ?? new Date().toISOString()),
    txHash: doc.txHash ? String(doc.txHash) : null,
    outcome: String(doc.outcome ?? ''),
    errorCode: doc.errorCode ? String(doc.errorCode) : null,
    by: doc.by ? String(doc.by) : null,
  }
  return attemptDtoSchema.parse(dto)
}

export function toDisbursementDto(doc: any): DisbursementDto {
  const programIdStr = String(doc.programId ?? doc.program?._id ?? doc.program?.id ?? '')
  const recipientIdStr = String(doc.recipientId ?? doc.recipient?._id ?? doc.recipient?.id ?? '')
  const dto = {
    id: String(doc._id ?? doc.id),
    refId: String(doc.refId ?? ''),
    programId: programIdStr,
    recipientId: recipientIdStr,
    program: {
      id: String(doc.program?._id ?? doc.program?.id ?? programIdStr),
      code: String(doc.program?.code ?? ''),
      name: String(doc.program?.name ?? ''),
    },
    recipient: {
      id: String(doc.recipient?._id ?? doc.recipient?.id ?? recipientIdStr),
      name: String(doc.recipient?.name ?? ''),
      nikMasked: String(doc.recipient?.nikMasked ?? ''),
    },
    periodId: Number(doc.periodId ?? 0),
    commitment: doc.commitment ? String(doc.commitment) : null,
    amount: Math.round(Number(doc.amount ?? 0)),
    disbursedDate: doc.disbursedDate ? (doc.disbursedDate instanceof Date ? doc.disbursedDate.toISOString() : String(doc.disbursedDate)) : null,
    note: String(doc.note ?? ''),
    status: doc.status,
    evidence: Array.isArray(doc.evidence) ? doc.evidence.map(toEvidenceDto) : [],
    chain: doc.chain ? {
      txHash: doc.chain.txHash ? String(doc.chain.txHash) : null,
      blockNumber: doc.chain.blockNumber != null ? Number(doc.chain.blockNumber) : null,
      logIndex: doc.chain.logIndex != null ? Number(doc.chain.logIndex) : null,
      blockTimestamp: doc.chain.blockTimestamp ? (doc.chain.blockTimestamp instanceof Date ? doc.chain.blockTimestamp.toISOString() : String(doc.chain.blockTimestamp)) : null,
      from: doc.chain.from ? String(doc.chain.from) : null,
      confirmedAt: doc.chain.confirmedAt ? (doc.chain.confirmedAt instanceof Date ? doc.chain.confirmedAt.toISOString() : String(doc.chain.confirmedAt)) : null,
    } : null,
    attempts: Array.isArray(doc.attempts) ? doc.attempts.map(toAttemptDto) : [],
    lastError: doc.lastError ? String(doc.lastError) : null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? new Date().toISOString()),
  }
  return disbursementDtoSchema.parse(dto)
}

export function toDisbursementCreatedDto(
  doc: any,
  previewData: {
    refId?: unknown
    programId?: unknown
    periodId?: unknown
    commitment?: unknown
    amount?: unknown
  },
  deleted?: boolean,
): DisbursementCreatedDto {
  const base = toDisbursementDto(doc)
  const dto = {
    id: base.id,
    refId: base.refId,
    programId: base.programId,
    recipientId: base.recipientId,
    program: {
      id: base.program.id,
      code: base.program.code,
      name: base.program.name,
    },
    recipient: {
      id: base.recipient.id,
      name: base.recipient.name,
      nikMasked: base.recipient.nikMasked,
    },
    periodId: base.periodId,
    commitment: base.commitment,
    amount: base.amount,
    disbursedDate: base.disbursedDate,
    note: base.note,
    status: base.status,
    evidence: base.evidence,
    chain: base.chain,
    attempts: base.attempts,
    lastError: base.lastError,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    preview: {
      refId: String(previewData.refId ?? base.refId),
      programId: previewData.programId != null ? String(previewData.programId) : null,
      periodId: previewData.periodId != null ? Number(previewData.periodId) : null,
      commitment: previewData.commitment != null ? String(previewData.commitment) : null,
      amount: previewData.amount != null ? Math.round(Number(previewData.amount)) : null,
    },
    ...(deleted !== undefined ? { deleted: Boolean(deleted) } : {}),
  }
  return disbursementCreatedDtoSchema.parse(dto)
}

export function toWithdrawEvidenceDto(data: any): WithdrawEvidenceDto {
  const dto = {
    status: 'WITHDRAWN' as const,
    ...(data?.message ? { message: String(data.message) } : {}),
  }
  return withdrawEvidenceDtoSchema.parse(dto)
}


