import type {
  ExplorerAddressDto,
  ExplorerAddressEventDto,
  ExplorerBlockDto,
  ExplorerBlockListDto,
  ExplorerContractDto,
  ExplorerSearchDto,
  ExplorerTxDto,
  ExplorerTxEventDto,
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
  ExplorerTxDecodedEventViewModel,
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
    name: 'DisbursementRecorded',
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

export function toExplorerTxDecodedEventViewModel(
  dto: ExplorerTxEventDto,
): ExplorerTxDecodedEventViewModel {
  if ('name' in dto && dto.name === 'ProgramCreated') {
    const parsedAmount = Number.parseInt(dto.amountPerRecipient, 10)
    const safeAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0
    const startPeriodLabel = formatPeriodId(dto.startPeriod)
    const endPeriodLabel = formatPeriodId(dto.endPeriod)
    const totalBudget = dto.program?.totalBudget ?? null
    return {
      name: 'ProgramCreated',
      programId: dto.programId,
      amountPerRecipient: safeAmount,
      amountPerRecipientFormatted: formatRupiah(safeAmount),
      startPeriod: dto.startPeriod,
      startPeriodLabel,
      endPeriod: dto.endPeriod,
      endPeriodLabel,
      periodRangeLabel: `${startPeriodLabel} – ${endPeriodLabel}`,
      programCode: dto.program?.code || null,
      programName: dto.program?.name || null,
      totalBudget,
      totalBudgetFormatted: totalBudget !== null ? formatRupiah(totalBudget) : null,
    }
  }
  if ('name' in dto && dto.name === 'RecipientsRegistered') {
    const safeCount = Number.isFinite(dto.count) ? Math.max(0, dto.count) : 0
    return {
      name: 'RecipientsRegistered',
      programId: dto.programId,
      count: safeCount,
      countFormatted: `${safeCount.toLocaleString('id-ID')} penerima (commitment on-chain)`,
      programCode: dto.program?.code || null,
      programName: dto.program?.name || null,
    }
  }
  if ('name' in dto && dto.name === 'ProgramClosed') {
    return {
      name: 'ProgramClosed',
      programId: dto.programId,
      status: 'CLOSED',
      statusLabel: 'Ditutup Permanen (CLOSED)',
      programCode: dto.program?.code || null,
      programName: dto.program?.name || null,
    }
  }
  return {
    ...toExplorerEventViewModel(dto),
    name: 'DisbursementRecorded',
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
    events: dto.events.map(toExplorerTxDecodedEventViewModel),
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
  count: number | null
} {
  const items = dto.data.map((validator) => ({
    address: validator.address,
    addressShort: shortenHash(validator.address),
    institution: validator.institution ?? 'Validator Konsorsium',
  }))
  return {
    items,
    // null means the QBFT RPC is not exposed; the UI shows "-" instead of 0.
    count: dto.count,
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

