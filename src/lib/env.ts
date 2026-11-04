import 'server-only'
import { z } from 'zod'
import { ServiceUnavailableError } from './service-error'

const hexKey = z.string().regex(/^(?:0x)?[0-9a-fA-F]{64}$/, 'Harus berupa 32 byte hex')
const booleanFlag = z.enum(['true', 'false']).default('false').transform(value => value === 'true')
const url = z.string().url()
const requiredSecret = z.string().min(32)
const schema = z.object({
  APP_BASE_URL: url,
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  NIK_ENC_KEY: hexKey,
  NIK_INDEX_KEY: requiredSecret,
  COMMITMENT_PEPPER: hexKey,
  MFA_ENC_KEY: hexKey,
  PINATA_JWT: z.string().min(1).optional(),
  PINATA_GATEWAY: url.optional(),
  RPC_URL_SERVER: url.optional(),
  RPC_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CHAIN_ID: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().safe()).optional(),
  NEXT_PUBLIC_CONTRACT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  TURNSTILE_SECRET: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: url.optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: requiredSecret.optional(),
  AUTH_REQUIRE_TOTP: booleanFlag,
  APP_TRUST_PROXY: booleanFlag,
})

type ServerEnvironment = z.output<typeof schema>

// Validate on first use, not at import time, so unrelated routes can boot without backend credentials.
export function getEnv<K extends keyof ServerEnvironment>(key: K): ServerEnvironment[K] {
  const raw = process.env[key]
  const parsed = schema.shape[key].safeParse(raw === '' ? undefined : raw)
  if (!parsed.success) throw new ServiceUnavailableError()
  return parsed.data as ServerEnvironment[K]
}

export function validateServerEnvironment(): ServerEnvironment {
  const input = Object.fromEntries(Object.keys(schema.shape).map(key => [key, process.env[key] || undefined]))
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map(issue => issue.path.join('.')))]
    throw new Error(`Konfigurasi server tidak valid: ${keys.join(', ')}.`)
  }
  return parsed.data
}
