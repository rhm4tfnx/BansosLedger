import 'server-only'
import { hash, verify } from '@node-rs/argon2'
import { z } from 'zod'

const commonPasswords = new Set(['password', 'password123', 'password1234', 'password12345', 'password123456', '123456789012', 'qwerty12345678', 'administrator', 'admin12345678', 'bansosledger', 'bansosledger123'])
const passwordInput = z.string().min(12).max(1024)

export function validatePassword(password: string, username: string, email: string): void {
  const parsed = passwordInput.safeParse(password)
  const normalized = password.toLowerCase()
  if (!parsed.success || commonPasswords.has(normalized) || normalized === username.toLowerCase() || normalized === email.toLowerCase()) {
    throw new Error('Password harus 12–1024 karakter, tidak umum, dan berbeda dari username serta email.')
  }
}

export async function hashPassword(password: string, username: string, email: string): Promise<string> {
  validatePassword(password, username, email)
  // Argon2id is the package default; its ambient const enum cannot be used with isolatedModules.
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 })
}

export async function verifyPassword(encodedHash: string, password: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length > 1024 || !encodedHash.startsWith('$argon2id$')) return false
  try { return await verify(encodedHash, password) } catch { return false }
}
