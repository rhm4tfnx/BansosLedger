import 'server-only'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import type { FilterQuery, PipelineStage } from 'mongoose'
import { Recipients, Disbursements, RateLimits } from '@/lib/db/models'
import { encryptNik, decryptNik, nikBlindIndex, maskNik, validateNik, type EncryptedNik } from '@/lib/crypto/nik'
import { recipientCommitment } from '@/lib/blockchain/identity-hash'
import { toRecipientDto } from './dto'
import { DomainError, audit, body, conflict, duplicate, escapeSearch, idSchema, json, notFound, oid, pageQuery, query, reasonSchema, type DomainContext } from '../domain/http'

export const recipientInput = z.object({ nik: z.string().refine(validateNik), name: z.string().trim().min(2).max(160), address: z.object({ dusun: z.string().trim().min(1).max(100), rt: z.string().regex(/^\d{1,3}$/), rw: z.string().regex(/^\d{1,3}$/) }).strict(), phone: z.string().regex(/^\+?[0-9 -]{7,20}$/).optional() }).strict()
export const recipientProjection = '_id nikMasked name address phone status commitment createdAt updatedAt finalizedAt'
function encryptedFields(nik: string) { return { nikEnc: encryptNik(nik), nikBlindIndex: nikBlindIndex(nik), nikMasked: maskNik(nik) } }
function duplicateNik(error: unknown): never { if (duplicate(error)) throw new DomainError(409, 'DUPLICATE_NIK', 'NIK sudah terdaftar'); throw error }
function recipientEnrichmentStages(): PipelineStage.FacetPipelineStage[] {
  return [
    {
      $lookup: {
        from: 'enrollments',
        localField: '_id',
        foreignField: 'recipientId',
        pipeline: [
          { $sort: { createdAt: 1, _id: 1 } },
          {
            $lookup: {
              from: 'programs',
              localField: 'programId',
              foreignField: '_id',
              pipeline: [{ $project: { _id: 0, code: 1 } }],
              as: '_program',
            },
          },
          {
            $project: {
              _id: 0,
              programCode: { $ifNull: [{ $arrayElemAt: ['$_program.code', 0] }, ''] },
              status: 1,
            },
          },
        ],
        as: 'enrollments',
      },
    },
    {
      $project: {
        _id: 1,
        nikMasked: 1,
        name: 1,
        address: 1,
        phone: 1,
        status: 1,
        commitment: 1,
        enrollments: 1,
        createdAt: 1,
        updatedAt: 1,
        finalizedAt: 1,
      },
    },
  ]
}
function assertNoNikInQuery(request: Request) {
  const rawQuery = query(request)
  for (const [key, val] of Object.entries(rawQuery)) {
    if (key === 'nik' && val !== undefined) {
      throw new DomainError(400, 'NIK_IN_QUERY', 'NIK tidak boleh dikirim melalui URL; gunakan pencarian POST.')
    }
    if (typeof val === 'string' && /^\d{16}$/.test(val.trim())) {
      throw new DomainError(400, 'NIK_IN_QUERY', 'NIK tidak boleh dikirim melalui URL; gunakan pencarian POST.')
    }
  }
}

export async function list(ctx: DomainContext) {
  assertNoNikInQuery(ctx.request)
  const paging = pageQuery(ctx.request, ['createdAt', 'updatedAt', 'name', 'status'])
  const input = z.object({
    q: z.string().trim().max(160).optional(),
    search: z.string().trim().max(160).optional(),
    status: z.enum(['DRAFT', 'FINAL']).optional(),
    programId: idSchema.optional(),
    program: idSchema.optional(),
    notEnrolledIn: idSchema.optional(),
    dusun: z.string().max(100).optional(),
    rt: z.string().regex(/^\d{1,3}$/).optional(),
    rw: z.string().regex(/^\d{1,3}$/).optional(),
  }).parse(query(ctx.request))
  const filter: FilterQuery<unknown> = { deletedAt: null }
  if (input.status) filter.status = input.status
  for (const field of ['dusun', 'rt', 'rw'] as const) if (input[field]) filter[`address.${field}`] = input[field]
  const keyword = input.q ?? input.search
  if (keyword) {
    filter.name = { $regex: escapeSearch(keyword), $options: 'i' }
  }
  const effectiveProgramId = input.programId ?? input.program
  const preFilterStages: PipelineStage[] = [{ $match: filter }]
  if (effectiveProgramId) {
    preFilterStages.push(
      {
        $lookup: {
          from: 'enrollments',
          let: { recId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$recipientId', '$$recId'] },
                programId: oid(effectiveProgramId),
              },
            },
            { $limit: 1 },
            { $project: { _id: 1 } },
          ],
          as: '_inProgram',
        },
      },
      { $match: { '_inProgram.0': { $exists: true } } },
    )
  }
  if (input.notEnrolledIn) {
    preFilterStages.push(
      {
        $lookup: {
          from: 'enrollments',
          let: { recId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$recipientId', '$$recId'] },
                programId: oid(input.notEnrolledIn),
              },
            },
            { $limit: 1 },
            { $project: { _id: 1 } },
          ],
          as: '_excludedProgram',
        },
      },
      { $match: { '_excludedProgram.0': { $exists: false } } },
    )
  }
  const [agg] = await Recipients.aggregate<{ data: unknown[]; total: { count: number }[] }>([
    ...preFilterStages,
    {
      $facet: {
        data: [
          { $sort: paging.sort },
          { $skip: paging.skip },
          { $limit: paging.limit },
          ...recipientEnrichmentStages(),
        ],
        total: [{ $count: 'count' }],
      },
    },
  ])
  const data = agg?.data ?? []
  const total = agg?.total[0]?.count ?? 0
  return json({ data: data.map(toRecipientDto), total, page: paging.page, limit: paging.limit, totalPages: Math.ceil(total / paging.limit) })
}

// TODO(PRD §12): Exact NIK search via blind index using POST body so a NIK never appears in URLs.
export async function searchByNik(ctx: DomainContext) {
  assertNoNikInQuery(ctx.request)
  const paging = pageQuery(ctx.request, ['createdAt', 'updatedAt', 'name', 'status'])
  const { nik } = await body(ctx.request, z.object({ nik: z.string().trim().regex(/^\d{16}$/) }).strict())
  if (!validateNik(nik)) {
    await audit(ctx, 'RECIPIENT_NIK_SEARCH', 'recipients', 'search', { found: false })
    return json({ data: [], total: 0, page: paging.page, limit: paging.limit, totalPages: 0 })
  }
  const blind = nikBlindIndex(nik)
  const [agg] = await Recipients.aggregate<{ data: unknown[]; total: { count: number }[] }>([
    { $match: { deletedAt: null, nikBlindIndex: blind } },
    {
      $facet: {
        data: [
          { $sort: paging.sort },
          { $skip: paging.skip },
          { $limit: paging.limit },
          ...recipientEnrichmentStages(),
        ],
        total: [{ $count: 'count' }],
      },
    },
  ])
  const data = agg?.data ?? []
  const total = agg?.total[0]?.count ?? 0
  await audit(ctx, 'RECIPIENT_NIK_SEARCH', 'recipients', 'search', {
    blindIndexPrefix: blind.slice(0, 12),
    found: total > 0,
  })
  return json({ data: data.map(toRecipientDto), total, page: paging.page, limit: paging.limit, totalPages: Math.ceil(total / paging.limit) })
}
export async function create(ctx: DomainContext) {
  const { nik, ...input } = await body(ctx.request, recipientInput)
  let row
  try { row = await Recipients.create({ ...input, ...encryptedFields(nik), createdBy: ctx.actor.userId, status: 'DRAFT' }) } catch (error) { duplicateNik(error) }
  await audit(ctx, 'RECIPIENT_CREATED', 'recipients', String(row._id))
  const created = await Recipients.findById(row._id).select(recipientProjection).lean()
  return json(toRecipientDto(created), 201)
}
export async function detail(ctx: DomainContext) {
  const [row] = await Recipients.aggregate([
    { $match: { _id: oid(ctx.params.id), deletedAt: null } },
    { $limit: 1 },
    ...recipientEnrichmentStages(),
  ])
  if (!row) notFound()
  const paging = pageQuery(ctx.request, ['createdAt', 'periodId', 'amount'])
  const filter = { recipientId: row._id, deletedAt: null }
  const [data, total] = await Promise.all([Disbursements.find(filter).select('refId programId periodId amount status disbursedDate chain createdAt').sort(paging.sort).skip(paging.skip).limit(paging.limit).lean(), Disbursements.countDocuments(filter)])
  return json({
    ...toRecipientDto(row),
    history: {
      data: data.map(item => ({
        id: String((item as any)._id ?? (item as any).id),
        refId: item.refId,
        programId: String(item.programId),
        periodId: item.periodId,
        amount: item.amount,
        status: item.status,
        disbursedDate: item.disbursedDate ? (item.disbursedDate instanceof Date ? item.disbursedDate.toISOString() : String(item.disbursedDate)) : null,
        chain: item.chain ?? null,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt ?? new Date().toISOString()),
      })),
      total,
      page: paging.page,
      limit: paging.limit,
      totalPages: Math.ceil(total / paging.limit),
    },
  })
}
export async function update(ctx: DomainContext) {
  const patch = await body(ctx.request, recipientInput.partial().refine(value => Object.keys(value).length > 0))
  const { nik, ...rest } = patch
  let row
  try { row = await Recipients.findOneAndUpdate({ _id: oid(ctx.params.id), deletedAt: null, status: 'DRAFT' }, { $set: { ...rest, ...(nik ? encryptedFields(nik) : {}) } }, { new: true, runValidators: true }).select(recipientProjection).lean() } catch (error) { duplicateNik(error) }
  if (!row) conflict()
  await audit(ctx, 'RECIPIENT_UPDATED', 'recipients', ctx.params.id)
  return json(toRecipientDto(row))
}
export async function softDelete(ctx: DomainContext) {
  const { reason } = await body(ctx.request, reasonSchema)
  const result = await Recipients.updateOne({ _id: oid(ctx.params.id), status: 'DRAFT', deletedAt: null }, { $set: { deletedAt: new Date(), deletedBy: ctx.actor.userId, deletedReason: reason } })
  if (!result.modifiedCount) conflict()
  await audit(ctx, 'RECIPIENT_SOFT_DELETED', 'recipients', ctx.params.id, { reason })
  return json({ ok: true })
}
function readEncrypted(value: unknown): EncryptedNik {
  return z.object({ iv: z.string(), tag: z.string(), ct: z.string(), keyVersion: z.literal('v1') }).parse(value)
}
export async function finalize(ctx: DomainContext) {
  await body(ctx.request, z.object({}).strict())
  const row = await Recipients.findOne({ _id: oid(ctx.params.id), deletedAt: null }).lean()
  if (!row) notFound()
  if (row.status !== 'DRAFT') conflict()
  const commitment = recipientCommitment(decryptNik(readEncrypted(row.nikEnc)))
  const result = await Recipients.findOneAndUpdate({ _id: row._id, status: 'DRAFT', deletedAt: null, updatedAt: row.updatedAt, nikBlindIndex: row.nikBlindIndex }, { $set: { commitment, status: 'FINAL', finalizedAt: new Date(), finalizedBy: ctx.actor.userId } }, { new: true }).select(recipientProjection).lean()
  if (!result) conflict('RECORD_CHANGED', 'Data berubah. Muat ulang sebelum finalisasi.')
  await audit(ctx, 'RECIPIENT_FINALIZED', 'recipients', ctx.params.id)
  return json(toRecipientDto(result))
}
export async function reveal(ctx: DomainContext) {
  await body(ctx.request, z.object({}).strict())
  const now = Date.now(), window = 3600000, bucket = Math.floor(now / window)
  const expiresAt = new Date((bucket + 1) * window)
  const key = createHash('sha256').update(`reveal:${ctx.actor.userId}:${bucket}`).digest('hex')
  let rate
  try { rate = await RateLimits.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, new: true }) }
  catch (error) { if (!duplicate(error)) throw error; rate = await RateLimits.findOneAndUpdate({ _id: key }, { $inc: { count: 1 } }, { new: true }) }
  if (!rate || rate.count > 30) throw new DomainError(429, 'REVEAL_LIMIT', 'Batas pembukaan NIK tercapai.', Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)))
  const row = await Recipients.findOne({ _id: oid(ctx.params.id), deletedAt: null }).select('nikEnc').lean()
  if (!row) notFound()
  const nik = decryptNik(readEncrypted(row.nikEnc))
  await audit(ctx, 'REVEAL_NIK', 'recipients', ctx.params.id, { recipientId: ctx.params.id })
  return json({ nik })
}
