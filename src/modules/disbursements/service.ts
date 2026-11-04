import 'server-only'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { Types, type FilterQuery, type PipelineStage } from 'mongoose'
import { Programs, Recipients, Enrollments, Disbursements } from '@/lib/db/models'
import { ledgerInterface } from '@/lib/blockchain/abi'
import { refIdFromDataId, periodIdFromYYYYMM } from '@/lib/blockchain/chain-keys'
import { expectedWallet } from '@/lib/auth/expected-wallet'
import { getEnv } from '@/lib/env'
import { canonicalJSON } from '@/modules/audit/service'
import { assertDeadline } from '@/modules/chain/config'
import { chainVerifier, chainMessage, type Receipt } from '../chain/verifier'
import {
  toDisbursementDto,
  toDisbursementCreatedDto,
  toDisbursementPreflightDto,
  toDisbursementTxIntentDto,
  type PreflightCheckInput,
} from './dto'
import { audit, body, conflict, DomainError, duplicate, idSchema, json, notFound, oid, pageQuery, periodSchema, query, reasonSchema, txSchema, type DomainContext } from '../domain/http'

export const disbursementInput = z.object({ programId: idSchema, period: periodSchema, recipientId: idSchema, disbursedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(value); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value }), note: z.string().trim().max(2000).default('') }).strict()
export const preflightInput = z.object({ programId: idSchema, period: periodSchema, recipientId: idSchema }).strict()
export const disbursementProjection = '-idempotencyKey -requestHash -evidenceLease -evidence.pinataId'
export function duplicateDisbursement(error: unknown): never { if (duplicate(error)) conflict('AlreadyDisbursed', chainMessage('AlreadyDisbursed')); throw error }
function availableEvidence() { return { $or: [{ 'evidenceLease.token': { $exists: false } }, { 'evidenceLease.expiresAt': { $lte: new Date() } }] } }
function disbursementEnrichmentStages(): PipelineStage.FacetPipelineStage[] {
  return [
    {
      $lookup: {
        from: 'programs',
        localField: 'programId',
        foreignField: '_id',
        pipeline: [{ $project: { _id: 1, code: 1, name: 1 } }],
        as: 'program',
      },
    },
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
        program: { $arrayElemAt: ['$program', 0] },
        recipient: { $arrayElemAt: ['$recipient', 0] },
      },
    },
    {
      $project: {
        idempotencyKey: 0,
        requestHash: 0,
        evidenceLease: 0,
        'evidence.pinataId': 0,
      },
    },
  ]
}
export function checkProgramActive(program: { status?: string | null } | null | undefined): boolean {
  return Boolean(program && program.status === 'ACTIVE')
}

export function checkPeriodInRange(
  program: { startPeriod?: number | null; endPeriod?: number | null } | null | undefined,
  period: number,
): boolean {
  return Boolean(
    program &&
      typeof program.startPeriod === 'number' &&
      typeof program.endPeriod === 'number' &&
      period >= program.startPeriod &&
      period <= program.endPeriod,
  )
}

export function checkRecipientRegisteredOnChain(enrollment: unknown): boolean {
  return Boolean(enrollment)
}

export function checkNoDuplicateDisbursement(existing: unknown): boolean {
  return !existing
}

export function checkAmountMatchesProgram(
  program: { amountPerRecipient?: number | null } | null | undefined,
  candidateAmount?: number | null,
): boolean {
  return Boolean(
    program &&
      typeof program.amountPerRecipient === 'number' &&
      Number.isSafeInteger(program.amountPerRecipient) &&
      program.amountPerRecipient > 0 &&
      candidateAmount === program.amountPerRecipient,
  )
}

export function checkRecipientFinalWithCommitment(
  recipient: { status?: string | null; deletedAt?: Date | null; commitment?: string | null } | null | undefined,
): boolean {
  return Boolean(
    recipient &&
      (recipient.status ?? 'FINAL') === 'FINAL' &&
      !recipient.deletedAt &&
      typeof recipient.commitment === 'string' &&
      /^0x[0-9a-fA-F]{64}$/.test(recipient.commitment),
  )
}

export function checkAuthorizedKelurahanWallet(
  actor: { walletVerified?: boolean; boundWalletAddress?: string | null },
  authorizedWallet: string | null | undefined,
): boolean {
  return Boolean(
    actor.walletVerified &&
      typeof actor.boundWalletAddress === 'string' &&
      typeof authorizedWallet === 'string' &&
      authorizedWallet.length > 0 &&
      actor.boundWalletAddress.toLowerCase() === authorizedWallet.toLowerCase(),
  )
}

async function resolveAuthorizedWallet(): Promise<string | null> {
  try {
    const status = await chainVerifier.walletStatus()
    if (status.authorizedWallet) return status.authorizedWallet
  } catch {
    // Fallback to expectedWallet when full walletStatus RPC is unavailable
  }
  try {
    return await expectedWallet()
  } catch {
    return null
  }
}

function buildPreflightCheck(
  key: PreflightCheckInput['key'],
  label: string,
  ok: boolean,
  errorCode: string,
): PreflightCheckInput {
  return ok ? { key, label, ok: true } : { key, label, ok: false, message: chainMessage(errorCode) }
}

export async function prevalidate(
  programId: Types.ObjectId,
  recipientId: Types.ObjectId,
  period: number,
  excludeId?: Types.ObjectId,
  expectedAmount?: number | null,
) {
  const program = await Programs.findById(programId).lean()
  if (!program) notFound()
  if (!checkProgramActive(program)) conflict('ProgramClosed', chainMessage('ProgramClosed'))
  if (!checkPeriodInRange(program, period)) conflict('PeriodOutOfRange', chainMessage('PeriodOutOfRange'))
  const enrollment = await Enrollments.exists({ programId, recipientId, status: 'REGISTERED_ONCHAIN' })
  if (!checkRecipientRegisteredOnChain(enrollment)) conflict('RecipientNotRegistered', chainMessage('RecipientNotRegistered'))
  const existing = await Disbursements.exists({ programId, recipientId, periodId: period, status: { $in: ['PENDING', 'SUCCESS'] }, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
  if (!checkNoDuplicateDisbursement(existing)) conflict('AlreadyDisbursed', chainMessage('AlreadyDisbursed'))
  if (!checkAmountMatchesProgram(program, expectedAmount ?? program.amountPerRecipient)) conflict('AmountMismatch', chainMessage('AmountMismatch'))
  const recipient = await Recipients.findOne({ _id: recipientId, status: 'FINAL', deletedAt: null }).select('commitment name nikMasked status deletedAt').lean()
  if (!checkRecipientFinalWithCommitment(recipient)) conflict('RecipientNotRegistered', chainMessage('RecipientNotRegistered'))
  return { program, recipient: recipient! }
}

// TODO(PRD §12): Non-persisting preflight check endpoint for disbursement wizard.
export async function preflight(ctx: DomainContext) {
  const input = await body(ctx.request, preflightInput)
  const programId = oid(input.programId)
  const recipientId = oid(input.recipientId)
  const period = periodIdFromYYYYMM(input.period)
  const [program, enrollment, existingDuplicate, existingDraft, recipient, authorizedWallet] = await Promise.all([
    Programs.findById(programId).lean(),
    Enrollments.exists({ programId, recipientId, status: 'REGISTERED_ONCHAIN' }),
    Disbursements.exists({ programId, recipientId, periodId: period, status: { $in: ['PENDING', 'SUCCESS'] } }),
    Disbursements.findOne({ programId, recipientId, periodId: period, status: 'DRAFT', deletedAt: null }).select('amount').lean(),
    Recipients.findOne({ _id: recipientId, status: 'FINAL', deletedAt: null }).select('commitment name nikMasked status deletedAt').lean(),
    resolveAuthorizedWallet(),
  ])
  const candidateAmount = existingDraft ? existingDraft.amount : program?.amountPerRecipient
  const checks: PreflightCheckInput[] = [
    buildPreflightCheck('program_active', 'Program aktif', checkProgramActive(program), 'ProgramClosed'),
    buildPreflightCheck('period_in_range', 'Periode dalam rentang program', checkPeriodInRange(program, period), 'PeriodOutOfRange'),
    buildPreflightCheck('recipient_registered', 'Penerima terdaftar on-chain', checkRecipientRegisteredOnChain(enrollment), 'RecipientNotRegistered'),
    buildPreflightCheck('no_duplicate', 'Duplikasi periode', checkNoDuplicateDisbursement(existingDuplicate), 'AlreadyDisbursed'),
    buildPreflightCheck('amount_matches_program', 'Kesesuaian nominal', checkAmountMatchesProgram(program, candidateAmount), 'AmountMismatch'),
    buildPreflightCheck('recipient_final_commitment', 'Status FINAL & commitment penerima', checkRecipientFinalWithCommitment(recipient), 'RecipientNotRegistered'),
    buildPreflightCheck('authorized_wallet', 'Kewenangan wallet Kelurahan', checkAuthorizedKelurahanWallet(ctx.actor, authorizedWallet), 'NotAuthorized'),
  ]
  const ok = checks.every(check => check.ok)
  return json(toDisbursementPreflightDto({ ok, checks }))
}

// TODO(PRD §12): Server-side calldata encoding for recordDisbursement transaction intent.
export async function txIntent(ctx: DomainContext) {
  await body(ctx.request, z.object({}).strict())
  const row = await Disbursements.findOne({ _id: oid(ctx.params.id), deletedAt: null }).lean()
  if (!row) notFound()
  if (row.status !== 'DRAFT') conflict()
  const activeEvidence = row.evidence.find(item => item.status === 'ACTIVE' && Boolean(item.cid))
  if (!activeEvidence?.cid) conflict('EVIDENCE_REQUIRED', 'Minimal satu bukti aktif wajib diunggah.')
  const { program } = await prevalidate(row.programId, row.recipientId, row.periodId!, row._id, row.amount)
  if (!program.programId || !row.commitment || row.periodId == null || row.amount == null) {
    conflict('IMMUTABLE_RECORD', 'Data penyaluran belum lengkap untuk penandatanganan transaksi.')
  }
  const to = getEnv('NEXT_PUBLIC_CONTRACT_ADDRESS')
  const chainId = getEnv('NEXT_PUBLIC_CHAIN_ID')
  if (!to || !chainId) throw new DomainError(503, 'CHAIN_NOT_CONFIGURED', 'Blockchain belum dikonfigurasi.')
  const data = ledgerInterface.encodeFunctionData('recordDisbursement', [
    {
      refId: row.refId,
      programId: program.programId,
      periodId: row.periodId,
      recipientCommitment: row.commitment,
      amount: BigInt(row.amount),
      evidenceCid: activeEvidence.cid,
    },
  ])
  return json(toDisbursementTxIntentDto({ to, data, chainId, evidenceCid: activeEvidence.cid }))
}
function preview(row: { refId: string; periodId?: number | null; commitment?: string | null; amount?: number | null }, chainProgramId?: string | null) {
  return { refId: row.refId, programId: chainProgramId, periodId: row.periodId, commitment: row.commitment, amount: row.amount }
}
export async function create(ctx: DomainContext) {
  const raw = await body(ctx.request, z.record(z.string(), z.unknown()))
  if (Object.hasOwn(raw, 'amount')) throw new DomainError(400, 'AMOUNT_NOT_ALLOWED', 'Nominal ditentukan oleh program, bukan oleh klien.')
  const input = disbursementInput.parse(raw)
  const requestHash = createHash('sha256').update(canonicalJSON(input)).digest('hex')
  const header = ctx.request.headers.get('idempotency-key')
  const idempotencyKey = header === null ? undefined : createHash('sha256').update(`${ctx.actor.userId}:${z.string().min(1).max(200).regex(/^[\x21-\x7e]+$/).parse(header)}`).digest('hex')
  const replay = async () => {
    const existing = idempotencyKey ? await Disbursements.findOne({ idempotencyKey }).lean() : null
    if (!existing) return null
    if (existing.requestHash !== requestHash) conflict('IDEMPOTENCY_CONFLICT', 'Idempotency-Key sudah digunakan untuk permintaan berbeda.')
    const [program, recipient] = await Promise.all([
      Programs.findById(existing.programId).select('programId code name').lean(),
      Recipients.findOne({ _id: existing.recipientId }).select('name nikMasked').lean(),
    ])
    return json(
      toDisbursementCreatedDto(
        { ...existing, program, recipient },
        preview(existing, program?.programId),
        !!existing.deletedAt,
      ),
    )
  }
  const prior = await replay(); if (prior) return prior
  const programId = oid(input.programId), recipientId = oid(input.recipientId)
  const { program, recipient } = await prevalidate(programId, recipientId, input.period)
  const _id = new Types.ObjectId()
  let row
  try {
    row = await Disbursements.create({ _id, refId: refIdFromDataId(String(_id)), programId, recipientId, periodId: periodIdFromYYYYMM(input.period), commitment: recipient.commitment, amount: program.amountPerRecipient, disbursedDate: new Date(input.disbursedDate), note: input.note, status: 'DRAFT', createdBy: ctx.actor.userId, ...(idempotencyKey ? { idempotencyKey, requestHash } : {}) })
  } catch (error) { if (duplicate(error)) { const previous = await replay(); if (previous) return previous }; duplicateDisbursement(error) }
  await audit(ctx, 'DISBURSEMENT_CREATED', 'disbursements', String(row._id))
  const plainRow = typeof (row as unknown as { toObject?: () => Record<string, unknown> }).toObject === 'function'
    ? (row as unknown as { toObject: () => Record<string, unknown> }).toObject()
    : (row as unknown as Record<string, unknown>)
  return json(
    toDisbursementCreatedDto(
      { ...plainRow, program, recipient },
      preview(row, program.programId),
    ),
    201,
  )
}
export async function list(ctx: DomainContext) {
  const paging = pageQuery(ctx.request, ['createdAt', 'updatedAt', 'periodId', 'amount', 'disbursedDate'])
  const input = z.object({ programId: idSchema.optional(), recipientId: idSchema.optional(), period: z.coerce.number().pipe(periodSchema).optional(), status: z.enum(['DRAFT', 'PENDING', 'SUCCESS', 'FAILED']).optional() }).parse(query(ctx.request))
  const filter: FilterQuery<unknown> = { deletedAt: null }
  if (input.programId) filter.programId = oid(input.programId)
  if (input.recipientId) filter.recipientId = oid(input.recipientId)
  if (input.period) filter.periodId = input.period
  if (input.status) filter.status = input.status
  const [agg] = await Disbursements.aggregate<{ data: unknown[]; total: { count: number }[] }>([
    { $match: filter },
    {
      $facet: {
        data: [
          { $sort: paging.sort },
          { $skip: paging.skip },
          { $limit: paging.limit },
          ...disbursementEnrichmentStages(),
        ],
        total: [{ $count: 'count' }],
      },
    },
  ])
  const data = agg?.data ?? []
  const total = agg?.total[0]?.count ?? 0
  return json({ data: data.map(toDisbursementDto), total, page: paging.page, limit: paging.limit, totalPages: Math.ceil(total / paging.limit) })
}
export async function detail(ctx: DomainContext) {
  const [row] = await Disbursements.aggregate([
    { $match: { _id: oid(ctx.params.id), deletedAt: null } },
    { $limit: 1 },
    ...disbursementEnrichmentStages(),
  ])
  if (!row) notFound()
  return json(toDisbursementDto(row))
}
export async function softDelete(ctx: DomainContext) {
  const { reason } = await body(ctx.request, reasonSchema)
  const result = await Disbursements.updateOne({ _id: oid(ctx.params.id), status: 'DRAFT', deletedAt: null, ...availableEvidence() }, { $set: { deletedAt: new Date(), deletedBy: ctx.actor.userId, deletedReason: reason } })
  if (!result.modifiedCount) conflict()
  await audit(ctx, 'DISBURSEMENT_SOFT_DELETED', 'disbursements', ctx.params.id, { reason })
  return json({ ok: true })
}
export async function submitted(ctx: DomainContext) {
  const { txHash } = await body(ctx.request, z.object({ txHash: txSchema }).strict())
  const row = await Disbursements.findOne({ _id: oid(ctx.params.id), deletedAt: null }).lean(); if (!row) notFound()
  if (row.status !== 'DRAFT') conflict()
  const { program, recipient } = await prevalidate(row.programId, row.recipientId, row.periodId!, row._id, row.amount)
  if (!row.evidence.some(item => item.status === 'ACTIVE')) conflict('EVIDENCE_REQUIRED', 'Minimal satu bukti aktif wajib diunggah.')
  let updated
  try {
    updated = await Disbursements.findOneAndUpdate({ _id: row._id, status: 'DRAFT', deletedAt: null, evidence: { $elemMatch: { status: 'ACTIVE' } }, ...availableEvidence() }, { $set: { status: 'PENDING', 'chain.txHash': txHash }, $push: { attempts: { at: new Date(), txHash, outcome: 'SUBMITTED', by: ctx.actor.userId } } }, { new: true }).select(disbursementProjection).lean()
  } catch (error) { duplicateDisbursement(error) }
  if (!updated) conflict()
  await audit(ctx, 'TX_SUBMITTED', 'disbursements', ctx.params.id, { txHash })
  return json(toDisbursementDto({ ...updated, program, recipient }))
}
async function persistConfirmed(id: Types.ObjectId, txHash: string, receipt: Receipt, actorId: string) {
  return Disbursements.findOneAndUpdate({ _id: id, status: 'PENDING', 'chain.txHash': txHash, deletedAt: null }, { $set: { status: 'SUCCESS', chain: { ...receipt, confirmedAt: new Date() } }, $push: { attempts: { at: new Date(), txHash, outcome: 'CONFIRMED', by: actorId } }, $unset: { lastError: 1 } }, { new: true }).select(disbursementProjection).lean()
}
export async function confirm(ctx: DomainContext) {
  const input = await body(ctx.request, z.object({ txHash: txSchema.optional() }).strict())
  const row = await Disbursements.findOne({ _id: oid(ctx.params.id), deletedAt: null }).lean(); if (!row) notFound()
  const txHash = input.txHash ?? row.chain?.txHash
  if (!txHash || row.chain?.txHash !== txHash) conflict('TX_HASH_MISMATCH', 'Hash transaksi tidak cocok dengan percobaan aktif.')
  if (row.status === 'SUCCESS') return detail(ctx)
  if (row.status !== 'PENDING') conflict()
  const program = await Programs.findById(row.programId).select('programId code name').lean(); if (!program) notFound()
  const result = await chainVerifier.verifyDisbursement(txHash, { refId: row.refId, programId: program.programId!, periodId: row.periodId!, commitment: row.commitment!, amount: row.amount!, evidenceCids: row.evidence.map(item => item.cid!).filter(Boolean) })
  if (result.status === 'PENDING' || result.status === 'NOT_FOUND') return json({ status: 'PENDING' }, 202)
  assertDeadline()
  let updated
  if (result.status === 'CONFIRMED') {
    if (result.receipt.txHash.toLowerCase() !== txHash) conflict('TX_HASH_MISMATCH', 'Receipt tidak cocok dengan transaksi aktif.')
    try { updated = await persistConfirmed(row._id, txHash, result.receipt, ctx.actor.userId) } catch (error) { duplicateDisbursement(error) }
  } else {
    updated = await Disbursements.findOneAndUpdate({ _id: row._id, status: 'PENDING', 'chain.txHash': txHash }, { $set: { status: 'FAILED', lastError: result.errorCode }, $push: { attempts: { at: new Date(), txHash, outcome: result.status, errorCode: result.errorCode, by: ctx.actor.userId } } }, { new: true }).select(disbursementProjection).lean()
  }
  if (!updated) conflict('RECORD_CHANGED', 'Status transaksi sudah berubah. Muat ulang data.')
  await audit(ctx, 'DISBURSEMENT_CONFIRMED', 'disbursements', ctx.params.id, { txHash, outcome: result.status })
  return json({ ...toDisbursementDto({ ...updated, program }), ...(result.status === 'CONFIRMED' ? {} : { errorCode: result.errorCode, message: chainMessage(result.errorCode) }) })
}
export async function retry(ctx: DomainContext) {
  await body(ctx.request, z.object({}).strict())
  const row = await Disbursements.findOne({ _id: oid(ctx.params.id), status: 'FAILED', deletedAt: null }).lean()
  if (!row) conflict()
  const { program, recipient } = await prevalidate(row.programId, row.recipientId, row.periodId!, row._id, row.amount)
  let updated
  try { updated = await Disbursements.findOneAndUpdate({ _id: row._id, status: 'FAILED', deletedAt: null, ...availableEvidence() }, { $set: { status: 'DRAFT' }, $unset: { chain: 1, lastError: 1 }, $push: { attempts: { at: new Date(), outcome: 'RETRY', by: ctx.actor.userId } } }, { new: true }).select(disbursementProjection).lean() } catch (error) { duplicateDisbursement(error) }
  if (!updated) conflict()
  await audit(ctx, 'DISBURSEMENT_RETRY', 'disbursements', ctx.params.id)
  return json(toDisbursementDto({ ...updated, program, recipient }))
}
