import 'server-only'
import { z } from 'zod'
import type { FilterQuery } from 'mongoose'
import { AuditLogs } from '@/lib/db/models'
import { verifyAuditChain } from './service'
import { toAuditLogDto } from './dto'
import { DomainError, idSchema, json, pageQuery, query, type DomainContext } from '../domain/http'
export async function list(ctx: DomainContext) {
  const paging = pageQuery(ctx.request, ['createdAt', 'at', 'seq', 'action'])
  const input = z.object({ user: idSchema.optional(), action: z.string().min(1).max(100).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(query(ctx.request))
  if (input.from && input.to && input.from > input.to) throw new DomainError(400, 'INVALID_DATE_RANGE', 'Rentang tanggal tidak valid.')
  const filter: FilterQuery<unknown> = {}
  if (input.user) filter.actorId = input.user
  if (input.action) filter.action = input.action
  if (input.from || input.to) filter.at = { ...(input.from ? { $gte: input.from } : {}), ...(input.to ? { $lte: input.to } : {}) }
  const [data, total] = await Promise.all([AuditLogs.find(filter).sort(paging.sort).skip(paging.skip).limit(paging.limit).lean(), AuditLogs.countDocuments(filter)])
  return json({ data: data.map(toAuditLogDto), total, page: paging.page, limit: paging.limit, totalPages: Math.ceil(total / paging.limit) })
}
export async function verify(ctx: DomainContext) {
  const { from, to } = z.object({ from: z.coerce.number().int().positive().safe(), to: z.coerce.number().int().positive().safe() }).refine(value => value.to >= value.from && value.to - value.from < 5000).parse(query(ctx.request))
  return json(await verifyAuditChain(from, to))
}
