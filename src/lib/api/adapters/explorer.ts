import type {
  ExplorerAddressDto,
  ExplorerAddressEventDto,
  ExplorerBlockDto,
  ExplorerBlockListDto,
  ExplorerContractDto,
  ExplorerSearchDto,
  ExplorerTxDto,
  ExplorerValidatorsDto,
  SafeEventDto,
} from '@/lib/api-contract'
import { formatPeriodId, formatRupiah, formatWitaDateTime, shortenHash } from '@/lib/format'
import type {
  ExplorerAddressViewModel,
  ExplorerBlockViewModel,
  ExplorerContractViewModel,
  ExplorerEventViewModel,
  ExplorerSearchResultViewModel,
  ExplorerTxViewModel,
  ExplorerValidatorViewModel,
  PaginatedResult,
} from '@/types'

export function toExplorerEventViewModel(
  dto: SafeEventDto | ExplorerAddressEventDto,
): ExplorerEventViewModel {
  const numericAmount = Number.parseInt(dto.amount, 10)
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0
  const txHash = 'txHash' in dto ? dto.txHash : undefined

  return {
    refId: dto.refId,
    programId: dto.programId,
    periodId: dto.period,
    periodLabel: formatPeriodId(dto.period),
    amount: safeAmount,
    amountFormatted: formatRupiah(safeAmount),
    commitment: dto.commitment,
    cid: dto.cid,
    gatewayUrl: dto.gatewayUrl,
    recordedBy: dto.recordedBy,
    recordedByShort: shortenHash(dto.recordedBy),
    utc: dto.utc,
    wita: dto.wita ?? formatWitaDateTime(dto.utc),
    ...(txHash
      ? {
          txHash,
          txHashShort: shortenHash(txHash),
        }
      : {}),
  }
}

export function toExplorerBlockViewModel(dto: ExplorerBlockDto): ExplorerBlockViewModel {
  const timestampMs = dto.timestamp > 0 ? dto.timestamp * 1000 : null
  return {
    number: dto.number,
    hash: dto.hash,
    hashShort: shortenHash(dto.hash),
    parentHash: dto.parentHash,
    parentHashShort: shortenHash(dto.parentHash),
    timestamp: dto.timestamp,
    timestampWita: formatWitaDateTime(timestampMs),
    proposer: dto.proposer,
    proposerShort: shortenHash(dto.proposer),
    transactionCount: dto.transactionCount,
  }
}

export function toExplorerBlockListViewModel(
  dto: ExplorerBlockListDto,
): PaginatedResult<ExplorerBlockViewModel> {
  const totalPages = dto.limit > 0 ? Math.ceil(dto.total / dto.limit) : 0
  return {
    items: dto.data.map(toExplorerBlockViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages,
  }
}

export function toExplorerTxViewModel(dto: ExplorerTxDto): ExplorerTxViewModel {
  return {
    txHash: dto.txHash,
    txHashShort: shortenHash(dto.txHash),
    from: dto.from,
    fromShort: shortenHash(dto.from),
    to: dto.to,
    toShort: shortenHash(dto.to),
    blockNumber: dto.blockNumber,
    status: dto.status,
    statusLabel: dto.status === 'SUCCESS' ? 'Berhasil' : 'Ditolak (Reverted)',
    utc: dto.utc,
    wita: formatWitaDateTime(dto.utc),
    events: dto.events.map(toExplorerEventViewModel),
  }
}

export function toExplorerAddressViewModel(dto: ExplorerAddressDto): ExplorerAddressViewModel {
  const totalPages = dto.limit > 0 ? Math.ceil(dto.total / dto.limit) : 0
  return {
    address: dto.address,
    addressShort: shortenHash(dto.address),
    events: dto.data.map(toExplorerEventViewModel),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages,
  }
}

export function toExplorerContractViewModel(dto: ExplorerContractDto): ExplorerContractViewModel {
  return {
    address: dto.address,
    addressShort: shortenHash(dto.address),
    authorizedWallet: dto.authorizedWallet,
    authorizedWalletShort: shortenHash(dto.authorizedWallet),
    owner: dto.owner,
    ownerShort: shortenHash(dto.owner),
    paused: dto.paused,
    chainId: dto.chainId,
    networkOk: dto.networkOk,
    abi: [...dto.abi],
  }
}

export function toExplorerValidatorsViewModel(dto: ExplorerValidatorsDto): {
  items: ExplorerValidatorViewModel[]
  count: number
} {
  const items = dto.data.map((validator) => ({
    address: validator.address,
    addressShort: shortenHash(validator.address),
    institution: validator.institution ?? 'Validator Konsorsium',
  }))
  return {
    items,
    count: dto.count ?? items.length,
  }
}

export function toExplorerSearchResultViewModel(
  dto: ExplorerSearchDto,
): ExplorerSearchResultViewModel {
  if ('number' in dto && 'parentHash' in dto) {
    return { kind: 'block', block: toExplorerBlockViewModel(dto) }
  }
  if ('txHash' in dto && 'events' in dto) {
    return { kind: 'tx', tx: toExplorerTxViewModel(dto) }
  }
  if ('address' in dto && 'data' in dto) {
    return { kind: 'address', address: toExplorerAddressViewModel(dto) }
  }
  return {
    kind: 'events',
    events: dto.data.map(toExplorerEventViewModel),
    limit: dto.limit,
  }
}

