import 'server-only'
import {
  publicSummaryDtoSchema,
  publicProgramDtoSchema,
  publicProgramDetailDtoSchema,
  publicStatusCheckDtoSchema,
  type PublicSummaryDto,
  type PublicProgramDto,
  type PublicProgramDetailDto,
  type PublicStatusCheckDto,
} from '@/lib/api-contract/dto'

export function toPublicSummaryDto(data: any): PublicSummaryDto {
  const dto = {
    programs: Number(data.programs ?? 0),
    budget: Math.round(Number(data.budget ?? 0)),
    transactions: Number(data.transactions ?? 0),
    amount: Math.round(Number(data.amount ?? 0)),
  }
  return publicSummaryDtoSchema.parse(dto)
}

export function toPublicProgramDto(data: any): PublicProgramDto {
  const dto = {
    code: String(data.code ?? ''),
    name: String(data.name ?? ''),
    description: data.description ? String(data.description) : null,
    kind: String(data.kind ?? ''),
    fundSource: String(data.fundSource ?? ''),
    amountPerRecipient: Math.round(Number(data.amountPerRecipient ?? 0)),
    totalBudget: Math.round(Number(data.totalBudget ?? 0)),
    startPeriod: Number(data.startPeriod ?? 0),
    endPeriod: Number(data.endPeriod ?? 0),
    status: String(data.status ?? ''),
  }
  return publicProgramDtoSchema.parse(dto)
}

export function toPublicProgramDetailDto(data: any): PublicProgramDetailDto {
  const total = Number(data.ledger?.total ?? 0)
  const limit = Math.max(1, Number(data.ledger?.limit ?? 20))
  const page = Math.max(1, Number(data.ledger?.page ?? 1))
  const totalPages = Math.ceil(total / limit)

  const dto = {
    program: toPublicProgramDto(data.program),
    ledger: {
      data: Array.isArray(data.ledger?.data)
        ? data.ledger.data.map((row: any) => ({
            txHash: row.txHash ? String(row.txHash) : null,
            period: Number(row.period ?? row.periodId ?? 0),
            amount: Math.round(Number(row.amount ?? 0)),
            time: row.time
              ? (row.time instanceof Date ? row.time.toISOString() : String(row.time))
              : null,
          }))
        : [],
      total,
      page,
      limit,
      totalPages,
    },
  }
  return publicProgramDetailDtoSchema.parse(dto)
}

export function toPublicStatusCheckDto(data: any): PublicStatusCheckDto {
  if (!data || !data.found) {
    return publicStatusCheckDtoSchema.parse({ found: false })
  }
  const dto = {
    found: true as const,
    name: String(data.name ?? ''),
    entries: Array.isArray(data.entries)
      ? data.entries.map((entry: any) => ({
          program: {
            code: entry.program?.code ? String(entry.program.code) : undefined,
            name: entry.program?.name != null ? String(entry.program.name) : undefined,
          },
          period: Number(entry.period ?? 0),
          amount: Math.max(0, Math.round(Number(entry.amount ?? 0))),
          status: String(entry.status ?? ''),
          txHash: entry.txHash ? String(entry.txHash) : undefined,
        }))
      : [],
  }
  return publicStatusCheckDtoSchema.parse(dto)
}

