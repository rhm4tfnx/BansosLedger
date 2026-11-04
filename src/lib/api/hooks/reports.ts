'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import {
  realizationReportDtoSchema,
  reconciliationDtoSchema,
} from '@/lib/api-contract'
import type {
  RealizationReportViewModel,
  ReconciliationViewModel,
} from '@/types'
import {
  toRealizationReportViewModel,
  toReconciliationViewModel,
} from '../adapters/reports'
import { apiFetch, buildApiPath, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

export interface RealizationReportFilters {
  programId?: string
  period?: number
  page?: number
  limit?: number
  sort?: string
  enabled?: boolean
}

export function useRealizationReportQuery(filters: RealizationReportFilters = {}) {
  const { enabled = true, ...queryFilters } = filters
  return useQuery<RealizationReportViewModel, ApiClientError>({
    queryKey: queryKeys.reports.realization(queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/reports/realization', queryFilters)
      const dto = await apiFetch(path, {
        schema: realizationReportDtoSchema,
        signal,
      })
      return toRealizationReportViewModel(dto)
    },
    enabled,
  })
}

export interface ReconciliationReportFilters {
  programId?: string
  period?: number
  anomalyPage?: number
  limitPerCategory?: number
  enabled?: boolean
}

export function useReconciliationReportQuery(filters: ReconciliationReportFilters = {}) {
  const { enabled = true, ...queryFilters } = filters
  return useQuery<ReconciliationViewModel, ApiClientError>({
    queryKey: queryKeys.reports.reconciliation(queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/reports/reconciliation', queryFilters)
      const dto = await apiFetch(path, {
        schema: reconciliationDtoSchema,
        signal,
      })
      return toReconciliationViewModel(dto)
    },
    enabled,
  })
}

export interface ExportReportCsvInput {
  programId?: string
  period?: number
}

export function useExportReportCsvMutation() {
  return useMutation<string, ApiClientError, ExportReportCsvInput>({
    mutationFn: (filters) => {
      const path = buildApiPath('/api/v1/reports/export', { ...filters })
      return apiFetch<string>(path, {
        headers: {
          Accept: 'text/csv, application/problem+json',
        },
      })
    },
  })
}

