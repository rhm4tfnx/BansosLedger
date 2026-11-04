import type { NetworkStatusDto, WalletStatusDto } from '@/lib/api-contract'
import { formatWitaDateTime, shortenHash } from '@/lib/format'
import type { NetworkStatusViewModel, WalletStatusViewModel } from '@/types'

export function toNetworkStatusViewModel(dto: NetworkStatusDto): NetworkStatusViewModel {
  const timestampMs = dto.timestamp > 0 ? dto.timestamp * 1000 : null
  return {
    status: dto.status,
    latestBlock: dto.latestBlock,
    timestamp: dto.timestamp,
    timestampWita: formatWitaDateTime(timestampMs),
    ageSeconds: dto.ageSeconds,
    validatorCount: dto.validatorCount,
    validators: (dto.validators ?? []).map((validator) => ({
      address: validator.address,
      addressShort: shortenHash(validator.address),
      institution: validator.institution ?? 'Validator Konsorsium',
    })),
  }
}

export function toWalletStatusViewModel(dto: WalletStatusDto): WalletStatusViewModel {
  const boundWallet = dto.boundWallet ?? null
  return {
    authorizedWallet: dto.authorizedWallet,
    authorizedWalletShort: shortenHash(dto.authorizedWallet),
    owner: dto.owner,
    ownerShort: shortenHash(dto.owner),
    chainId: dto.chainId,
    paused: dto.paused,
    networkOk: dto.networkOk,
    boundWallet,
    boundWalletShort: shortenHash(boundWallet),
  }
}

