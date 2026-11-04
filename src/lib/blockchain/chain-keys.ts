import { AbiCoder, keccak256, toUtf8Bytes } from 'ethers'

export function refIdFromDataId(id: string): `0x${string}` {
  return keccak256(toUtf8Bytes(id)) as `0x${string}`
}

export function disbursementKey(programId: string, periodId: number, commitment: string): `0x${string}` {
  if (!/^0x[0-9a-f]{64}$/i.test(programId) || !/^0x[0-9a-f]{64}$/i.test(commitment)) {
    throw new Error('ID program dan commitment harus bytes32.')
  }
  periodIdFromYYYYMM(periodId)
  return keccak256(AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint32', 'bytes32'], [programId, periodId, commitment],
  )) as `0x${string}`
}

export function programIdFromCode(code: string): `0x${string}` {
  return keccak256(toUtf8Bytes(code)) as `0x${string}`
}

export function periodIdFromYYYYMM(n: number): number {
  if (!Number.isInteger(n) || n < 200001 || n > 209912 || n % 100 < 1 || n % 100 > 12) {
    throw new Error('Periode harus YYYYMM yang valid (2000–2099)')
  }
  return n
}
