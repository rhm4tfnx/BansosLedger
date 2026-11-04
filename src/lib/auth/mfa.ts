import 'server-only'
import { createDecipheriv } from 'node:crypto'
import { verify } from 'otplib'
import { getEnv } from '@/lib/env'
import { Users } from '@/lib/db/models'
import type { Types } from 'mongoose'

type MfaUser = { _id: Types.ObjectId; mfa?: { enabledAt?: Date | null; secretEnc?: { iv?: string | null; tag?: string | null; ct?: string | null; keyVersion?: string | null } | null } | null }
export async function verifyUserMfa(user: MfaUser, token: unknown) {
  if (typeof token !== 'string' || !/^\d{6}$/.test(token) || !user.mfa?.enabledAt) return false
  const key = Buffer.from(getEnv('MFA_ENC_KEY').replace(/^0x/, ''), 'hex')
  const enc = user.mfa.secretEnc
  if (!enc || enc.keyVersion !== 'v1' || !enc.iv || !enc.tag || !enc.ct) return false
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(enc.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(enc.tag, 'hex'))
    const secret = Buffer.concat([decipher.update(Buffer.from(enc.ct, 'hex')), decipher.final()]).toString('utf8')
    const result = await verify({ secret, token, epochTolerance: 0 })
    if (!result.valid) return false
    const step = Math.floor(Date.now() / 30000)
    const consumed = await Users.updateOne({ _id: user._id, isActive: true, $or: [{ 'mfa.lastUsedStep': { $lt: step } }, { 'mfa.lastUsedStep': { $exists: false } }] }, { $set: { 'mfa.lastUsedStep': step } })
    return consumed.modifiedCount === 1
  } catch { return false }
}
