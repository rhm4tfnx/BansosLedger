import 'server-only'
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose'

const options = { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false, bufferCommands: false } as const
const version = { type: Number, default: 1, required: true }
const objectId = Schema.Types.ObjectId
const encrypted = new Schema({ iv: String, tag: String, ct: String, keyVersion: String }, { _id: false })
const bytes32 = { type: String, match: /^0x[0-9a-fA-F]{64}$/ }
const period = { type: Number, validate: (n: number) => Number.isSafeInteger(n) && n >= 190001 && n <= 999912 && n % 100 >= 1 && n % 100 <= 12 }
function model<S extends Schema>(name: string, schema: S): Model<InferSchemaType<S>> {
  return (mongoose.models[name] as Model<InferSchemaType<S>> | undefined) ?? mongoose.model<InferSchemaType<S>>(name, schema, name)
}
const userSchema = new Schema({
  schemaVersion: version, username: { type: String, required: true, lowercase: true, trim: true }, email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true }, institution: { type: String, required: true }, role: { type: String, enum: ['OPERATOR', 'KECAMATAN', 'DINAS_SOSIAL'], required: true },
  passwordHash: { type: String, required: true }, mfa: { secretEnc: encrypted, enabledAt: Date, recoveryHashes: [String], lastUsedStep: Number },
  wallet: { address: String, boundAt: Date, lastSiweNonceUsed: String }, isActive: { type: Boolean, default: true },
  failedAttempts: { type: Number, default: 0 }, lockedUntil: Date, failureWindowStart: Date, lastLoginAt: Date, mustChangePassword: { type: Boolean, default: true },
}, options)
userSchema.index({ username: 1 }, { unique: true }); userSchema.index({ email: 1 }, { unique: true })
export const Users = model('users', userSchema)
const sessionSchema = new Schema({
  schemaVersion: version, tokenHash: { type: String, required: true }, userId: { type: objectId, required: true }, expiresAt: { type: Date, required: true }, lastSeenAt: { type: Date, required: true }, ip: String, userAgent: String,
  walletVerified: { type: Boolean, default: false }, boundWalletAddress: String, revokedAt: Date,
  challenge: { nonce: String, message: String, address: String, chainId: Number, expiresAt: Date },
}, options)
sessionSchema.index({ tokenHash: 1 }, { unique: true }); sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); sessionSchema.index({ userId: 1 })
export const Sessions = model('sessions', sessionSchema)
const recipientSchema = new Schema({ schemaVersion: version, nikEnc: encrypted, nikBlindIndex: { type: String, required: true }, nikMasked: String, name: String, address: { dusun: String, rt: String, rw: String }, phone: String, status: { type: String, enum: ['DRAFT', 'FINAL'], default: 'DRAFT' }, commitment: bytes32, deletedAt: Date, deletedBy: objectId, deletedReason: String, createdBy: objectId, finalizedAt: Date, finalizedBy: objectId }, options)
recipientSchema.index({ nikBlindIndex: 1 }, { unique: true }); recipientSchema.index({ commitment: 1 }, { unique: true, sparse: true })
export const Recipients = model('recipients', recipientSchema)
const programSchema = new Schema({ schemaVersion: version, code: { type: String, required: true }, programId: bytes32, name: String, description: String, fundSource: String, kind: { type: String, enum: ['TUNAI', 'BARANG'] }, amountPerRecipient: { type: Number, min: 0, validate: Number.isSafeInteger }, totalBudget: { type: Number, min: 0, validate: Number.isSafeInteger }, startPeriod: period, endPeriod: period, status: { type: String, enum: ['DRAFT', 'ACTIVE', 'CLOSED'], default: 'DRAFT' }, chain: { createTxHash: String, blockNumber: Number }, isPublic: { type: Boolean, default: false } }, options)
programSchema.index({ code: 1 }, { unique: true })
export const Programs = model('programs', programSchema)
const enrollmentSchema = new Schema({ schemaVersion: version, programId: { type: objectId, required: true }, recipientId: { type: objectId, required: true }, status: { type: String, enum: ['ENROLLED', 'REGISTERED_ONCHAIN'], default: 'ENROLLED' }, registerTxHash: String }, options)
enrollmentSchema.index({ programId: 1, recipientId: 1 }, { unique: true })
export const Enrollments = model('enrollments', enrollmentSchema)
const disbursementSchema = new Schema({ schemaVersion: version, refId: { ...bytes32, required: true }, programId: { type: objectId, required: true }, periodId: period, recipientId: { type: objectId, required: true }, commitment: bytes32, amount: { type: Number, min: 0, validate: Number.isSafeInteger }, disbursedDate: Date, note: String, evidence: [{ cid: String, mime: String, size: Number, sha256: String, name: String, access: { type: String, enum: ['PUBLIC'] }, status: { type: String, enum: ['ACTIVE', 'WITHDRAWN'], default: 'ACTIVE' }, pinataId: String, withdrawnAt: Date, withdrawnBy: objectId, withdrawReason: String, unpinPending: Boolean }], status: { type: String, enum: ['DRAFT', 'PENDING', 'SUCCESS', 'FAILED'], default: 'DRAFT' }, chain: { txHash: String, blockNumber: Number, logIndex: Number, blockTimestamp: Date, from: String, confirmedAt: Date }, attempts: [{ at: Date, txHash: String, outcome: String, errorCode: String, by: objectId }], createdBy: objectId, deletedAt: Date, deletedBy: objectId, deletedReason: String, idempotencyKey: String, requestHash: String, evidenceLease: { token: String, expiresAt: Date }, lastError: String }, options)
disbursementSchema.index({ refId: 1 }, { unique: true }); disbursementSchema.index({ programId: 1, periodId: 1, recipientId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'SUCCESS'] } } })
disbursementSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })
export const Disbursements = model('disbursements', disbursementSchema)
const auditSchema = new Schema({ schemaVersion: version, seq: { type: Number, required: true }, prevHash: { type: String, required: true }, hash: { type: String, required: true }, actorId: String, role: String, action: String, entity: String, entityId: String, diff: Schema.Types.Mixed, ip: String, userAgent: String, requestId: String, at: { type: Date, required: true }, note: { type: String, enum: ['GAP'] } }, options)
auditSchema.index({ seq: 1 }, { unique: true })
export const AuditLogs = model('audit_logs', auditSchema)
const eventSchema = new Schema({ schemaVersion: version, txHash: { type: String, required: true }, logIndex: { type: Number, required: true }, blockNumber: Number, blockHash: String, chainId: Number, contractAddress: String, name: String, args: Schema.Types.Mixed, at: Date }, options)
eventSchema.index({ txHash: 1, logIndex: 1 }, { unique: true })
export const ChainEvents = model('chain_events', eventSchema)
export const Settings = model('settings', new Schema({ schemaVersion: version, chainId: Number, contractAddress: String, lastIndexedBlock: Number, blockPeriodSeconds: { type: Number, default: 5 }, validators: [{ address: String, institution: String }], reconcileLease: { token: String, expiresAt: Date }, publicConfig: { reportThreshold: Number, text: String } }, options))
export const Counters = model('counters', new Schema({ _id: String, schemaVersion: version, value: { type: Number, default: 0 } }, options))
const rateSchema = new Schema({ _id: String, schemaVersion: version, count: { type: Number, default: 0 }, expiresAt: { type: Date, required: true } }, options)
rateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export const RateLimits = model('rate_limits', rateSchema)
export const models = [Users, Sessions, Recipients, Programs, Enrollments, Disbursements, AuditLogs, ChainEvents, Settings, Counters, RateLimits]
