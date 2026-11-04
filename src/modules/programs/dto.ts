import 'server-only'
import { programDtoSchema, enrollmentDtoSchema, type ProgramDto, type EnrollmentDto } from '@/lib/api-contract/dto'

export function toProgramDto(doc: any): ProgramDto {
  const dto = {
    id: String(doc._id ?? doc.id),
    code: String(doc.code ?? ''),
    programId: doc.programId ? String(doc.programId) : null,
    name: String(doc.name ?? ''),
    description: doc.description ? String(doc.description) : null,
    fundSource: String(doc.fundSource ?? ''),
    kind: doc.kind,
    amountPerRecipient: Number(doc.amountPerRecipient ?? 0),
    totalBudget: Number(doc.totalBudget ?? 0),
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

