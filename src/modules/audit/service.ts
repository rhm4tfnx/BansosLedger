import 'server-only'
import { createHash } from 'node:crypto'
import { connectDatabase } from '@/lib/db/connection'
import { AuditLogs, Counters } from '@/lib/db/models'

type AuditInput = { actor: string; role?: string; action: string; entity?: string; entityId?: string; diff?: unknown; ip?: string; userAgent?: string; requestId?: string }
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, /nik|password|token|pepper|secret/i.test(key) ? '[REDACTED]' : redact(val)]))
  return value
}
export function canonicalJSON(value: unknown): string {
  if (value === undefined || value === null) return 'null'
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`
  if (typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJSON(item)}`).join(',')}}`
  return JSON.stringify(value)
}
const digest = (entry: unknown, prevHash: string) => createHash('sha256').update(canonicalJSON(entry) + prevHash).digest('hex')
export async function appendAudit(input: AuditInput) {
  await connectDatabase()
  const counter = await Counters.findOneAndUpdate({ _id: 'audit' }, { $inc: { value: 1 } }, { upsert: true, new: true })
  const seq = counter.value
  let previous = seq === 1 ? null : await AuditLogs.findOne({ seq: seq - 1 }).lean()
  for (let retry = 0; seq > 1 && !previous && retry < 20; retry++) {
    await new Promise(resolve => setTimeout(resolve, 50))
    previous = await AuditLogs.findOne({ seq: seq - 1 }).lean()
  }
  const gap = seq > 1 && !previous
  if (gap) previous = await AuditLogs.findOne({ seq: { $lt: seq } }).sort({ seq: -1 }).lean()
  const prevHash = previous?.hash ?? '0'.repeat(64)
  const entry = { seq, actorId: input.actor, role: input.role || '', action: input.action, entity: input.entity || '', entityId: input.entityId || '', diff: redact(input.diff ?? null), ip: input.ip || '', userAgent: input.userAgent || '', requestId: input.requestId || '', at: new Date(), ...(gap ? { note: 'GAP' as const } : {}) }
  const hash = digest(entry, prevHash)
  await AuditLogs.create({ ...entry, prevHash, hash })
  return { seq, hash }
}
export async function appendAuditBestEffort(input: AuditInput) {
  try { await appendAudit(input) } catch { /* Authentication failures and logout must not depend on audit availability. */ }
}
export async function verifyAuditChain(fromSeq: number, toSeq: number) {
  if (!Number.isSafeInteger(fromSeq) || !Number.isSafeInteger(toSeq) || fromSeq < 1 || toSeq < fromSeq) throw new Error('Rentang audit tidak valid.')
  await connectDatabase()
  const previous = fromSeq === 1 ? null : await AuditLogs.findOne({ seq: { $lt: fromSeq } }).sort({ seq: -1 }).lean()
  const missingSequences: number[] = []
  const invalidSequences: number[] = []
  const gapEntries: number[] = []
  if (fromSeq > 1 && previous?.seq !== fromSeq - 1) missingSequences.push(fromSeq - 1)
  let prevHash = previous?.hash ?? '0'.repeat(64)
  let expected = fromSeq
  for await (const row of AuditLogs.find({ seq: { $gte: fromSeq, $lte: toSeq } }).sort({ seq: 1 }).lean().cursor()) {
    while (expected < row.seq) missingSequences.push(expected++)
    const entry = { seq: row.seq, actorId: row.actorId, role: row.role, action: row.action, entity: row.entity, entityId: row.entityId, diff: row.diff, ip: row.ip, userAgent: row.userAgent, requestId: row.requestId, at: row.at, ...(row.note ? { note: row.note } : {}) }
    if (row.prevHash !== prevHash || row.hash !== digest(entry, row.prevHash)) invalidSequences.push(row.seq)
    if (row.note === 'GAP') gapEntries.push(row.seq)
    prevHash = row.hash; expected = row.seq + 1
  }
  while (expected <= toSeq) missingSequences.push(expected++)
  const failedAt = [missingSequences[0], invalidSequences[0], gapEntries[0]].filter((value): value is number => value !== undefined).sort((a, b) => a - b)[0]
  return { valid: failedAt === undefined, ...(failedAt === undefined ? {} : { failedAt }), missingSequences, invalidSequences, gapEntries }
}
