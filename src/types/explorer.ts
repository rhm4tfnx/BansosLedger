export interface ExplorerEventViewModel {
  refId: string
  programId: string
  periodId: number
  periodLabel: string
  amount: number
  amountFormatted: string
  commitment: string
  cid: string
  gatewayUrl: string | null
  recordedBy: string
  recordedByShort: string
  utc: string | null
  wita: string
  txHash?: string
  txHashShort?: string
}

export interface ExplorerBlockViewModel {
  number: number
  hash: string
  hashShort: string
  parentHash: string
  parentHashShort: string
  timestamp: number
  timestampWita: string
  proposer: string
  proposerShort: string
  transactionCount: number
}

export interface ExplorerTxViewModel {
  txHash: string
  txHashShort: string
  from: string
  fromShort: string
  to: string
  toShort: string
  blockNumber: number
  status: 'SUCCESS' | 'REVERTED'
  statusLabel: string
  utc: string
  wita: string
  events: ExplorerEventViewModel[]
}

export interface ExplorerAddressViewModel {
  address: string
  addressShort: string
  events: ExplorerEventViewModel[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ExplorerContractViewModel {
  address: string
  addressShort: string
  authorizedWallet: string | null
  authorizedWalletShort: string
  owner: string | null
  ownerShort: string
  paused: boolean | null
  chainId: number | null
  networkOk: boolean | null
  abi: unknown[]
}

export interface ExplorerValidatorViewModel {
  address: string
  addressShort: string
  institution: string
}

export type ExplorerSearchResultViewModel =
  | { kind: 'block'; block: ExplorerBlockViewModel }
  | { kind: 'tx'; tx: ExplorerTxViewModel }
  | { kind: 'address'; address: ExplorerAddressViewModel }
  | { kind: 'events'; events: ExplorerEventViewModel[]; limit: number }
