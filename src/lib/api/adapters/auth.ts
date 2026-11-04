import type { AuthMeDto, AuthRole } from '@/lib/api-contract'
import { formatWitaDateTime } from '@/lib/format'
import type { Role, SessionViewModel } from '@/types'

export function normalizeAuthRole(role: AuthRole | string): Role {
  switch (role) {
    case 'OPERATOR':
    case 'OPERATOR_KELURAHAN':
      return 'OPERATOR_KELURAHAN'
    case 'KECAMATAN':
      return 'KECAMATAN'
    case 'DINAS_SOSIAL':
      return 'DINAS_SOSIAL'
    case 'AUDITOR':
      return 'AUDITOR'
    default:
      return 'MASYARAKAT'
  }
}

export function toSessionViewModel(dto: AuthMeDto): SessionViewModel {
  return {
    id: dto.id,
    name: dto.name,
    institution: dto.institution,
    email: dto.email,
    role: normalizeAuthRole(dto.role),
    rawRole: dto.role,
    mustChangePassword: dto.mustChangePassword,
    walletVerified: dto.walletVerified,
    boundWalletAddress: dto.boundWalletAddress,
    expiresAt: dto.expiresAt,
    expiresAtWita: formatWitaDateTime(dto.expiresAt),
  }
}

