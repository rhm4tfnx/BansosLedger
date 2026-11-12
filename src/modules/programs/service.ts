import 'server-only'
import { z } from 'zod'
import { Interface } from 'ethers'
import type { FilterQuery, PipelineStage, Types } from 'mongoose'
import { Programs, Recipients, Enrollments, Disbursements } from '@/lib/db/models'
import { programIdFromCode } from '@/lib/blockchain/chain-keys'
import { getEnv } from '@/lib/env'
import { chainVerifier, chainMessage } from '../chain/verifier'
import { toProgramDto, toProgramEnrollmentItemDto } from './dto'
import { audit, body, conflict, DomainError, duplicate, escapeSearch, idSchema, json, notFound, oid, pageQuery, periodSchema, query, txSchema, type DomainContext } from '../domain/http'

export const programInput = z.object({ isPublic: z.boolean().optional(), code: z.string().regex(/^[A-Z0-9-]{3,20}$/), name: z.string().trim().min(2).max(160), description: z.string().trim().max(3000).optional(), fundSource: z.string().trim().min(1).max(160), kind: z.enum(['TUNAI', 'BARANG']), amountPerRecipient: z.number().int().positive().max(1e12), totalBudget: z.number().int().nonnegative().max(1e15), startPeriod: periodSchema, endPeriod: periodSchema }).strict()
function validatePeriods(input: { startPeriod?: number | null; endPeriod?: number | null }) { if (input.startPeriod == null || input.endPeriod == null || input.startPeriod > input.endPeriod) throw new DomainError(400, 'INVALID_PERIOD_RANGE', 'Rentang periode tidak valid.') }
export const programABI = new Interface(['function createProgram(bytes32 programId,uint128 amountPerRecipient,uint32 startPeriod,uint32 endPeriod)', 'function registerRecipients(bytes32 programId,bytes32[] commitments)', 'function closeProgram(bytes32 programId)'])
function payload(name: string, values: unknown[]) {
  const to = getEnv('NEXT_PUBLIC_CONTRACT_ADDRESS'), chainId = getEnv('NEXT_PUBLIC_CHAIN_ID')
  if (!to || !chainId) throw new DomainError(503, 'CHAIN_NOT_CONFIGURED', 'Blockchain belum dikonfigurasi.')
  return { to, chainId, data: programABI.encodeFunctionData(name, values) }
}
// Rule: remainingBudget = totalBudget minus disbursedAmount, counting SUCCESS disbursements only;
// PENDING and FAILED (as well as DRAFT) are not disbursed. All money is integer rupiah.
function programEnrichmentStages(): PipelineStage.FacetPipelineStage[] {
  return [
    {
      $lookup: {
        from: 'enrollments',
        localField: '_id',
        foreignField: 'programId',
        pipeline: [
          {
            $group: {
              _id: null,
              enrolledCount: { $sum: 1 },
              registeredCount: {
                $sum: { $cond: [{ $eq: ['$status', 'REGISTERED_ONCHAIN'] }, 1, 0] },
              },
            },
          },
        ],
        as: '_enrollmentStats',
      },
    },
    {
      $lookup: {
        from: 'disbursements',
        let: { progId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$programId', '$$progId'] },
              status: 'SUCCESS',
              deletedAt: null,
            },
          },
          {
            $group: {
              _id: null,
              disbursedCount: { $sum: 1 },
              disbursedAmount: { $sum: '$amount' },
            },
          },
        ],
        as: '_disbursementStats',
      },
    },
    {
      $set: {
        enrolledCount: { $ifNull: [{ $arrayElemAt: ['$_enrollmentStats.enrolledCount', 0] }, 0] },
        registeredCount: { $ifNull: [{ $arrayElemAt: ['$_enrollmentStats.registeredCount', 0] }, 0] },
        disbursedCount: { $ifNull: [{ $arrayElemAt: ['$_disbursementStats.disbursedCount', 0] }, 0] },
        disbursedAmount: { $ifNull: [{ $arrayElemAt: ['$_disbursementStats.disbursedAmount', 0] }, 0] },
      },
    },
    {
      $set: {
        // remainingBudget = totalBudget minus disbursedAmount, counting SUCCESS disbursements only; PENDING and FAILED are not disbursed.
        remainingBudget: { $subtract: [{ $ifNull: ['$totalBudget', 0] }, '$disbursedAmount'] },
      },
    },
    {
      $unset: ['_enrollmentStats', '_disbursementStats'],
    },
  ]
}
async function findEnrichedProgramById(id: Types.ObjectId) {
  const [row] = await Programs.aggregate([
    { $match: { _id: id } },
    { $limit: 1 },
    ...programEnrichmentStages(),
  ])
  return row ?? null
}
export async function metrics(program: { _id: unknown; amountPerRecipient?: number | null; totalBudget?: number | null }) {
  const id = oid(String(program._id))
  const [target, sums] = await Promise.all([Enrollments.countDocuments({ programId: id }), Disbursements.aggregate<{ count: number; rupiah: number }>([{ $match: { programId: id, status: 'SUCCESS', deletedAt: null } }, { $group: { _id: null, count: { $sum: 1 }, rupiah: { $sum: '$amount' } } }])])
  const pagu = program.totalBudget ?? 0, realisasi = sums[0] ?? { count: 0, rupiah: 0 }
  return { pagu, target, realisasi: { count: realisasi.count, rupiah: realisasi.rupiah }, sisa: pagu - realisasi.rupiah, percentage: pagu ? realisasi.rupiah / pagu * 100 : 0 }
}
export async function list(ctx: DomainContext) {
  const paging = pageQuery(ctx.request, ['createdAt', 'updatedAt', 'code', 'name', 'status'])
  const input = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(), search: z.string().max(160).optional() }).parse(query(ctx.request))
  const filter: FilterQuery<unknown> = {}
  if (input.status) filter.status = input.status
  if (input.search) filter.name = { $regex: escapeSearch(input.search), $options: 'i' }
  const [agg] = await Programs.aggregate<{ data: unknown[]; total: { count: number }[] }>([
    { $match: filter },
    {
      $facet: {
        data: [
          { $sort: paging.sort },
          { $skip: paging.skip },
          { $limit: paging.limit },
          ...programEnrichmentStages(),
        ],
        total: [{ $count: 'count' }],
      },
    },
  ])
  const data = agg?.data ?? []
  const total = agg?.total[0]?.count ?? 0
  return json({ data: data.map(toProgramDto), total, page: paging.page, limit: paging.limit, totalPages: Math.ceil(total / paging.limit) })
}
export async function create(ctx: DomainContext) {
  const input = await body(ctx.request, programInput); validatePeriods(input)
  let row
  try { row = await Programs.create({ ...input, programId: programIdFromCode(input.code), status: 'DRAFT' }) }
  catch (error) { if (duplicate(error)) throw new DomainError(409, 'DUPLICATE_PROGRAM_CODE', 'Kode program sudah terdaftar.'); throw error }
  await audit(ctx, 'PROGRAM_CREATED', 'programs', String(row._id))
  return json(toProgramDto(row), 201)
}
export async function detail(ctx: DomainContext) {
  const row = await findEnrichedProgramById(oid(ctx.params.id))
  if (!row) notFound()
  const dto = toProgramDto(row)
  const pagu = dto.totalBudget
  const summary = {
    pagu,
    target: dto.enrolledCount,
    realisasi: { count: dto.disbursedCount, rupiah: dto.disbursedAmount },
    sisa: dto.remainingBudget,
    percentage: pagu ? (dto.disbursedAmount / pagu) * 100 : 0,
  }
  return json({ ...dto, summary })
}
export async function update(ctx: DomainContext) {
  const input = await body(ctx.request, programInput.partial().refine(value => Object.keys(value).length > 0))
  const row = await Programs.findById(oid(ctx.params.id)).lean(); if (!row) notFound()
  if (row.status === 'CLOSED') conflict()
  const locked = ['code', 'amountPerRecipient', 'startPeriod', 'endPeriod'] as const
  if (row.status !== 'DRAFT' && locked.some(field => field in input)) conflict()
  validatePeriods({ ...row, ...input })
  let changed
  try { changed = await Programs.findOneAndUpdate({ _id: row._id, status: row.status, updatedAt: row.updatedAt }, { $set: { ...input, ...(input.code ? { programId: programIdFromCode(input.code) } : {}) } }, { new: true, runValidators: true }).lean() }
  catch (error) { if (duplicate(error)) conflict('DUPLICATE_PROGRAM_CODE', 'Kode program sudah terdaftar.'); throw error }
  if (!changed) conflict('RECORD_CHANGED', 'Data berubah. Muat ulang program.')
  await audit(ctx, 'PROGRAM_UPDATED', 'programs', ctx.params.id)
  const enriched = await findEnrichedProgramById(row._id)
  return json(toProgramDto(enriched ?? changed))
}
const enrollmentInput = z.object({ recipientIds: z.array(idSchema).min(1).max(100).refine(ids => new Set(ids.map(id => id.toLowerCase())).size === ids.length) }).strict()
const registerInput = z.union([enrollmentInput, z.object({ commitments: z.array(z.string().regex(/^0x[0-9a-fA-F]{64}$/).transform(value => value.toLowerCase())).min(1).max(100).refine(values => new Set(values).size === values.length) }).strict()])
export async function listEnrollments(ctx: DomainContext) {
  const programId = oid(ctx.params.id)
  const exists = await Programs.exists({ _id: programId })
  if (!exists) notFound()
  const paging = pageQuery(ctx.request, ['createdAt', 'updatedAt', 'status'])
  const input = z.object({ status: z.enum(['ENROLLED', 'REGISTERED_ONCHAIN']).optional() }).parse(query(ctx.request))
  const filter: FilterQuery<unknown> = { programId, ...(input.status ? { status: input.status } : {}) }
  const [agg] = await Enrollments.aggregate<{ data: unknown[]; total: { count: number }[] }>([
    { $match: filter },
    {
      $facet: {
        data: [
          { $sort: paging.sort },
          { $skip: paging.skip },
          { $limit: paging.limit },
          {
            $lookup: {
              from: 'recipients',
              localField: 'recipientId',
              foreignField: '_id',
              pipeline: [{ $project: { _id: 1, name: 1, nikMasked: 1 } }],
              as: 'recipient',
            },
          },
          {
            $set: {
              recipient: { $arrayElemAt: ['$recipient', 0] },
            },
          },
          {
            $project: {
              _id: 1,
              recipientId: 1,
              recipient: 1,
              status: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ])
  const data = agg?.data ?? []
  const total = agg?.total[0]?.count ?? 0
  return json({
    data: data.map(toProgramEnrollmentItemDto),
    total,
    page: paging.page,
    limit: paging.limit,
    totalPages: Math.ceil(total / paging.limit),
  })
}
export async function enroll(ctx: DomainContext) {
  const { recipientIds } = await body(ctx.request, enrollmentInput)
  const program = await Programs.findById(oid(ctx.params.id)).lean(); if (!program) notFound()
  if (program.status === 'CLOSED') conflict('ProgramClosed', chainMessage('ProgramClosed'))
  const recipients = await Recipients.find({ _id: { $in: recipientIds.map(oid) }, status: 'FINAL', deletedAt: null }).select('_id').lean()
  if (recipients.length !== recipientIds.length) conflict('RECIPIENT_NOT_FINAL', 'Semua penerima harus berstatus FINAL.')
  for (const recipient of recipients) {
    const current = await Programs.exists({ _id: program._id, status: { $ne: 'CLOSED' } })
    if (!current) conflict('ProgramClosed', chainMessage('ProgramClosed'))
    try { await Enrollments.updateOne({ programId: program._id, recipientId: recipient._id }, { $setOnInsert: { status: 'ENROLLED' } }, { upsert: true }) } catch (error) { if (!duplicate(error)) throw error }
  }
  await audit(ctx, 'RECIPIENTS_ENROLLED', 'programs', ctx.params.id, { recipientIds })
  return json({ enrolled: recipientIds.length })
}
export function intent(kind: 'create' | 'register' | 'close') {
  return async (ctx: DomainContext) => {
    const raw = await body(ctx.request, z.record(z.string(), z.unknown()))
    const input = kind === 'register' ? registerInput.parse(raw) : z.object({}).strict().parse(raw)
    const row = await Programs.findById(oid(ctx.params.id)).lean(); if (!row) notFound()
    if (row.status !== (kind === 'create' ? 'DRAFT' : 'ACTIVE')) conflict()
    if (kind === 'create') return json(payload('createProgram', [row.programId, row.amountPerRecipient, row.startPeriod, row.endPeriod]))
    if (kind === 'close') return json(payload('closeProgram', [row.programId]))
    const batch = registerInput.parse(input)
    const expectedCount = 'recipientIds' in batch ? batch.recipientIds.length : batch.commitments.length
    const filter = 'recipientIds' in batch ? { _id: { $in: batch.recipientIds.map(oid) }, commitment: { $exists: true } } : { commitment: { $in: batch.commitments } }
    const recipients = await Recipients.find({ ...filter, status: 'FINAL', deletedAt: null }).select('_id commitment').lean()
    const enrolled = await Enrollments.countDocuments({ programId: row._id, recipientId: { $in: recipients.map(recipient => recipient._id) } })
    if (enrolled !== expectedCount || recipients.length !== expectedCount) conflict('NOT_ENROLLED', 'Penerima belum terdaftar dalam program.')
    return json(payload('registerRecipients', [row.programId, recipients.map(recipient => recipient.commitment)]))
  }
}
export async function confirm(ctx: DomainContext) {
  // TODO(PRD §12): kind distinguishes the three program confirmation operations.
  const { kind, txHash } = await body(ctx.request, z.object({ kind: z.enum(['create', 'register', 'close']), txHash: txSchema }).strict())
  const row = await Programs.findById(oid(ctx.params.id)).lean(); if (!row) notFound()
  const result = await chainVerifier.verifyProgram(kind, txHash, { programId: row.programId!, amount: row.amountPerRecipient!, startPeriod: row.startPeriod!, endPeriod: row.endPeriod! })
  if (result.status === 'PENDING' || result.status === 'NOT_FOUND') return json({ status: 'PENDING' }, 202)
  if (result.status !== 'CONFIRMED') conflict(result.errorCode, chainMessage(result.errorCode))
  if (result.receipt.txHash.toLowerCase() !== txHash) conflict('MISMATCH', chainMessage('MISMATCH'))
  if (kind === 'register') {
    if (row.status !== 'ACTIVE') conflict()
    const commitments = z.array(z.string().regex(/^0x[0-9a-fA-F]{64}$/)).min(1).max(100).parse(result.commitments)
    const recipients = await Recipients.find({ commitment: { $in: commitments }, status: 'FINAL', deletedAt: null }).select('_id').lean()
    const ids = recipients.map(recipient => recipient._id)
    if (ids.length !== commitments.length || await Enrollments.countDocuments({ programId: row._id, recipientId: { $in: ids } }) !== ids.length) conflict('NOT_ENROLLED', 'Hasil registrasi tidak cocok dengan enrollment.')
    await Enrollments.updateMany({ programId: row._id, recipientId: { $in: ids }, status: 'ENROLLED' }, { $set: { status: 'REGISTERED_ONCHAIN', registerTxHash: txHash } })
  } else {
    const expected = kind === 'create' ? 'DRAFT' : 'ACTIVE', next = kind === 'create' ? 'ACTIVE' : 'CLOSED'
    if (row.status !== next) {
      const updated = await Programs.updateOne(
        { _id: row._id, status: expected, updatedAt: row.updatedAt },
        {
          $set: {
            status: next,
            ...(kind === 'create'
              ? {
                  isPublic: true,
                  chain: { createTxHash: txHash, blockNumber: result.receipt.blockNumber },
                }
              : {}),
          },
        },
      )
      if (!updated.modifiedCount) conflict()
    }
  }
  await audit(ctx, `PROGRAM_${kind.toUpperCase()}_CONFIRMED`, 'programs', ctx.params.id, { txHash })
  const updatedDoc = await findEnrichedProgramById(row._id)
  return json(toProgramDto(updatedDoc))
}
