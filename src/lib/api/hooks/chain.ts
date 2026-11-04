'use client'

import { useQuery } from '@tanstack/react-query'
import { networkStatusDtoSchema, walletStatusDtoSchema } from '@/lib/api-contract'
import type { NetworkStatusViewModel, WalletStatusViewModel } from '@/types'
import { toNetworkStatusViewModel, toWalletStatusViewModel } from '../adapters/chain'
import { apiFetch, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

export function useNetworkStatusQuery(options: {
  enabled?: boolean
  refetchInterval?: number | false | (() => number | false)
} = {}) {
  return useQuery<NetworkStatusViewModel, ApiClientError>({
    queryKey: queryKeys.chain.networkStatus(),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch('/api/v1/network/status', {
        schema: networkStatusDtoSchema,
        signal,
      })
      return toNetworkStatusViewModel(dto)
    },
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval,
    refetchIntervalInBackground: false,
  })
}

export function useWalletStatusQuery(enabled = true) {
  return useQuery<WalletStatusViewModel, ApiClientError>({
    queryKey: queryKeys.chain.walletStatus(),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch('/api/v1/wallet/status', {
        schema: walletStatusDtoSchema,
        signal,
      })
      return toWalletStatusViewModel(dto)
    },
    enabled,
  })
}

