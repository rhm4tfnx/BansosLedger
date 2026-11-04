import 'server-only'
import { createHash } from 'node:crypto'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { getEnv } from './env'
import { connectDatabase } from './db/connection'
import { RateLimits } from './db/models'
import { duplicate } from '@/modules/domain/http'
export async function rateLimit(key: string, limit: number, seconds: number): Promise<{ ok: boolean; retryAfter: number }> {
  const url = getEnv('UPSTASH_REDIS_REST_URL'), token = getEnv('UPSTASH_REDIS_REST_TOKEN')
  const digest = createHash('sha256').update(key).digest('hex')
  if (url && token) {
    try {
      const limiter = new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(limit, `${seconds} s`), prefix: 'bansos:v1', analytics: false, timeout: 3000 })
      const result = await limiter.limit(digest)
      if (result.reason !== 'timeout') return { ok: result.success, retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) }
    } catch { /* Fall back to shared Mongo counters, never an unlimited local bucket. */ }
  }
  await connectDatabase()
  const now = Date.now(), windowMs = seconds * 1000, bucket = Math.floor(now / windowMs)
  const _id = `${digest}:${bucket}`, expiresAt = new Date((bucket + 1) * windowMs)
  let record
  try { record = await RateLimits.findOneAndUpdate({ _id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, new: true }) }
  catch (error) { if (!duplicate(error)) throw error; record = await RateLimits.findOneAndUpdate({ _id }, { $inc: { count: 1 } }, { new: true }) }
  return { ok: !!record && record.count <= limit, retryAfter: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) }
}
