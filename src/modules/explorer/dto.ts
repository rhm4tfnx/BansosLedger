import 'server-only'
import {
  safeEventDtoSchema,
  explorerProgramMetaDtoSchema,
  explorerTxEventDtoSchema,
  explorerBlockDtoSchema,
  explorerBlockListDtoSchema,
  explorerTxDtoSchema,
  explorerAddressDtoSchema,
  explorerContractDtoSchema,
  explorerValidatorsDtoSchema,
  explorerSearchDtoSchema,
  type SafeEventDto,
  type ExplorerProgramMetaDto,
  type ExplorerTxEventDto,
  type ExplorerBlockDto,
  type ExplorerBlockListDto,
  type ExplorerTxDto,
  type ExplorerAddressDto,
  type ExplorerContractDto,
  type ExplorerValidatorsDto,
  type ExplorerSearchDto,
} from '@/lib/api-contract/dto'

export function toExplorerProgramMetaDto(raw: any): ExplorerProgramMetaDto | null {
  if (!raw || typeof raw !== 'object') return null
  const code = typeof raw.code === 'string' ? raw.code.trim() : ''
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!code && !name) return null
  const totalBudget =
    raw.totalBudget != null && Number.isFinite(Number(raw.totalBudget))
      ? Math.max(0, Math.round(Number(raw.totalBudget)))
      : null
  return explorerProgramMetaDtoSchema.parse({
    code,
    name,
    totalBudget,
  })
}

export function toSafeEventDto(args: Record<string, any>): SafeEventDto {
  const dto = {
    refId: String(args.refId ?? ''),
    programId: String(args.programId ?? ''),
    period: Number(args.period ?? args.periodId ?? 0),
    amount: String(args.amount ?? '0'),
    commitment: String(args.commitment ?? args.recipientCommitment ?? ''),
    cid: String(args.cid ?? args.evidenceCid ?? ''),
    gatewayUrl: args.gatewayUrl ? String(args.gatewayUrl) : null,
    recordedBy: String(args.recordedBy ?? ''),
    utc: args.utc ? String(args.utc) : null,
    wita: args.wita ? String(args.wita) : null,
  }
  return safeEventDtoSchema.parse(dto)
}

export function toExplorerTxEventDto(args: Record<string, any>): ExplorerTxEventDto {
  if (args?.name === 'ProgramCreated') {
    const program = toExplorerProgramMetaDto(args.program)
    return explorerTxEventDtoSchema.parse({
      name: 'ProgramCreated',
      programId: String(args.programId ?? ''),
      amountPerRecipient: String(args.amountPerRecipient ?? '0'),
      startPeriod: Number(args.startPeriod ?? 0),
      endPeriod: Number(args.endPeriod ?? 0),
      program,
    })
  }
  if (args?.name === 'RecipientsRegistered') {
    const program = toExplorerProgramMetaDto(args.program)
    return explorerTxEventDtoSchema.parse({
      name: 'RecipientsRegistered',
      programId: String(args.programId ?? ''),
      count: Math.max(0, Number(args.count ?? 0)),
      program,
    })
  }
  if (args?.name === 'ProgramClosed') {
    const program = toExplorerProgramMetaDto(args.program)
    return explorerTxEventDtoSchema.parse({
      name: 'ProgramClosed',
      programId: String(args.programId ?? ''),
      status: 'CLOSED',
      program,
    })
  }
  const base = toSafeEventDto(args)
  return explorerTxEventDtoSchema.parse(
    args?.name === 'DisbursementRecorded'
      ? { name: 'DisbursementRecorded', ...base }
      : base,
  )
}

export function toExplorerBlockDto(data: any): ExplorerBlockDto {
  const dto = {
    number: Number(data.number ?? 0),
    hash: String(data.hash ?? ''),
    parentHash: String(data.parentHash ?? ''),
    timestamp: Number(data.timestamp ?? 0),
    proposer: String(data.proposer ?? ''),
    transactionCount: Number(data.transactionCount ?? 0),
  }
  return explorerBlockDtoSchema.parse(dto)
}

export function toExplorerBlockListDto(data: any): ExplorerBlockListDto {
  const dto = {
    data: Array.isArray(data.data) ? data.data.map(toExplorerBlockDto) : [],
    page: Number(data.page ?? 1),
    limit: Number(data.limit ?? 20),
    total: Number(data.total ?? 0),
  }
  return explorerBlockListDtoSchema.parse(dto)
}

export function toExplorerTxDto(data: any): ExplorerTxDto {
  const dto = {
    txHash: String(data.txHash ?? ''),
    from: String(data.from ?? ''),
    to: String(data.to ?? ''),
    blockNumber: Number(data.blockNumber ?? 0),
    status: (data.status === 'SUCCESS' ? 'SUCCESS' : 'REVERTED') as 'SUCCESS' | 'REVERTED',
    utc: String(data.utc ?? ''),
    events: Array.isArray(data.events) ? data.events.map(toExplorerTxEventDto) : [],
  }
  return explorerTxDtoSchema.parse(dto)
}

export function toExplorerAddressDto(data: any): ExplorerAddressDto {
  const dto = {
    address: String(data.address ?? '').toLowerCase(),
    data: Array.isArray(data.data)
      ? data.data.map((item: any) => ({
          ...toSafeEventDto(item),
          txHash: String(item.txHash ?? ''),
        }))
      : [],
    total: Number(data.total ?? 0),
    page: Number(data.page ?? 1),
    limit: Number(data.limit ?? 20),
  }
  return explorerAddressDtoSchema.parse(dto)
}

export function toExplorerContractDto(data: any): ExplorerContractDto {
  const dto = {
    address: String(data.address ?? ''),
    authorizedWallet: data.authorizedWallet ? String(data.authorizedWallet) : null,
    owner: data.owner ? String(data.owner) : null,
    paused: data.paused != null ? Boolean(data.paused) : null,
    chainId: data.chainId != null ? Number(data.chainId) : null,
    networkOk: data.networkOk != null ? Boolean(data.networkOk) : null,
    abi: Array.isArray(data.abi) ? data.abi : [],
  }
  return explorerContractDtoSchema.parse(dto)
}

export function toExplorerValidatorsDto(data: any): ExplorerValidatorsDto {
  const dto = {
    data: Array.isArray(data.data)
      ? data.data.map((item: any) => ({
          address: String(item.address ?? ''),
          institution: item.institution ? String(item.institution) : null,
        }))
      : [],
    count: data.count != null ? Number(data.count) : null,
  }
  return explorerValidatorsDtoSchema.parse(dto)
}

export function toExplorerSearchDto(data: any): ExplorerSearchDto {
  if (data && 'hash' in data && 'parentHash' in data) {
    return toExplorerBlockDto(data)
  }
  if (data && 'address' in data && 'data' in data && 'page' in data) {
    return toExplorerAddressDto(data)
  }
  if (data && 'txHash' in data && 'events' in data) {
    return toExplorerTxDto(data)
  }
  if (data && 'data' in data && 'limit' in data) {
    const dto = {
      data: Array.isArray(data.data)
        ? data.data.map((item: any) => ({
            ...toSafeEventDto(item),
            txHash: String(item.txHash ?? ''),
          }))
        : [],
      limit: Number(data.limit ?? 100),
    }
    return explorerSearchDtoSchema.parse(dto)
  }
  return explorerSearchDtoSchema.parse(data)
}

