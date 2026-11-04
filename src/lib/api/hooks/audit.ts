'use client'

import { useQuery } from '@tanstack/react-query'
import { auditLogDtoSchema, listEnvelope } from '@/lib/api-contract'
import type {
  AuditLogViewModel,
  AuditVerifyViewModel,
  PaginatedResult,
} from '@/types'
import {
  auditVerifyDtoSchema,
  toAuditLogListViewModel,
  toAuditVerifyViewModel,
} from '../adapters/audit'
import { apiFetch, buildApiPath, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

const auditLogListSchema = listEnvelope(auditLogDtoSchema)

export interface AuditLogsQueryFilters {
  page?: number
  limit?: number
  sort?: string
  user?: string
  action?: string
  from?: string
  to?: string
  enabled?: boolean
}

export function useAuditLogsQuery(filters: AuditLogsQueryFilters = {}) {
  const { enabled = true, ...queryFilters } = filters
  return useQuery<PaginatedResult<AuditLogViewModel>, ApiClientError>({
    queryKey: queryKeys.audit.list(queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/audit-logs', queryFilters)
      const dto = await apiFetch(path, {
        schema: auditLogListSchema,
        signal,
      })
      return toAuditLogListViewModel(dto)
    },
    enabled,
  })
}

export function useVerifyAuditLogsQuery(from: number, to: number, enabled = true) {
  const validRange = Number.isInteger(from) && Number.isInteger(to) && from >= 1 && to >= from
  return useQuery<AuditVerifyViewModel, ApiClientError>({
    queryKey: queryKeys.audit.verify(from, to),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/audit-logs/verify', { from, to })
      const dto = await apiFetch(path, {
        schema: auditVerifyDtoSchema,
        signal,
      })
      return toAuditVerifyViewModel(dto)
    },
    enabled: validRange && enabled,
  })
}

