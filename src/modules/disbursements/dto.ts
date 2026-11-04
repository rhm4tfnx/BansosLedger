import 'server-only'
import {
  disbursementDtoSchema,
  evidenceDtoSchema,
  attemptDtoSchema,
  type DisbursementDto,
  type EvidenceDto,
  type AttemptDto,
} from '@/lib/api-contract/dto'

export function toEvidenceDto(doc: any): EvidenceDto {
  const dto = {
    cid: String(doc.cid ?? ''),
    mime: String(doc.mime ?? ''),
    size: Number(doc.size ?? 0),
    sha256: String(doc.sha256 ?? ''),
    name: String(doc.name ?? ''),
    access: 'PUBLIC' as const,
    status: doc.status,
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
  const dto = {
    id: String(doc._id ?? doc.id),
    refId: String(doc.refId ?? ''),
    programId: String(doc.programId),
    recipientId: String(doc.recipientId),
    periodId: Number(doc.periodId ?? 0),
    commitment: doc.commitment ? String(doc.commitment) : null,
    amount: Number(doc.amount ?? 0),
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

