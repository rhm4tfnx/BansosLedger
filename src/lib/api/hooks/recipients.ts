'use client'

import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listEnvelope,
  recipientDtoSchema,
  type RecipientStatus,
} from '@/lib/api-contract'
import type {
  PaginatedResult,
  RecipientDetailViewModel,
  RecipientViewModel,
} from '@/types'
import {
  recipientDetailDtoSchema,
  toRecipientDetailViewModel,
  toRecipientListViewModel,
  toRecipientViewModel,
} from '../adapters/recipients'
import { apiFetch, buildApiPath, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

const recipientListSchema = listEnvelope(recipientDtoSchema)
const okResultSchema = z.object({ ok: z.literal(true) }).strict()
const revealNikResultSchema = z.object({ nik: z.string() }).strict()

export interface RecipientsQueryFilters {
  page?: number
  limit?: number
  sort?: string
  q?: string
  status?: RecipientStatus
  programId?: string
  notEnrolledIn?: string
  dusun?: string
  rt?: string
  rw?: string
  enabled?: boolean
}

export function useRecipientsQuery(filters: RecipientsQueryFilters = {}) {
  const { enabled = true, ...rawFilters } = filters
  const trimmedQ = rawFilters.q?.trim()
  const hasNikInQ = Boolean(trimmedQ && /^\d{16}$/.test(trimmedQ))
  const queryFilters = hasNikInQ ? { ...rawFilters, q: undefined } : rawFilters
  return useQuery<PaginatedResult<RecipientViewModel>, ApiClientError>({
    queryKey: queryKeys.recipients.list(queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/recipients', queryFilters)
      const dto = await apiFetch(path, {
        schema: recipientListSchema,
        signal,
      })
      return toRecipientListViewModel(dto)
    },
    enabled: enabled && !hasNikInQ,
  })
}

export function useRecipientDetailQuery(
  id: string | null | undefined,
  historyPage = 1,
  enabled = true,
) {
  return useQuery<RecipientDetailViewModel, ApiClientError>({
    queryKey: queryKeys.recipients.detail(id ?? '', historyPage),
    queryFn: async ({ signal }) => {
      const path = buildApiPath(`/api/v1/recipients/${encodeURIComponent(id ?? '')}`, {
        page: historyPage,
      })
      const dto = await apiFetch(path, {
        schema: recipientDetailDtoSchema,
        signal,
      })
      return toRecipientDetailViewModel(dto)
    },
    enabled: Boolean(id) && enabled,
  })
}

export interface RecipientNikSearchInput {
  nik: string
  page?: number
  limit?: number
}

export function useRecipientSearchMutation() {
  return useMutation<PaginatedResult<RecipientViewModel>, ApiClientError, RecipientNikSearchInput>({
    mutationFn: async ({ nik, page, limit }) => {
      const path = buildApiPath('/api/v1/recipients/search', { page, limit })
      const dto = await apiFetch(path, {
        method: 'POST',
        body: { nik },
        schema: recipientListSchema,
      })
      return toRecipientListViewModel(dto)
    },
  })
}

export interface CreateRecipientInput {
  nik: string
  name: string
  address: {
    dusun: string
    rt: string
    rw: string
  }
  phone?: string
}

export function useCreateRecipientMutation() {
  const queryClient = useQueryClient()
  return useMutation<RecipientViewModel, ApiClientError, CreateRecipientInput>({
    mutationFn: async (input) => {
      const dto = await apiFetch('/api/v1/recipients', {
        method: 'POST',
        body: input,
        schema: recipientDtoSchema,
      })
      return toRecipientViewModel(dto)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipients.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export interface UpdateRecipientInput {
  id: string
  patch: Partial<CreateRecipientInput>
}

export function useUpdateRecipientMutation() {
  const queryClient = useQueryClient()
  return useMutation<RecipientViewModel, ApiClientError, UpdateRecipientInput>({
    mutationFn: async ({ id, patch }) => {
      const dto = await apiFetch(`/api/v1/recipients/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
        schema: recipientDtoSchema,
      })
      return toRecipientViewModel(dto)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipients.lists() })
      void queryClient.invalidateQueries({
        queryKey: ['recipients', 'detail', variables.id],
      })
    },
  })
}

export interface DeleteRecipientInput {
  id: string
  reason: string
}

export function useDeleteRecipientMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ ok: true }, ApiClientError, DeleteRecipientInput>({
    mutationFn: ({ id, reason }) =>
      apiFetch(`/api/v1/recipients/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: { reason },
        schema: okResultSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipients.all })
    },
  })
}

export function useFinalizeRecipientMutation() {
  const queryClient = useQueryClient()
  return useMutation<RecipientViewModel, ApiClientError, string>({
    mutationFn: async (id) => {
      const dto = await apiFetch(`/api/v1/recipients/${encodeURIComponent(id)}/finalize`, {
        method: 'POST',
        body: {},
        schema: recipientDtoSchema,
      })
      return toRecipientViewModel(dto)
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.recipients.lists() })
      void queryClient.invalidateQueries({ queryKey: ['recipients', 'detail', id] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useRevealNikMutation() {
  return useMutation<{ nik: string }, ApiClientError, string>({
    mutationFn: (id) =>
      apiFetch(`/api/v1/recipients/${encodeURIComponent(id)}/reveal-nik`, {
        method: 'POST',
        body: {},
        schema: revealNikResultSchema,
      }),
  })
}
