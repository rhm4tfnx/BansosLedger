'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardSummaryDtoSchema } from '@/lib/api-contract'
import type { DashboardSummaryViewModel } from '@/types'
import { toDashboardSummaryViewModel } from '../adapters/dashboard'
import { apiFetch, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

export function useDashboardSummaryQuery(enabled = true) {
  return useQuery<DashboardSummaryViewModel, ApiClientError>({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch('/api/v1/dashboard/summary', {
        schema: dashboardSummaryDtoSchema,
        signal,
      })
      return toDashboardSummaryViewModel(dto)
    },
    enabled,
  })
}

