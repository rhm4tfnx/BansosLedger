'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  authMeDtoSchema,
  changePasswordResultDtoSchema,
  loginResultDtoSchema,
  logoutResultDtoSchema,
  mfaVerifyResultDtoSchema,
  walletBindDtoSchema,
  walletNonceDtoSchema,
  type ChangePasswordResultDto,
  type LoginResultDto,
  type LogoutResultDto,
  type MfaVerifyResultDto,
  type WalletBindDto,
  type WalletNonceDto,
} from '@/lib/api-contract'
import type { SessionViewModel } from '@/types'
import { toSessionViewModel } from '../adapters/auth'
import { apiFetch, type ApiClientError } from '../client'
import { queryKeys } from '../keys'
import { useUiEventsStore } from '../ui-events'

export interface UseSessionOptions {
  enabled?: boolean
}

export function useSession(options: UseSessionOptions = {}) {
  return useQuery<SessionViewModel, ApiClientError>({
    queryKey: queryKeys.auth.session(),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch('/api/v1/auth/me', {
        schema: authMeDtoSchema,
        signal,
      })
      return toSessionViewModel(dto)
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  })
}

export interface LoginInput {
  email: string
  password: string
  next?: string
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation<LoginResultDto, ApiClientError, LoginInput>({
    mutationFn: (input) =>
      apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: input,
        schema: loginResultDtoSchema,
      }),
    onSuccess: (result) => {
      if (result.mustChangePassword) {
        useUiEventsStore.getState().openMustChangePassword()
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation<LogoutResultDto, ApiClientError, void>({
    mutationFn: () =>
      apiFetch('/api/v1/auth/logout', {
        method: 'POST',
        body: {},
        schema: logoutResultDtoSchema,
        skipGlobalErrorHandlers: true,
      }),
    onSuccess: () => {
      queryClient.clear()
      useUiEventsStore.getState().resetUiEvents()
    },
  })
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export function useChangePasswordMutation() {
  const queryClient = useQueryClient()
  return useMutation<ChangePasswordResultDto, ApiClientError, ChangePasswordInput>({
    mutationFn: (input) =>
      apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: input,
        schema: changePasswordResultDtoSchema,
      }),
    onSuccess: () => {
      useUiEventsStore.getState().closeMustChangePassword()
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
    },
  })
}

export interface MfaVerifyInput {
  code: string
}

export function useMfaVerifyMutation() {
  const queryClient = useQueryClient()
  return useMutation<MfaVerifyResultDto, ApiClientError, MfaVerifyInput>({
    mutationFn: (input) =>
      apiFetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        body: input,
        schema: mfaVerifyResultDtoSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
    },
  })
}

export interface WalletNonceInput {
  address: string
  chainId: string
}

export function useWalletNonceMutation() {
  return useMutation<WalletNonceDto, ApiClientError, WalletNonceInput>({
    mutationFn: (input) =>
      apiFetch('/api/v1/auth/wallet/nonce', {
        method: 'POST',
        body: input,
        schema: walletNonceDtoSchema,
      }),
  })
}

export interface WalletBindInput {
  address: string
  chainId: string
  message: string
  signature: string
}

export function useWalletBindMutation() {
  const queryClient = useQueryClient()
  return useMutation<WalletBindDto, ApiClientError, WalletBindInput>({
    mutationFn: (input) =>
      apiFetch('/api/v1/auth/wallet/bind', {
        method: 'POST',
        body: input,
        schema: walletBindDtoSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.chain.walletStatus() })
    },
  })
}

