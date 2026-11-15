import 'server-only'
import { z } from 'zod'
import { randomInt } from 'node:crypto'
import { getEnv } from '@/lib/env'
import { rateLimit } from '@/lib/ratelimit'
import { connectDatabase } from '@/lib/db/connection'
import { Programs, Disbursements, Recipients, Enrollments } from '@/lib/db/models'
import { validateNik, nikBlindIndex } from '@/lib/crypto/nik'
import { isSameOriginRequest, requestContext } from '@/lib/auth/request-origin'
import { appendAudit } from '@/modules/audit/service'
import { body, DomainError, json, notFound, pageQuery } from '@/modules/domain/http'
import {
  toPublicSummaryDto,
  toPublicProgramDto,
  toPublicProgramDetailDto,
  toPublicStatusCheckDto,
} from './dto'
const visible = { isPublic: true, status: { $in: ['ACTIVE', 'CLOSED'] } }
const fields = 'code name description kind fundSource amountPerRecipient totalBudget startPeriod endPeriod status'
export async function summary() {
  await connectDatabase()
  const programs = await Programs.find(visible).select('_id totalBudget').lean()
  const sums = await Disbursements.aggregate([{ $match: { programId: { $in: programs.map(p => p._id) }, status: 'SUCCESS', deletedAt: null } }, { $group: { _id: null, transactions: { $sum: 1 }, amount: { $sum: '$amount' } } }])
  return json(toPublicSummaryDto({ programs: programs.length, budget: programs.reduce((sum, p) => sum + (p.totalBudget ?? 0), 0), transactions: sums[0]?.transactions ?? 0, amount: sums[0]?.amount ?? 0 }))
}
export async function programs(request: Request) {
  await connectDatabase(); const paging = pageQuery(request, ['createdAt', 'name', 'code'])
  const [data, total] = await Promise.all([Programs.find(visible).select(fields).sort(paging.sort).skip(paging.skip).limit(paging.limit).lean(), Programs.countDocuments(visible)])
  return json({ data: data.map(toPublicProgramDto), total, page: paging.page, limit: paging.limit, totalPages: Math.ceil(total / paging.limit) })
}
export async function program(request: Request, params: Record<string, string>) {
  const code = z.string().regex(/^[A-Z0-9-]{3,20}$/).parse(params.code)
  await connectDatabase(); const paging = pageQuery(request, ['createdAt', 'periodId', 'amount'])
  const program = await Programs.findOne({ ...visible, code }).select(fields).lean(); if (!program) notFound()
  const filter = { programId: program._id, status: 'SUCCESS', deletedAt: null }
  const [rows, total] = await Promise.all([Disbursements.find(filter).select('periodId amount chain.txHash chain.blockTimestamp').sort(paging.sort).skip(paging.skip).limit(paging.limit).lean(), Disbursements.countDocuments(filter)])
  return json(toPublicProgramDetailDto({ program, ledger: { data: rows.map(row => ({ txHash: row.chain?.txHash, period: row.periodId, amount: row.amount, time: row.chain?.blockTimestamp })), total, page: paging.page, limit: paging.limit, totalPages: Math.ceil(total / paging.limit) } }))
}
export async function verifyTurnstile(token: string, ip: string) {
  const secret = getEnv('TURNSTILE_SECRET')
  if (!secret) throw new DomainError(503, 'TURNSTILE_NOT_CONFIGURED', 'Layanan verifikasi belum dikonfigurasi.')
  let response: Response
  try { response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }), signal: AbortSignal.timeout(5000), cache: 'no-store' }) }
  catch { throw new DomainError(503, 'TURNSTILE_UNAVAILABLE', 'Layanan verifikasi tidak tersedia.') }
  if (!response.ok) throw new DomainError(503, 'TURNSTILE_UNAVAILABLE', 'Layanan verifikasi tidak tersedia.')
  const result = z.object({ success: z.boolean(), hostname: z.string().optional() }).safeParse(await response.json())
  if (!result.success || !result.data.success || result.data.hostname !== new URL(getEnv('APP_BASE_URL')).hostname) throw new DomainError(400, 'CAPTCHA_INVALID', 'Verifikasi keamanan tidak valid.')
}
export async function statusCheck(request: Request) {
  const started = Date.now(), delay = 600 + randomInt(0, 101)
  try {
    if (!isSameOriginRequest(request)) throw new DomainError(403, 'FORBIDDEN_ORIGIN', 'Origin tidak diizinkan.')
    if ([...new URL(request.url).searchParams].length) throw new DomainError(400, 'BODY_ONLY', 'Gunakan JSON body tanpa query parameter.')
    const { nik, turnstileToken } = await body(request, z.object({ nik: z.string().refine(validateNik), turnstileToken: z.string().min(1).max(2048) }).strict())
    const ip = requestContext(request).ip
    const ipLimit = await rateLimit(`status:ip:${ip}`, 10, 600)
    if (!ipLimit.ok) throw new DomainError(429, 'RATE_LIMIT', 'Terlalu banyak permintaan.', ipLimit.retryAfter)
    await verifyTurnstile(turnstileToken, ip)
    const blind = nikBlindIndex(nik), nikLimit = await rateLimit(`status:nik:${blind}`, 5, 3600)
    if (!nikLimit.ok) throw new DomainError(429, 'RATE_LIMIT', 'Terlalu banyak permintaan.', nikLimit.retryAfter)
    await connectDatabase()
    const recipient = await Recipients.findOne({ nikBlindIndex: blind, status: 'FINAL', deletedAt: null }).select('_id name').lean()
    await appendAudit({ actor: 'anonymous', action: 'PUBLIC_STATUS_CHECK', diff: { blindIndexPrefix: blind.slice(0, 12) } })
    if (!recipient) return json(toPublicStatusCheckDto({ found: false }))
    const enrollmentIds = await Enrollments.find({ recipientId: recipient._id }).distinct('programId')
    const enrolledPrograms = await Programs.find({ _id: { $in: enrollmentIds }, status: { $in: ['ACTIVE', 'CLOSED'] } }).select('_id code name amountPerRecipient startPeriod endPeriod').limit(100).lean()
    const paid = await Disbursements.find({ recipientId: recipient._id, status: 'SUCCESS', deletedAt: null }).select('programId periodId amount chain.txHash').limit(5000).lean()
    const successes = new Map(paid.map(row => [`${row.programId}:${row.periodId}`, { txHash: row.chain?.txHash, amount: row.amount }]))
    const wita = new Date(Date.now() + 8 * 3600000), currentPeriod = wita.getUTCFullYear() * 100 + wita.getUTCMonth() + 1
    const entries: { program: { code?: string; name?: string | null }; period: number; amount: number; status: string; txHash?: string | null }[] = []
    for (const program of enrolledPrograms) {
      for (let period = program.startPeriod ?? currentPeriod; period <= Math.min(program.endPeriod ?? currentPeriod, currentPeriod); period = period % 100 === 12 ? period + 89 : period + 1) {
        if (entries.length >= 5000) throw new DomainError(503, 'RESULT_TOO_LARGE', 'Hubungi petugas untuk riwayat lengkap.')
        const key = `${program._id}:${period}`, success = successes.get(key), txHash = success?.txHash
        const amount = success?.amount ?? program.amountPerRecipient ?? 0
        entries.push({ program: { code: program.code, name: program.name }, period, amount, status: successes.has(key) ? 'SUDAH_DISALURKAN' : 'BELUM_DISALURKAN', ...(txHash ? { txHash } : {}) })
      }
    }
    return json(toPublicStatusCheckDto({ found: true, name: recipient.name, entries }))
  } finally { await new Promise(resolve => setTimeout(resolve, Math.max(0, delay - (Date.now() - started)))) }
}
