import 'server-only'
import { z } from 'zod'
import type { Role } from '@/types/rbac'

export const dbRoleSchema = z.enum(['OPERATOR', 'KECAMATAN', 'DINAS_SOSIAL'])
export type DbRole = z.infer<typeof dbRoleSchema>
export type SessionRole = Extract<Role, 'OPERATOR_KELURAHAN' | 'KECAMATAN' | 'DINAS_SOSIAL'>

export function toAppRole(role: DbRole): SessionRole {
  const validated = dbRoleSchema.parse(role)
  return validated === 'OPERATOR' ? 'OPERATOR_KELURAHAN' : validated
}

export function toDbRole(role: Role): DbRole {
  return dbRoleSchema.parse(role === 'OPERATOR_KELURAHAN' ? 'OPERATOR' : role)
}
