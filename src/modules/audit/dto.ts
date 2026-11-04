import 'server-only'
import { auditLogDtoSchema, type AuditLogDto } from '@/lib/api-contract/dto'

export function toAuditLogDto(doc: any): AuditLogDto {
  const dto = {
    id: String(doc._id ?? doc.id),
    seq: Number(doc.seq),
    prevHash: String(doc.prevHash ?? ''),
    hash: String(doc.hash ?? ''),
    actorId: String(doc.actorId ?? ''),
    role: String(doc.role ?? ''),
    action: String(doc.action ?? ''),
    entity: String(doc.entity ?? ''),
    entityId: String(doc.entityId ?? ''),
    diff: doc.diff ?? null,
    ip: String(doc.ip ?? ''),
    userAgent: String(doc.userAgent ?? ''),
    requestId: String(doc.requestId ?? ''),
    at: doc.at instanceof Date ? doc.at.toISOString() : String(doc.at ?? new Date().toISOString()),
    note: doc.note === 'GAP' ? ('GAP' as const) : null,
  }
  return auditLogDtoSchema.parse(dto)
}

