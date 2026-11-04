import 'server-only'
import { authMeDtoSchema, type AuthMeDto } from '@/lib/api-contract/dto'

export function toAuthMeDto(user: any, session: any): AuthMeDto {
  const dto = {
    id: String(user._id ?? user.id ?? session.userId),
    name: String(user.name ?? ''),
    institution: String(user.institution ?? ''),
    email: String(user.email ?? ''),
    role: user.role ?? session.role,
    mustChangePassword: Boolean(user.mustChangePassword ?? session.mustChangePassword),
    walletVerified: Boolean(session.walletVerified),
    boundWalletAddress: session.boundWalletAddress ? String(session.boundWalletAddress) : null,
    expiresAt: Number(session.expiresAt),
  }
  return authMeDtoSchema.parse(dto)
}

