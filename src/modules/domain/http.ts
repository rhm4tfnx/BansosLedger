import 'server-only'
import { z } from 'zod'
import { Types } from 'mongoose'
import { requireV1, asV1, problem } from '@/lib/auth/v1'
import { isSameOriginRequest, requestContext } from '@/lib/auth/request-origin'
import { connectDatabase } from '@/lib/db/connection'
import { appendAudit } from '@/modules/audit/service'
import type { VerifiedSession } from '@/lib/auth/session'
import type { Permission } from '@/types/rbac'

export class DomainError extends Error {
  constructor(public status: number, public code: string, message: string, public retryAfter?: number) { super(message) }
}
export const idSchema = z.string().regex(/^[0-9a-fA-F]{24}$/)
export const txSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform(s => s.toLowerCase())
export const periodSchema = z.number().int().min(200001).max(209912).refine(n => n % 100 >= 1 && n % 100 <= 12)
export const reasonSchema = z.object({ reason: z.string().trim().min(3).max(1000) }).strict()
export type DomainContext = { request: Request; actor: VerifiedSession; params: Record<string, string> }
export type RouteContext = { params: Promise<Record<string, string>> }
export const oid = (id: string) => new Types.ObjectId(idSchema.parse(id))
export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
export function duplicate(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000 }
export function escapeSearch(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
export function query(request: Request) { return Object.fromEntries(new URL(request.url).searchParams) }
export function pageQuery(request: Request, fields: readonly string[] = ['createdAt', 'updatedAt']) {
  const raw = query(request)
  const { page, limit, sort } = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), sort: z.string().default('-createdAt') }).parse(raw)
  const field = sort.replace(/^-/, '')
  if (!fields.includes(field)) throw new DomainError(400, 'INVALID_SORT', 'Kolom pengurutan tidak valid.')
  return { page, limit, skip: (page - 1) * limit, sort: { [field]: sort.startsWith('-') ? -1 as const : 1 as const, _id: 1 as const } }
}
export async function boundedBody(request: Request, maximum: number): Promise<Uint8Array> {
  const declared = request.headers.get('content-length')
  if (declared && Number(declared) > maximum) throw new DomainError(413, 'PAYLOAD_TOO_LARGE', 'Ukuran permintaan terlalu besar.')
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  let length = 0
  const chunks: Uint8Array[] = []
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      length += next.value.byteLength
      if (length > maximum) { await reader.cancel(); throw new DomainError(413, 'PAYLOAD_TOO_LARGE', 'Ukuran permintaan terlalu besar.') }
      chunks.push(next.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}
export async function body<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let value: unknown
  try { const text = new TextDecoder().decode(await boundedBody(request, 65536)); value = text.trim() ? JSON.parse(text) : {} }
  catch (error) { if (error instanceof DomainError) throw error; throw new DomainError(400, 'INVALID_JSON', 'JSON tidak valid.') }
  return schema.parse(value)
}
export async function audit(ctx: DomainContext, action: string, entity: string, entityId: string, diff?: unknown) {
  await appendAudit({ actor: ctx.actor.userId, role: ctx.actor.role, action, entity, entityId, diff, ...requestContext(ctx.request) })
}
export function route(permission: Permission, handler: (ctx: DomainContext) => Promise<Response>, write = false) {
  return (request: Request, context?: RouteContext) => asV1(async () => {
    const auth = await requireV1(permission)
    if (auth.response) return auth.response
    try {
      if (write && !isSameOriginRequest(request)) return problem(403, 'FORBIDDEN_ORIGIN', 'Origin tidak diizinkan.')
      const params = (await context?.params) ?? {}
      if (params.id) idSchema.parse(params.id)
      return await handler({ request, actor: auth.session, params })
    } catch (error) { return domainFailure(error) }
  }, request)
}
export function publicRoute(handler: (request: Request, params: Record<string, string>) => Promise<Response>) {
  return (request: Request, context?: RouteContext) => asV1(async () => {
    try { await connectDatabase(); const params = (await context?.params) ?? {}; idSchema.parse(params.id); return await handler(request, params) }
    catch (error) { return domainFailure(error) }
  }, request)
}
function domainFailure(error: unknown): Response {
  if (error instanceof z.ZodError) return problem(400, 'VALIDATION_ERROR', 'Parameter permintaan tidak valid.')
  if (error instanceof DomainError) {
    const response = problem(error.status, error.code, error.message)
    if (error.retryAfter) response.headers.set('Retry-After', String(error.retryAfter))
    return response
  }
  throw error
}
export function notFound(): never { throw new DomainError(404, 'NOT_FOUND', 'Data tidak ditemukan.') }
export function conflict(code = 'IMMUTABLE_RECORD', message = 'Data tidak dapat diubah pada status saat ini.'): never { throw new DomainError(409, code, message) }
