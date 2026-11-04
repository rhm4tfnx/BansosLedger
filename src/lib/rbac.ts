import { roles, type Permission, type Role } from '@/types/rbac'

const monitoringPermissions: readonly Permission[] = ['dashboard:read', 'recipient:read', 'recipient:reveal-nik', 'program:read', 'disbursement:read', 'report:read', 'verification:read', 'verification:execute', 'monitoring:read', 'audit:read', 'wallet:read', 'settings:read', 'settings:update', 'public:read', 'explorer:read']
export const rolePermissions: Readonly<Record<Role, readonly Permission[]>> = {
  OPERATOR_KELURAHAN: ['dashboard:read', 'recipient:read', 'recipient:reveal-nik', 'recipient:create', 'recipient:update', 'recipient:soft-delete', 'program:read', 'program:create', 'program:update', 'program:soft-delete', 'disbursement:read', 'disbursement:create', 'evidence:upload', 'transaction:sign', 'report:read', 'report:create', 'verification:read', 'verification:execute', 'monitoring:read', 'audit:read', 'wallet:read', 'wallet:verify-session', 'settings:read', 'settings:update', 'public:read', 'explorer:read'],
  KECAMATAN: monitoringPermissions,
  DINAS_SOSIAL: monitoringPermissions,
  AUDITOR: ['public:read', 'explorer:read'],
  MASYARAKAT: ['public:read', 'explorer:read'],
}
export interface RoleMeta { role: Role; shortLabel: string; fullLabel: string; badgeCode: string; instansi: string; blockchainRole: string; accessSummary: string }
export const ROLE_METADATA: Readonly<Record<Role, RoleMeta>> = {
  OPERATOR_KELURAHAN: { role: 'OPERATOR_KELURAHAN', shortLabel: 'Operator Kelurahan', fullLabel: 'Operator Bansos — Kelurahan Takkalasi', badgeCode: 'OP', instansi: 'Kelurahan Takkalasi', blockchainRole: 'Validator 1 • Signer Wallet Kelurahan', accessSummary: 'Full Access (CRUD Draft, Upload IPFS & Sign Transaksi Besu)' },
  KECAMATAN: { role: 'KECAMATAN', shortLabel: 'Kecamatan Balusu', fullLabel: 'Kecamatan Balusu (Monitoring)', badgeCode: 'KC', instansi: 'Kecamatan Balusu', blockchainRole: 'Validator 2 • QBFT Node', accessSummary: 'Read-Only Dashboard & Verifikasi Integritas (baca)' },
  DINAS_SOSIAL: { role: 'DINAS_SOSIAL', shortLabel: 'Dinas Sosial Barru', fullLabel: 'Dinas Sosial Kab. Barru (Verifikasi)', badgeCode: 'DS', instansi: 'Dinas Sosial Kab. Barru', blockchainRole: 'Validator 3 • QBFT Node', accessSummary: 'Read-Only Dashboard & Audit Log' },
  AUDITOR: { role: 'AUDITOR', shortLabel: 'Auditor / Pengawas', fullLabel: 'Auditor / Pihak Pengawas (Explorer Only)', badgeCode: 'AU', instansi: 'Inspektorat / Auditor', blockchainRole: 'Validator 4 • QBFT Node', accessSummary: 'Tidak masuk Dashboard Internal • Audit via Blockchain Explorer' },
  MASYARAKAT: { role: 'MASYARAKAT', shortLabel: 'Masyarakat / KPM', fullLabel: 'Masyarakat / Penerima Bantuan (Public Only)', badgeCode: 'MS', instansi: 'Publik / Warga Takkalasi', blockchainRole: 'Bukan Validator', accessSummary: 'Akses Cek Bansos, Transparansi Publik & Blockchain Explorer' },
}
export const dashboardRoutePermissions: Readonly<Record<string, Permission>> = {
  '/dashboard': 'dashboard:read', '/dashboard/penerima': 'recipient:read', '/dashboard/bantuan': 'program:read', '/dashboard/penyaluran': 'disbursement:read', '/dashboard/laporan': 'report:read', '/dashboard/monitoring': 'monitoring:read', '/dashboard/verifikasi': 'verification:read', '/dashboard/log-aktivitas': 'audit:read', '/dashboard/wallet': 'wallet:read', '/dashboard/pengaturan': 'settings:read',
}
export function isRole(value: unknown): value is Role { return typeof value === 'string' && roles.some(role => role === value) }
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean { return isRole(role) && rolePermissions[role].includes(permission) }
export function isReadOnlyPortalRole(role: Role | null | undefined): boolean {
  if (!isRole(role)) return true
  return hasPermission(role, 'dashboard:read') && !hasPermission(role, 'recipient:create') && !hasPermission(role, 'program:create') && !hasPermission(role, 'disbursement:create')
}
export function canAccessPath(role: Role | null | undefined, pathname: string): boolean {
  const path = pathname.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/'
  if (['/', '/login', '/cek-bansos', '/cek-status', '/program', '/cara-verifikasi', '/transparansi', '/explorer'].some(route => path === route || (route !== '/' && route !== '/login' && path.startsWith(`${route}/`)))) return true
  if (!isRole(role)) return false
  const route = Object.keys(dashboardRoutePermissions).sort((a, b) => b.length - a.length).find(route => path === route || (route !== '/dashboard' && path.startsWith(`${route}/`)))
  return !!route && hasPermission(role, dashboardRoutePermissions[route])
}
