import 'server-only'
import {
  reconciliationDtoSchema,
  networkStatusDtoSchema,
  type ReconciliationDto,
  type NetworkStatusDto,
} from '@/lib/api-contract/dto'

export function toNetworkStatusDto(data: any): NetworkStatusDto {
  const dto = {
    status: data.status,
    latestBlock: Number(data.latestBlock ?? 0),
    timestamp: Number(data.timestamp ?? 0),
    ageSeconds: Number(data.ageSeconds ?? 0),
    validatorCount: data.validatorCount != null ? Number(data.validatorCount) : null,
    ...(Array.isArray(data.validators)
      ? {
          validators: data.validators.map((v: any) => ({
            address: String(v.address),
            institution: v.institution ? String(v.institution) : null,
          })),
        }
      : {}),
  }
  return networkStatusDtoSchema.parse(dto)
}

export function toReconciliationDto(data: any): ReconciliationDto {
  const dto = {
    db: {
      count: Number(data.db?.count ?? 0),
      amount: Math.round(Number(data.db?.amount ?? 0)),
    },
    chain: {
      count: Number(data.chain?.count ?? 0),
      amount: Math.round(Number(data.chain?.amount ?? 0)),
    },
    indexedThrough: Number(data.indexedThrough ?? -1),
    anomalies: {
      missingEvents: Array.isArray(data.anomalies?.missingEvents)
        ? data.anomalies.missingEvents.map((e: any) => ({
            refId: String(e.refId ?? ''),
            txHash: e.txHash ? String(e.txHash) : null,
            code: String(e.code ?? ''),
          }))
        : [],
      inconsistentEvents: Array.isArray(data.anomalies?.inconsistentEvents)
        ? data.anomalies.inconsistentEvents.map((e: any) => ({
            refId: String(e.refId ?? ''),
            txHash: String(e.txHash ?? ''),
            code: String(e.code ?? ''),
          }))
        : [],
      page: Number(data.anomalies?.page ?? 1),
      limitPerCategory: Number(data.anomalies?.limitPerCategory ?? 20),
    },
  }
  return reconciliationDtoSchema.parse(dto)
}
