import 'server-only'
import {
  programDtoSchema,
  enrollmentDtoSchema,
  programEnrollmentItemDtoSchema,
  type ProgramDto,
  type EnrollmentDto,
  type ProgramEnrollmentItemDto,
} from '@/lib/api-contract/dto'

export function toProgramDto(doc: any): ProgramDto {
  const totalBudget = Math.round(Number(doc.totalBudget ?? 0))
  // remainingBudget = totalBudget minus disbursedAmount, counting SUCCESS disbursements only;
  // PENDING and FAILED (as well as DRAFT) are not disbursed.
  const disbursedAmount = Math.round(Number(doc.disbursedAmount ?? 0))
  const remainingBudget = doc.remainingBudget != null
    ? Math.round(Number(doc.remainingBudget))
    : totalBudget - disbursedAmount

  const dto = {
    id: String(doc._id ?? doc.id),
    code: String(doc.code ?? ''),
    programId: doc.programId ? String(doc.programId) : null,
    name: String(doc.name ?? ''),
    description: doc.description ? String(doc.description) : null,
    fundSource: String(doc.fundSource ?? ''),
    kind: doc.kind,
    amountPerRecipient: Math.round(Number(doc.amountPerRecipient ?? 0)),
    totalBudget,
    enrolledCount: Number(doc.enrolledCount ?? 0),
    registeredCount: Number(doc.registeredCount ?? 0),
    disbursedCount: Number(doc.disbursedCount ?? 0),
    disbursedAmount,
    remainingBudget,
    startPeriod: Number(doc.startPeriod ?? 0),
    endPeriod: Number(doc.endPeriod ?? 0),
    status: doc.status,
    chain: doc.chain ? {
      createTxHash: doc.chain.createTxHash ? String(doc.chain.createTxHash) : null,
      blockNumber: doc.chain.blockNumber != null ? Number(doc.chain.blockNumber) : null,
    } : null,
    isPublic: Boolean(doc.isPublic),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? new Date().toISOString()),
  }
  return programDtoSchema.parse(dto)
}

export function toEnrollmentDto(doc: any): EnrollmentDto {
  const dto = {
    id: String(doc._id ?? doc.id),
    programId: String(doc.programId),
    recipientId: String(doc.recipientId),
    status: doc.status,
    registerTxHash: doc.registerTxHash ? String(doc.registerTxHash) : null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt ?? new Date().toISOString()),
  }
  return enrollmentDtoSchema.parse(dto)
}

export function toProgramEnrollmentItemDto(doc: any): ProgramEnrollmentItemDto {
  const recipientIdStr = String(doc.recipient?._id ?? doc.recipient?.id ?? doc.recipientId ?? '')
  const dto = {
    id: String(doc._id ?? doc.id),
    recipient: {
      id: recipientIdStr,
      name: String(doc.recipient?.name ?? ''),
      nikMasked: String(doc.recipient?.nikMasked ?? ''),
    },
    status: doc.status,
  }
  return programEnrollmentItemDtoSchema.parse(dto)
}

