import { hasPermission } from '@/lib/rbac'
import type { Role } from '@/types/rbac'
import { BESU_CHAIN_ID } from './provider'

export function verifyConnectedWalletAccess({ role, connectedAddress, expectedWalletAddress, chainIdHex }: { role: Role | null | undefined; connectedAddress?: string | null; expectedWalletAddress?: string | null; chainIdHex?: string | null }): { allowed: boolean; reason: string } {
  if (!hasPermission(role, 'transaction:sign')) return { allowed: false, reason: 'Role tidak memiliki izin transaction:sign.' }
  if (!expectedWalletAddress || !/^0x[0-9a-fA-F]{40}$/.test(expectedWalletAddress)) return { allowed: false, reason: 'Wallet Resmi Kelurahan belum dikonfigurasi.' }
  if (!connectedAddress || !/^0x[0-9a-fA-F]{40}$/.test(connectedAddress) || connectedAddress.toLowerCase() !== expectedWalletAddress.toLowerCase()) return { allowed: false, reason: 'Alamat MetaMask bukan Wallet Resmi Kelurahan.' }
  if (!chainIdHex || !/^0x[0-9a-fA-F]+$/.test(chainIdHex) || BigInt(chainIdHex) !== BigInt(BESU_CHAIN_ID)) return { allowed: false, reason: `Jaringan harus menggunakan Chain ID ${BESU_CHAIN_ID}.` }
  return { allowed: true, reason: 'Role, wallet, dan jaringan sesuai. Server tetap harus memverifikasi sesi dan receipt.' }
}
