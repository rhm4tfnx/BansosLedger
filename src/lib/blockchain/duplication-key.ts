import { AbiCoder, keccak256 } from 'ethers'

import { periodIdFromYYYYMM } from './chain-keys'

export function duplicationKey(programId: `0x${string}`, periodId: number, commitment: `0x${string}`): `0x${string}` {
  if (![programId, commitment].every(value => /^0x[0-9a-fA-F]{64}$/.test(value))) throw new Error('Kunci bytes32 tidak valid')
  return keccak256(AbiCoder.defaultAbiCoder().encode(['bytes32', 'uint32', 'bytes32'], [programId, periodIdFromYYYYMM(periodId), commitment])) as `0x${string}`
}
