import { roles, type Permission, type Role } from '@/types/rbac'

export const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = {
  OPERATOR_KELURAHAN: ['portal:read', 'draft:create', 'draft:update', 'draft:soft-delete', 'evidence:upload', 'transaction:sign', 'integrity:verify', 'public:read', 'explorer:read'],
  KECAMATAN: ['portal:read', 'integrity:verify', 'public:read', 'explorer:read'],
  DINAS_SOSIAL: ['portal:read', 'integrity:verify', 'public:read', 'explorer:read'],
  AUDITOR: ['public:read', 'explorer:read', 'integrity:verify'],
  MASYARAKAT: ['public:read', 'explorer:read'],
}
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && roles.some(role => role === value)
}
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return isRole(role) && rolePermissions[role].includes(permission)
}
export function canAccessPath(role: Role | null | undefined, pathname: string): boolean {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return hasPermission(role, 'portal:read')
  return pathname === '/' || pathname === '/login' || pathname === '/cek-bansos' || pathname === '/transparansi' || pathname === '/explorer' || pathname.startsWith('/explorer/')
}
