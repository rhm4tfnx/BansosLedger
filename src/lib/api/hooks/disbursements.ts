'use client'

import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  disbursementCreatedDtoSchema,
  disbursementDtoSchema,
  disbursementPreflightDtoSchema,
  disbursementTxIntentDtoSchema,
  evidenceDtoSchema,
  listEnvelope,
  withdrawEvidenceDtoSchema,
  type DisbursementStatus,
  type WithdrawEvidenceDto,
} from '@/lib/api-contract'
import type {
  DisbursementPreflightViewModel,
  DisbursementTxIntentViewModel,
  DisbursementViewModel,
  EvidenceViewModel,
  PaginatedResult,
  PublicEvidenceItemViewModel,
} from '@/types'
import {
  publicEvidenceListDtoSchema,
  toDisbursementListViewModel,
  toDisbursementPreflightViewModel,
  toDisbursementTxIntentViewModel,
  toDisbursementViewModel,
  toEvidenceViewModel,
  toPublicEvidenceItemViewModel,
} from '../adapters/disbursements'
import { apiFetch, buildApiPath, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

const disbursementListSchema = listEnvelope(disbursementDtoSchema)
const okResultSchema = z.object({ ok: z.literal(true) }).strict()
const uploadEvidenceResponseSchema = z
  .object({
    data: z.array(evidenceDtoSchema),
  })
  .strict()

const confirmDisbursementResponseSchema = z.union([
  z.object({ status: z.literal('PENDING') }).strict(),
  disbursementDtoSchema.extend({
    errorCode: z.string().optional(),
    message: z.string().optional(),
  }),
])

export interface DisbursementsQueryFilters {
  page?: number
  limit?: number
  sort?: string
  programId?: string
  recipientId?: string
  period?: number
  status?: DisbursementStatus
  enabled?: boolean
}

export function useDisbursementsQuery(filters: DisbursementsQueryFilters = {}) {
  const { enabled = true, ...queryFilters } = filters
  return useQuery<PaginatedResult<DisbursementViewModel>, ApiClientError>({
    queryKey: queryKeys.disbursements.list(queryFilters),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/disbursements', queryFilters)
      const dto = await apiFetch(path, {
        schema: disbursementListSchema,
        signal,
      })
      return toDisbursementListViewModel(dto)
    },
    enabled,
  })
}

export function useDisbursementDetailQuery(
  id: string | null | undefined,
  options: { enabled?: boolean; refetchInterval?: number | false } = {},
) {
  return useQuery<DisbursementViewModel, ApiClientError>({
    queryKey: queryKeys.disbursements.detail(id ?? ''),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch(`/api/v1/disbursements/${encodeURIComponent(id ?? '')}`, {
        schema: disbursementDtoSchema,
        signal,
      })
      return toDisbursementViewModel(dto)
    },
    enabled: Boolean(id) && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
  })
}

export function usePublicEvidenceQuery(disbursementId: string | null | undefined, enabled = true) {
  return useQuery<PublicEvidenceItemViewModel[], ApiClientError>({
    queryKey: queryKeys.disbursements.publicEvidence(disbursementId ?? ''),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch(
        `/api/v1/disbursements/${encodeURIComponent(disbursementId ?? '')}/evidence`,
        {
          schema: publicEvidenceListDtoSchema,
          signal,
        },
      )
      return dto.data.map(toPublicEvidenceItemViewModel)
    },
    enabled: Boolean(disbursementId) && enabled,
  })
}

export interface DisbursementPreflightInput {
  programId: string
  period: number
  recipientId: string
}

export function useDisbursementPreflightMutation() {
  return useMutation<
    DisbursementPreflightViewModel,
    ApiClientError,
    DisbursementPreflightInput
  >({
    mutationFn: async (input) => {
      const dto = await apiFetch('/api/v1/disbursements/preflight', {
        method: 'POST',
        body: input,
        schema: disbursementPreflightDtoSchema,
      })
      return toDisbursementPreflightViewModel(dto)
    },
  })
}

export interface CreateDisbursementInput {
  programId: string
  recipientId: string
  period: number
  disbursedDate: string
  note?: string
  idempotencyKey: string
}

export function useCreateDisbursementMutation() {
  const queryClient = useQueryClient()
  return useMutation<DisbursementViewModel, ApiClientError, CreateDisbursementInput>({
    mutationFn: async ({ idempotencyKey, ...body }) => {
      const dto = await apiFetch('/api/v1/disbursements', {
        method: 'POST',
        body,
        idempotencyKey,
        schema: disbursementCreatedDtoSchema,
      })
      const { preview: _preview, deleted: _deleted, ...baseDto } = dto
      return toDisbursementViewModel(baseDto)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export interface DeleteDisbursementInput {
  id: string
  reason: string
}

export function useDeleteDisbursementMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ ok: true }, ApiClientError, DeleteDisbursementInput>({
    mutationFn: ({ id, reason }) =>
      apiFetch(`/api/v1/disbursements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: { reason },
        schema: okResultSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all })
    },
  })
}

export interface UploadEvidenceInput {
  disbursementId: string
  files: File[]
  privacyNoPii: boolean
  privacyNoSensitiveFaces: boolean
  privacyConsent: boolean
  previewConfirmed: boolean
}

export function useUploadEvidenceMutation() {
  const queryClient = useQueryClient()
  return useMutation<EvidenceViewModel[], ApiClientError, UploadEvidenceInput>({
    mutationFn: async ({
      disbursementId,
      files,
      privacyNoPii,
      privacyNoSensitiveFaces,
      privacyConsent,
      previewConfirmed,
    }) => {
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }
      formData.append('privacyNoPii', String(privacyNoPii))
      formData.append('privacyNoSensitiveFaces', String(privacyNoSensitiveFaces))
      formData.append('privacyConsent', String(privacyConsent))
      formData.append('previewConfirmed', String(previewConfirmed))

      const dto = await apiFetch(
        `/api/v1/disbursements/${encodeURIComponent(disbursementId)}/evidence`,
        {
          method: 'POST',
          body: formData,
          schema: uploadEvidenceResponseSchema,
        },
      )
      return dto.data.map(toEvidenceViewModel)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.lists() })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disbursements.detail(variables.disbursementId),
      })
    },
  })
}

export interface WithdrawEvidenceInput {
  disbursementId: string
  cid: string
  reason: string
}

export function useWithdrawEvidenceMutation() {
  const queryClient = useQueryClient()
  return useMutation<WithdrawEvidenceDto, ApiClientError, WithdrawEvidenceInput>({
    mutationFn: ({ disbursementId, cid, reason }) =>
      apiFetch(
        `/api/v1/disbursements/${encodeURIComponent(disbursementId)}/evidence/${encodeURIComponent(cid)}/withdraw`,
        {
          method: 'POST',
          body: { reason },
          schema: withdrawEvidenceDtoSchema,
        },
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disbursements.detail(variables.disbursementId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disbursements.publicEvidence(variables.disbursementId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.lists() })
    },
  })
}

export function useDisbursementTxIntentMutation() {
  return useMutation<DisbursementTxIntentViewModel, ApiClientError, string>({
    mutationFn: async (disbursementId) => {
      const dto = await apiFetch(
        `/api/v1/disbursements/${encodeURIComponent(disbursementId)}/tx-intent`,
        {
          method: 'POST',
          body: {},
          schema: disbursementTxIntentDtoSchema,
        },
      )
      return toDisbursementTxIntentViewModel(dto)
    },
  })
}

export interface SubmitDisbursementTxInput {
  disbursementId: string
  txHash: string
}

export function useSubmitDisbursementTxMutation() {
  const queryClient = useQueryClient()
  return useMutation<DisbursementViewModel, ApiClientError, SubmitDisbursementTxInput>({
    mutationFn: async ({ disbursementId, txHash }) => {
      const dto = await apiFetch(
        `/api/v1/disbursements/${encodeURIComponent(disbursementId)}/tx-submitted`,
        {
          method: 'PATCH',
          body: { txHash },
          schema: disbursementDtoSchema,
        },
      )
      return toDisbursementViewModel(dto)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.lists() })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disbursements.detail(variables.disbursementId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export interface ConfirmDisbursementInput {
  disbursementId: string
  txHash?: string
}

export type ConfirmDisbursementResult =
  | { kind: 'PENDING' }
  | {
      kind: 'SETTLED'
      disbursement: DisbursementViewModel
      errorCode?: string
      message?: string
    }

export function useConfirmDisbursementMutation() {
  const queryClient = useQueryClient()
  return useMutation<ConfirmDisbursementResult, ApiClientError, ConfirmDisbursementInput>({
    mutationFn: async ({ disbursementId, txHash }) => {
      const dto = await apiFetch(
        `/api/v1/disbursements/${encodeURIComponent(disbursementId)}/confirm`,
        {
          method: 'POST',
          body: txHash ? { txHash } : {},
          schema: confirmDisbursementResponseSchema,
        },
      )
      if ('status' in dto && dto.status === 'PENDING' && !('id' in dto)) {
        return { kind: 'PENDING' }
      }
      const { errorCode, message, ...disbursementDto } = dto
      return {
        kind: 'SETTLED',
        disbursement: toDisbursementViewModel(disbursementDto),
        errorCode,
        message,
      }
    },
    onSuccess: (result, variables) => {
      if (result.kind === 'SETTLED') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all })
        void queryClient.invalidateQueries({
          queryKey: queryKeys.disbursements.detail(variables.disbursementId),
        })
        void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
      }
    },
  })
}

export function useRetryDisbursementMutation() {
  const queryClient = useQueryClient()
  return useMutation<DisbursementViewModel, ApiClientError, string>({
    mutationFn: async (disbursementId) => {
      const dto = await apiFetch(
        `/api/v1/disbursements/${encodeURIComponent(disbursementId)}/retry`,
        {
          method: 'POST',
          body: {},
          schema: disbursementDtoSchema,
        },
      )
      return toDisbursementViewModel(dto)
    },
    onSuccess: (_data, disbursementId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.lists() })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.disbursements.detail(disbursementId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

