import { z } from 'zod'
import type { AuditLogDto, ListEnvelope } from '@/lib/api-contract'
import { formatWitaDateTime, shortenHash } from '@/lib/format'
import type { AuditLogViewModel, AuditVerifyViewModel, PaginatedResult } from '@/types'

export const auditVerifyDtoSchema = z
  .object({
    valid: z.boolean(),
    failedAt: z.number().int().positive().optional(),
    missingSequences: z.array(z.number().int().positive()),
    invalidSequences: z.array(z.number().int().positive()),
    gapEntries: z.array(z.number().int().positive()),
  })
  .strict()

export type AuditVerifyDto = z.infer<typeof auditVerifyDtoSchema>

export function toAuditLogViewModel(dto: AuditLogDto): AuditLogViewModel {
  return {
    id: dto.id,
    seq: dto.seq,
    prevHash: dto.prevHash,
    prevHashShort: shortenHash(dto.prevHash, 8, 6),
    hash: dto.hash,
    hashShort: shortenHash(dto.hash, 8, 6),
    actorId: dto.actorId,
    role: dto.role,
    action: dto.action,
    entity: dto.entity,
    entityId: dto.entityId,
    diff: dto.diff,
    ip: dto.ip,
    userAgent: dto.userAgent,
    requestId: dto.requestId,
    at: dto.at,
    atWita: formatWitaDateTime(dto.at),
    hasGap: dto.note === 'GAP',
  }
}

export function toAuditLogListViewModel(
  dto: ListEnvelope<AuditLogDto>,
): PaginatedResult<AuditLogViewModel> {
  return {
    items: dto.data.map(toAuditLogViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  }
}

export function toAuditVerifyViewModel(dto: AuditVerifyDto): AuditVerifyViewModel {
  return {
    valid: dto.valid,
    failedAt: dto.failedAt ?? null,
    missingSequences: [...dto.missingSequences],
    invalidSequences: [...dto.invalidSequences],
    gapEntries: [...dto.gapEntries],
  }
}

