export const roles = ['OPERATOR_KELURAHAN', 'KECAMATAN', 'DINAS_SOSIAL', 'AUDITOR', 'MASYARAKAT'] as const
export type Role = (typeof roles)[number]
export type Permission =
  | 'dashboard:read'
  | 'recipient:reveal-nik' | 'recipient:read' | 'recipient:create' | 'recipient:update' | 'recipient:soft-delete'
  | 'program:read' | 'program:create' | 'program:update' | 'program:soft-delete'
  | 'disbursement:read' | 'disbursement:create' | 'evidence:upload' | 'transaction:sign'
  | 'report:read' | 'report:create'
  | 'verification:read' | 'verification:execute' | 'monitoring:read' | 'audit:read'
  | 'wallet:read' | 'wallet:verify-session' | 'settings:read' | 'settings:update'
  | 'public:read' | 'explorer:read' | 'final:hard-delete'
