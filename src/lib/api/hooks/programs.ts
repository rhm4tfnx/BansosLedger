'use client'

import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listEnvelope,
  programDtoSchema,
  programEnrollmentItemDtoSchema,
  type EnrollmentStatus,
  type ProgramKind,
  type ProgramStatus,
} from '@/lib/api-contract'
import type {
  PaginatedResult,
  ProgramDetailViewModel,
  ProgramEnrollmentViewModel,
  ProgramViewModel,
} from '@/types'
import {
  programDetailDtoSchema,
  toProgramDetailViewModel,
  toProgramEnrollmentListViewModel,
  toProgramListViewModel,
  toProgramViewModel,
} from '../adapters/programs'
import { apiFetch, buildApiPath, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

const programListSchema = listEnvelope(programDtoSchema)
const programEnrollmentListSchema = listEnvelope(programEnrollmentItemDtoSchema)
const enrollResultSchema = z.object({ enrolled: z.number().int().nonnegative() }).strict()
const programIntentSchema = z
  .object({
    to: z.string(),
    chainId: z.union([z.number().int(), z.string()]),
    data: z.string(),
  })
  .strict()
const programConfirmResponseSchema = z.union([
  z.object({ status: z.literal('PENDING') }).strict(),
  programDtoSchema,
])

export type ProgramChainIntent = z.infer<typeof programIntentSchema>

export interface ProgramsQueryFilters {
  page?: number
  limit?: number
  sort?: string
  status?: ProgramStatus
  search?: string
  enabled?: boolean
}

export function useProgramsQuery(filters: ProgramsQueryFilters = {}) {
  const { enabled = true, ...queryFilters } = filters
  return useQuery<PaginatedResult<ProgramViewModel>, ApiClientError>({
    queryKey: queryKeys.programs.list(queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/programs', queryFilters)
      const dto = await apiFetch(path, {
        schema: programListSchema,
        signal,
      })
      return toProgramListViewModel(dto)
    },
    enabled,
  })
}

export function useProgramDetailQuery(
  id: string | null | undefined,
  options: boolean | { enabled?: boolean; refetchInterval?: number | false } = true,
) {
  const enabled = typeof options === 'boolean' ? options : (options.enabled ?? true)
  const refetchInterval = typeof options === 'boolean' ? undefined : options.refetchInterval
  return useQuery<ProgramDetailViewModel, ApiClientError>({
    queryKey: queryKeys.programs.detail(id ?? ''),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch(`/api/v1/programs/${encodeURIComponent(id ?? '')}`, {
        schema: programDetailDtoSchema,
        signal,
      })
      return toProgramDetailViewModel(dto)
    },
    enabled: Boolean(id) && enabled,
    refetchInterval,
  })
}

export interface ProgramEnrollmentsQueryFilters {
  page?: number
  limit?: number
  sort?: string
  status?: EnrollmentStatus
  enabled?: boolean
}

export function useProgramEnrollmentsQuery(
  programId: string | null | undefined,
  filters: ProgramEnrollmentsQueryFilters = {},
) {
  const { enabled = true, ...queryFilters } = filters
  return useQuery<PaginatedResult<ProgramEnrollmentViewModel>, ApiClientError>({
    queryKey: queryKeys.programs.enrollments(programId ?? '', queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath(
        `/api/v1/programs/${encodeURIComponent(programId ?? '')}/enrollments`,
        queryFilters,
      )
      const dto = await apiFetch(path, {
        schema: programEnrollmentListSchema,
        signal,
      })
      return toProgramEnrollmentListViewModel(dto)
    },
    enabled: Boolean(programId) && enabled,
  })
}

export interface CreateProgramInput {
  code: string
  name: string
  description?: string
  fundSource: string
  kind: ProgramKind
  amountPerRecipient: number
  totalBudget: number
  startPeriod: number
  endPeriod: number
  isPublic?: boolean
}

export function useCreateProgramMutation() {
  const queryClient = useQueryClient()
  return useMutation<ProgramViewModel, ApiClientError, CreateProgramInput>({
    mutationFn: async (input) => {
      const dto = await apiFetch('/api/v1/programs', {
        method: 'POST',
        body: input,
        schema: programDtoSchema,
      })
      return toProgramViewModel(dto)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export interface UpdateProgramInput {
  id: string
  patch: Partial<CreateProgramInput>
}

export function useUpdateProgramMutation() {
  const queryClient = useQueryClient()
  return useMutation<ProgramViewModel, ApiClientError, UpdateProgramInput>({
    mutationFn: async ({ id, patch }) => {
      const dto = await apiFetch(`/api/v1/programs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
        schema: programDtoSchema,
      })
      return toProgramViewModel(dto)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.lists() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(variables.id) })
    },
  })
}

export interface EnrollRecipientsInput {
  programId: string
  recipientIds: string[]
}

export function useEnrollRecipientsMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ enrolled: number }, ApiClientError, EnrollRecipientsInput>({
    mutationFn: ({ programId, recipientIds }) =>
      apiFetch(`/api/v1/programs/${encodeURIComponent(programId)}/enrollments`, {
        method: 'POST',
        body: { recipientIds },
        schema: enrollResultSchema,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipients.all })
      void queryClient.invalidateQueries({
        queryKey: ['programs', 'enrollments', variables.programId],
      })
    },
  })
}

export function useActivateProgramIntentMutation() {
  return useMutation<ProgramChainIntent, ApiClientError, string>({
    mutationFn: (programId) =>
      apiFetch(`/api/v1/programs/${encodeURIComponent(programId)}/activate-intent`, {
        method: 'POST',
        body: {},
        schema: programIntentSchema,
      }),
  })
}

export interface RegisterRecipientsIntentInput {
  programId: string
  recipientIds?: string[]
  commitments?: string[]
}

export function useRegisterRecipientsIntentMutation() {
  return useMutation<ProgramChainIntent, ApiClientError, RegisterRecipientsIntentInput>({
    mutationFn: ({ programId, recipientIds, commitments }) =>
      apiFetch(`/api/v1/programs/${encodeURIComponent(programId)}/register-intent`, {
        method: 'POST',
        body: recipientIds ? { recipientIds } : { commitments: commitments ?? [] },
        schema: programIntentSchema,
      }),
  })
}

export function useCloseProgramIntentMutation() {
  return useMutation<ProgramChainIntent, ApiClientError, string>({
    mutationFn: (programId) =>
      apiFetch(`/api/v1/programs/${encodeURIComponent(programId)}/close-intent`, {
        method: 'POST',
        body: {},
        schema: programIntentSchema,
      }),
  })
}

export interface ConfirmProgramChainInput {
  programId: string
  kind: 'create' | 'register' | 'close'
  txHash: string
}

export type ConfirmProgramChainResult =
  | { status: 'PENDING' }
  | { status: 'CONFIRMED'; program: ProgramViewModel }

export function useConfirmProgramChainMutation() {
  const queryClient = useQueryClient()
  return useMutation<ConfirmProgramChainResult, ApiClientError, ConfirmProgramChainInput>({
    mutationFn: async ({ programId, kind, txHash }) => {
      const dto = await apiFetch(`/api/v1/programs/${encodeURIComponent(programId)}/chain-confirm`, {
        method: 'POST',
        body: { kind, txHash },
        schema: programConfirmResponseSchema,
      })
      if (dto.status === 'PENDING') {
        return { status: 'PENDING' }
      }
      return { status: 'CONFIRMED', program: toProgramViewModel(dto) }
    },
    onSuccess: (result, variables) => {
      if (result.status === 'CONFIRMED') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.recipients.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
        void queryClient.invalidateQueries({
          queryKey: ['programs', 'enrollments', variables.programId],
        })
      }
    },
  })
}
