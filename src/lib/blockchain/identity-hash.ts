import 'server-only'
import { solidityPackedKeccak256 } from 'ethers'
import { getEnv } from '@/lib/env'
import { validateNik } from '@/lib/crypto/nik'

export function recipientCommitment(nik: string): `0x${string}` {
  if (!validateNik(nik)) throw new Error('NIK tidak valid.')
  const pepper = `0x${getEnv('COMMITMENT_PEPPER').replace(/^0x/, '')}`
  return solidityPackedKeccak256(['string', 'bytes32'], [nik, pepper]) as `0x${string}`
}
