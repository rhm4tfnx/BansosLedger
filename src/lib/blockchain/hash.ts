import { keccak_256 } from 'js-sha3'

// Solidity schema: abi.encodePacked(string nik, string namaLengkap, string kodeWilayah).
// Values must match the contract byte-for-byte; do not trim or normalize silently.
export function hashIdentity(nik: string, namaLengkap: string, kodeWilayah: string): `0x${string}` {
  if (!/^\d{16}$/.test(nik) || !namaLengkap.trim() || !kodeWilayah.trim()) {
    throw new Error('Identitas tidak valid')
  }
  return `0x${keccak_256(new TextEncoder().encode(nik + namaLengkap + kodeWilayah))}`
}
