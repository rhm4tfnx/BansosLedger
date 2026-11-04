import 'server-only'
import {
  realizationReportDtoSchema,
  dashboardSummaryDtoSchema,
  walletStatusDtoSchema,
  type RealizationReportDto,
  type DashboardSummaryDto,
  type WalletStatusDto,
} from '@/lib/api-contract/dto'
import { toNetworkStatusDto } from '@/modules/chain/dto'

export function toRealizationReportDto(data: any): RealizationReportDto {
  const total = Number(data.total ?? 0)
  const limit = Math.max(1, Number(data.limit ?? 20))
  const page = Math.max(1, Number(data.page ?? 1))
  const totalPages = Math.ceil(total / limit)

  const dto = {
    filters: {
      ...(data.filters?.programId ? { programId: String(data.filters.programId) } : {}),
      ...(data.filters?.period ? { period: Number(data.filters.period) } : {}),
    },
    summary: {
      pagu: Math.round(Number(data.summary?.pagu ?? 0)),
      target: Number(data.summary?.target ?? 0),
      realisasi: {
        count: Number(data.summary?.realisasi?.count ?? 0),
        rupiah: Math.round(Number(data.summary?.realisasi?.rupiah ?? 0)),
      },
      sisa: Math.round(Number(data.summary?.sisa ?? 0)),
      percentage: Number(data.summary?.percentage ?? 0),
    },
    data: Array.isArray(data.data)
      ? data.data.map((item: any) => ({
          id: String(item._id ?? item.id),
          programId: String(item.programId),
          refId: String(item.refId ?? ''),
          periodId: Number(item.periodId ?? 0),
          amount: Math.round(Number(item.amount ?? 0)),
          disbursedDate: item.disbursedDate
            ? (item.disbursedDate instanceof Date ? item.disbursedDate.toISOString() : String(item.disbursedDate))
            : null,
          txHash: item.txHash ? String(item.txHash) : null,
          recipient: item.recipient
            ? {
                name: String(item.recipient.name ?? ''),
                nikMasked: String(item.recipient.nikMasked ?? ''),
              }
            : null,
        }))
      : [],
    txHashes: Array.isArray(data.txHashes) ? data.txHashes.map(String) : [],
    total,
    page,
    limit,
    totalPages,
  }
  return realizationReportDtoSchema.parse(dto)
}

export function toDashboardSummaryDto(data: any): DashboardSummaryDto {
  const dto = {
    activePrograms: Number(data.activePrograms ?? 0),
    finalRecipients: Number(data.finalRecipients ?? 0),
    pagu: Math.round(Number(data.pagu ?? 0)),
    realisasi: {
      count: Number(data.realisasi?.count ?? 0),
      rupiah: Math.round(Number(data.realisasi?.rupiah ?? 0)),
    },
    percentage: Number(data.percentage ?? 0),
    pending: Number(data.pending ?? 0),
    failed: Number(data.failed ?? 0),
    monthly: Array.isArray(data.monthly)
      ? data.monthly.map((item: any) => ({
          periodId: Number(item.periodId ?? 0),
          count: Number(item.count ?? 0),
          amount: Math.round(Number(item.amount ?? 0)),
        }))
      : [],
    byProgram: Array.isArray(data.byProgram)
      ? data.byProgram.map((item: any) => ({
          code: String(item.code ?? ''),
          name: String(item.name ?? ''),
          count: Number(item.count ?? 0),
          amount: Math.round(Number(item.amount ?? 0)),
        }))
      : [],
    network: toNetworkStatusDto(data.network),
    recentTransactions: Array.isArray(data.recentTransactions)
      ? data.recentTransactions.map((tx: any) => ({
          id: String(tx._id ?? tx.id),
          refId: String(tx.refId ?? ''),
          programId: String(tx.programId),
          periodId: Number(tx.periodId ?? 0),
          amount: Math.round(Number(tx.amount ?? 0)),
          status: String(tx.status ?? ''),
          chain: tx.chain ?? null,
          createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : String(tx.createdAt ?? new Date().toISOString()),
          updatedAt: tx.updatedAt instanceof Date ? tx.updatedAt.toISOString() : String(tx.updatedAt ?? new Date().toISOString()),
        }))
      : [],
  }
  return dashboardSummaryDtoSchema.parse(dto)
}

export function toWalletStatusDto(data: any): WalletStatusDto {
  const dto = {
    authorizedWallet: data.authorizedWallet ? String(data.authorizedWallet) : null,
    owner: data.owner ? String(data.owner) : null,
    chainId: data.chainId != null ? Number(data.chainId) : null,
    paused: data.paused != null ? Boolean(data.paused) : null,
    networkOk: data.networkOk != null ? Boolean(data.networkOk) : null,
    ...(data.boundWallet !== undefined ? { boundWallet: data.boundWallet ? String(data.boundWallet) : null } : {}),
  }
  return walletStatusDtoSchema.parse(dto)
}

