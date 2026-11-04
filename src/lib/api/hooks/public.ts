'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import {
  listEnvelope,
  publicProgramDetailDtoSchema,
  publicProgramDtoSchema,
  publicStatusCheckDtoSchema,
  publicSummaryDtoSchema,
} from '@/lib/api-contract'
import type {
  PaginatedResult,
  PublicProgramDetailViewModel,
  PublicProgramViewModel,
  PublicStatusCheckViewModel,
  PublicSummaryViewModel,
} from '@/types'
import {
  toPublicProgramDetailViewModel,
  toPublicProgramListViewModel,
  toPublicStatusCheckViewModel,
  toPublicSummaryViewModel,
} from '../adapters/public'
import { apiFetch, buildApiPath, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

const publicProgramsListSchema = listEnvelope(publicProgramDtoSchema)

export interface PublicSummaryQueryOptions {
  enabled?: boolean
  initialData?: PublicSummaryViewModel
}

export function usePublicSummaryQuery(options: boolean | PublicSummaryQueryOptions = true) {
  const resolved: PublicSummaryQueryOptions =
    typeof options === 'boolean' ? { enabled: options } : options
  const { enabled = true, initialData } = resolved
  return useQuery<PublicSummaryViewModel, ApiClientError>({
    queryKey: queryKeys.public.summary(),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch('/api/v1/public/summary', {
        schema: publicSummaryDtoSchema,
        signal,
      })
      return toPublicSummaryViewModel(dto)
    },
    enabled,
    ...(initialData !== undefined ? { initialData } : {}),
  })
}

export interface PublicProgramsQueryFilters {
  page?: number
  limit?: number
  sort?: string
  enabled?: boolean
  initialData?: PaginatedResult<PublicProgramViewModel>
}

export function usePublicProgramsQuery(filters: PublicProgramsQueryFilters = {}) {
  const { enabled = true, initialData, ...queryFilters } = filters
  return useQuery<PaginatedResult<PublicProgramViewModel>, ApiClientError>({
    queryKey: queryKeys.public.programs(queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/public/programs', queryFilters)
      const dto = await apiFetch(path, {
        schema: publicProgramsListSchema,
        signal,
      })
      return toPublicProgramListViewModel(dto)
    },
    enabled,
    ...(initialData !== undefined ? { initialData } : {}),
  })
}

export interface PublicProgramDetailQueryOptions {
  enabled?: boolean
  initialData?: PublicProgramDetailViewModel
}

export function usePublicProgramDetailQuery(
  code: string | null | undefined,
  page = 1,
  limit = 20,
  options: boolean | PublicProgramDetailQueryOptions = true,
) {
  const resolved: PublicProgramDetailQueryOptions =
    typeof options === 'boolean' ? { enabled: options } : options
  const { enabled = true, initialData } = resolved
  return useQuery<PublicProgramDetailViewModel, ApiClientError>({
    queryKey: queryKeys.public.programDetail(code ?? '', page, limit),
    queryFn: async ({ signal }) => {
      const path = buildApiPath(
        `/api/v1/public/programs/${encodeURIComponent(code ?? '')}`,
        { page, limit },
      )
      const dto = await apiFetch(path, {
        schema: publicProgramDetailDtoSchema,
        signal,
      })
      return toPublicProgramDetailViewModel(dto)
    },
    enabled: Boolean(code) && enabled,
    ...(initialData !== undefined ? { initialData } : {}),
  })
}

export interface PublicStatusCheckInput {
  nik: string
  turnstileToken?: string
}

export function usePublicStatusCheckMutation() {
  return useMutation<PublicStatusCheckViewModel, ApiClientError, PublicStatusCheckInput>({
    gcTime: 0,
    retry: false,
    mutationFn: async (input) => {
      const dto = await apiFetch('/api/v1/public/status-check', {
        method: 'POST',
        body: input,
        schema: publicStatusCheckDtoSchema,
      })
      return toPublicStatusCheckViewModel(dto)
    },
  })
}

