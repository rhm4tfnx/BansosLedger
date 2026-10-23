export const roles = ['OPERATOR_KELURAHAN', 'KECAMATAN', 'DINAS_SOSIAL', 'AUDITOR', 'MASYARAKAT'] as const
export type Role = (typeof roles)[number]
export type Permission = 'portal:read' | 'draft:create' | 'draft:update' | 'draft:soft-delete' | 'evidence:upload' | 'transaction:sign' | 'integrity:verify' | 'public:read' | 'explorer:read' | 'final:hard-delete'
