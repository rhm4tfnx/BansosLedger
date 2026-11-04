import 'server-only'
import { createHash } from 'node:crypto'
import { RateLimits } from '@/lib/db/models'
const WINDOW = 15 * 60 * 1000
export async function reserveLoginAttempt(kind: 'ip' | 'account', identity: string) {
  const _id = `login:${kind}:${createHash('sha256').update(identity).digest('hex')}`
  const now = new Date()
  try {
    await RateLimits.updateOne({ _id, expiresAt: { $lte: now } }, { $set: { count: 0, expiresAt: new Date(Date.now() + WINDOW) } })
    await RateLimits.updateOne({ _id }, { $setOnInsert: { count: 0, expiresAt: new Date(Date.now() + WINDOW) } }, { upsert: true })
  } catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error }
  const record = await RateLimits.findOneAndUpdate({ _id, count: { $lt: 5 }, expiresAt: { $gt: now } }, { $inc: { count: 1 } }, { new: true })
  return record ? { id: _id, expiresAt: record.expiresAt } : null
}
export async function releaseLoginAttempt(reservation: { id: string; expiresAt: Date }) {
  await RateLimits.updateOne({ _id: reservation.id, expiresAt: reservation.expiresAt, count: { $gt: 0 } }, { $inc: { count: -1 } })
}
