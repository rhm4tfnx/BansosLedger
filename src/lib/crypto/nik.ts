import 'server-only'
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { getEnv } from '@/lib/env'

export type EncryptedNik = { iv: string; tag: string; ct: string; keyVersion: 'v1' }

export function validateNik(nik: string): boolean {
  if (typeof nik !== 'string' || !/^\d{16}$/.test(nik)) return false
  const province = Number(nik.slice(0, 2))
  const day = Number(nik.slice(6, 8))
  const month = Number(nik.slice(8, 10))
  return province >= 11 && province <= 99 && month >= 1 && month <= 12 &&
    ((day >= 1 && day <= 31) || (day >= 41 && day <= 71))
}

function assertNik(nik: string): void {
  if (!validateNik(nik)) throw new Error('NIK tidak valid.')
}

function encryptionKey(): Buffer {
  return Buffer.from(getEnv('NIK_ENC_KEY').replace(/^0x/, ''), 'hex')
}

export function encryptNik(nik: string): EncryptedNik {
  assertNik(nik)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ct = Buffer.concat([cipher.update(nik, 'utf8'), cipher.final()])
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ct: ct.toString('hex'), keyVersion: 'v1' }
}

export function decryptNik(encrypted: EncryptedNik): string {
  if (!encrypted || encrypted.keyVersion !== 'v1' || !/^[0-9a-f]{24}$/i.test(encrypted.iv) ||
    !/^[0-9a-f]{32}$/i.test(encrypted.tag) || !/^[0-9a-f]{32}$/i.test(encrypted.ct)) {
    throw new Error('Data NIK terenkripsi tidak valid.')
  }
  const key = encryptionKey()
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'))
    const nik = Buffer.concat([decipher.update(Buffer.from(encrypted.ct, 'hex')), decipher.final()]).toString('utf8')
    assertNik(nik)
    return nik
  } catch { throw new Error('Data NIK terenkripsi tidak valid.') }
}

export function nikBlindIndex(nik: string): string {
  assertNik(nik)
  return createHmac('sha256', getEnv('NIK_INDEX_KEY')).update(nik, 'utf8').digest('hex')
}

export function maskNik(nik: string): string {
  assertNik(nik)
  return `${nik.slice(0, 4)}${'•'.repeat(8)}${nik.slice(-4)}`
}
