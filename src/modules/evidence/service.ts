import 'server-only'
import { z } from 'zod'
import { createHash, randomUUID } from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import { Disbursements } from '@/lib/db/models'
import { appendAuditBestEffort } from '@/modules/audit/service'
import { requestContext } from '@/lib/auth/request-origin'
import { audit, body, boundedBody, conflict, DomainError, json, notFound, oid, reasonSchema, type DomainContext } from '../domain/http'
import { toEvidenceDto, toWithdrawEvidenceDto } from '@/modules/disbursements/dto'
import { cidSchema, gatewayUrl, pinata } from './pinata'

const MAX_SIZE = 5 * 1024 * 1024
export const consentFields = ['privacyNoPii', 'privacyNoSensitiveFaces', 'privacyConsent', 'previewConfirmed'] as const
export async function processEvidence(file: File) {
  if (!file.size || file.size > MAX_SIZE) throw new DomainError(400, 'FILE_SIZE', 'Setiap berkas harus berukuran 1 byte hingga 5 MB.')
  let bytes = Buffer.from(await file.arrayBuffer())
  let type
  try { type = await fileTypeFromBuffer(bytes) } catch { throw new DomainError(400, 'FILE_TYPE', 'Berkas tidak valid.') }
  if (!type || !['image/jpeg', 'application/pdf'].includes(type.mime)) throw new DomainError(400, 'FILE_TYPE', 'Hanya JPEG atau PDF yang diizinkan.')
  if (type.mime === 'image/jpeg') {
    try { bytes = await sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' }).rotate().jpeg({ quality: 90 }).toBuffer() }
    catch { throw new DomainError(400, 'INVALID_JPEG', 'Berkas JPEG tidak valid atau terlalu besar untuk diproses.') }
  }
  if (bytes.length > MAX_SIZE) throw new DomainError(400, 'FILE_SIZE', 'Berkas hasil pemrosesan melebihi 5 MB.')
  return { bytes, mime: type.mime, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), name: `evidence-${randomUUID()}.${type.mime === 'image/jpeg' ? 'jpg' : 'pdf'}` }
}
export async function upload(ctx: DomainContext) {
  if (!ctx.request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new DomainError(400, 'MULTIPART_REQUIRED', 'Gunakan multipart/form-data.')
  const bytes = await boundedBody(ctx.request, 3 * MAX_SIZE + 65536)
  let form: FormData
  try { form = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': ctx.request.headers.get('content-type')! } }).formData() }
  catch { throw new DomainError(400, 'INVALID_MULTIPART', 'Data multipart tidak valid.') }
  const statement = Object.fromEntries(consentFields.map(field => [field, form.get(field) === 'true']))
  z.object({ privacyNoPii: z.literal(true), privacyNoSensitiveFaces: z.literal(true), privacyConsent: z.literal(true), previewConfirmed: z.literal(true) }).parse(statement)
  const files: File[] = []
  for (const [key, value] of form.entries()) {
    if (value instanceof File && (key === 'files' || key === 'file')) files.push(value)
    else if (!consentFields.includes(key as typeof consentFields[number]) || value instanceof File) throw new DomainError(400, 'INVALID_MULTIPART', 'Field multipart tidak diizinkan.')
  }
  if (files.length < 1 || files.length > 3) throw new DomainError(400, 'EVIDENCE_COUNT', 'Unggah 1–3 berkas bukti.')
  const id = oid(ctx.params.id), token = randomUUID()
  const locked = await Disbursements.findOneAndUpdate({ _id: id, status: 'DRAFT', deletedAt: null, $expr: { $lte: [{ $add: [{ $size: { $ifNull: ['$evidence', []] } }, files.length] }, 3] }, $or: [{ 'evidenceLease.token': { $exists: false } }, { 'evidenceLease.expiresAt': { $lte: new Date() } }] }, { $set: { evidenceLease: { token, expiresAt: new Date(Date.now() + 300000) } } }, { new: true }).lean()
  if (!locked) conflict('EVIDENCE_STATE', 'Bukti hanya dapat ditambah pada DRAFT, maksimal tiga berkas, dan tanpa operasi bukti lain.')
  const uploaded: { cid: string; pinataId: string; duplicate: boolean; mime: string; size: number; sha256: string; name: string; access: 'PUBLIC'; status: 'ACTIVE' }[] = []
  let committed = false
  try {
    const processed = []
    for (const file of files) processed.push(await processEvidence(file))
    await audit(ctx, 'EVIDENCE_PRIVACY_CONFIRMED', 'disbursements', ctx.params.id, statement)
    for (const file of processed) {
      const result = await pinata.upload(file.bytes, file.name, file.mime)
      uploaded.push({ ...result, mime: file.mime, size: file.size, sha256: file.sha256, name: file.name, access: 'PUBLIC', status: 'ACTIVE' })
    }
    if (new Set([...locked.evidence.map(item => item.cid), ...uploaded.map(item => item.cid)]).size !== locked.evidence.length + uploaded.length) conflict('DUPLICATE_EVIDENCE', 'Bukti yang sama sudah diunggah.')
    const result = await Disbursements.updateOne({ _id: id, status: 'DRAFT', deletedAt: null, 'evidenceLease.token': token }, { $push: { evidence: { $each: uploaded.map(({ duplicate: _duplicate, ...item }) => item) } }, $unset: { evidenceLease: 1 } })
    if (!result.modifiedCount) conflict('RECORD_CHANGED', 'Data berubah saat unggah bukti.')
    committed = true
    await audit(ctx, 'EVIDENCE_UPLOADED', 'disbursements', ctx.params.id, { ...statement, cids: uploaded.map(item => item.cid) })
    return json({ data: uploaded.map(toEvidenceDto) }, 201)
  } finally {
    if (!committed) {
      for (const item of uploaded) {
        if (item.duplicate) continue
        try { await pinata.unpin(item.pinataId) }
        catch { await appendAuditBestEffort({ actor: ctx.actor.userId, role: ctx.actor.role, action: 'EVIDENCE_ORPHAN_CLEANUP_REQUIRED', entity: 'disbursements', entityId: ctx.params.id, diff: { cid: item.cid, pinataId: item.pinataId }, ...requestContext(ctx.request) }) }
      }
      await Disbursements.updateOne({ _id: id, 'evidenceLease.token': token }, { $unset: { evidenceLease: 1 } })
    }
  }
}
export async function publicEvidence(_request: Request, params: Record<string, string>) {
  // TODO(PRD FR-EVD-04): public evidence is restricted to chain-confirmed SUCCESS records.
  const row = await Disbursements.findOne({ _id: oid(params.id), status: 'SUCCESS', deletedAt: null }).select('evidence').lean()
  if (!row) notFound()
  return json({ data: row.evidence.map(item => ({ cid: item.cid, mime: item.mime, size: item.size, status: item.status, gatewayUrl: item.status === 'ACTIVE' ? gatewayUrl(item.cid!) : null })) })
}
export async function withdraw(ctx: DomainContext) {
  // TODO(PRD §12): explicit withdrawal endpoint for FR-EVD-08.
  const cid = cidSchema.parse(ctx.params.cid), { reason } = await body(ctx.request, reasonSchema)
  const id = oid(ctx.params.id), token = randomUUID()
  const row = await Disbursements.findOneAndUpdate({ _id: id, deletedAt: null, 'evidence.cid': cid, $or: [{ 'evidenceLease.token': { $exists: false } }, { 'evidenceLease.expiresAt': { $lte: new Date() } }] }, { $set: { evidenceLease: { token, expiresAt: new Date(Date.now() + 120000) } } }, { new: true }).lean()
  if (!row) conflict('EVIDENCE_STATE', 'Bukti tidak ditemukan atau sedang diproses.')
  try {
    const evidence = row.evidence.find(item => item.cid === cid)!
    if (evidence.status === 'WITHDRAWN' && !evidence.unpinPending) return json(toWithdrawEvidenceDto({ status: 'WITHDRAWN' }))
    if (!evidence.pinataId) throw new DomainError(503, 'PINATA_FILE_ID_MISSING', 'ID penyimpanan bukti tidak tersedia untuk penarikan.')
    const shared = await Disbursements.exists({ _id: { $ne: id }, evidence: { $elemMatch: { pinataId: evidence.pinataId, status: 'ACTIVE' } } })
    if (shared) conflict('SHARED_EVIDENCE', 'Bukti digunakan oleh penyaluran lain; diperlukan penanganan administrator.')
    await audit(ctx, 'EVIDENCE_WITHDRAWAL_REQUESTED', 'disbursements', ctx.params.id, { cid, reason })
    await Disbursements.updateOne({ _id: id, 'evidenceLease.token': token }, { $set: { 'evidence.$[item].status': 'WITHDRAWN', 'evidence.$[item].withdrawnAt': new Date(), 'evidence.$[item].withdrawnBy': ctx.actor.userId, 'evidence.$[item].withdrawReason': reason, 'evidence.$[item].unpinPending': true } }, { arrayFilters: [{ 'item.cid': cid }] })
    await pinata.unpin(evidence.pinataId)
    await Disbursements.updateOne({ _id: id, 'evidenceLease.token': token }, { $set: { 'evidence.$[item].unpinPending': false } }, { arrayFilters: [{ 'item.cid': cid }] })
    await audit(ctx, 'EVIDENCE_WITHDRAWN', 'disbursements', ctx.params.id, { cid, reason })
    return json(toWithdrawEvidenceDto({ status: 'WITHDRAWN', message: 'Pin dilepas. Salinan publik di IPFS pihak lain tidak dapat ditarik kembali.' }))
  } finally { await Disbursements.updateOne({ _id: id, 'evidenceLease.token': token }, { $unset: { evidenceLease: 1 } }) }
}
