'use client'

import { useQuery } from '@tanstack/react-query'
import {
  explorerAddressDtoSchema,
  explorerBlockDtoSchema,
  explorerBlockListDtoSchema,
  explorerContractDtoSchema,
  explorerSearchDtoSchema,
  explorerTxDtoSchema,
  explorerValidatorsDtoSchema,
} from '@/lib/api-contract'
import type {
  ExplorerAddressViewModel,
  ExplorerBlockViewModel,
  ExplorerContractViewModel,
  ExplorerSearchResultViewModel,
  ExplorerTxViewModel,
  ExplorerValidatorViewModel,
  PaginatedResult,
} from '@/types'
import {
  toExplorerAddressViewModel,
  toExplorerBlockListViewModel,
  toExplorerBlockViewModel,
  toExplorerContractViewModel,
  toExplorerSearchResultViewModel,
  toExplorerTxViewModel,
  toExplorerValidatorsViewModel,
} from '../adapters/explorer'
import { apiFetch, buildApiPath, type ApiClientError } from '../client'
import { queryKeys } from '../keys'

export function useExplorerBlocksQuery(page = 1, limit = 20, enabled = true) {
  return useQuery<PaginatedResult<ExplorerBlockViewModel>, ApiClientError>({
    queryKey: queryKeys.explorer.blocks(page, limit),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/explorer/blocks', { page, limit })
      const dto = await apiFetch(path, {
        schema: explorerBlockListDtoSchema,
        signal,
      })
      return toExplorerBlockListViewModel(dto)
    },
    enabled,
  })
}

export function useExplorerBlockDetailQuery(
  blockNumber: number | string | null | undefined,
  enabled = true,
) {
  const hasBlock = blockNumber !== null && blockNumber !== undefined && blockNumber !== ''
  return useQuery<ExplorerBlockViewModel, ApiClientError>({
    queryKey: queryKeys.explorer.blockDetail(blockNumber ?? ''),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch(
        `/api/v1/explorer/blocks/${encodeURIComponent(String(blockNumber))}`,
        {
          schema: explorerBlockDtoSchema,
          signal,
        },
      )
      return toExplorerBlockViewModel(dto)
    },
    enabled: hasBlock && enabled,
  })
}

export function useExplorerTxQuery(txHash: string | null | undefined, enabled = true) {
  return useQuery<ExplorerTxViewModel, ApiClientError>({
    queryKey: queryKeys.explorer.tx(txHash ?? ''),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch(`/api/v1/explorer/tx/${encodeURIComponent(txHash ?? '')}`, {
        schema: explorerTxDtoSchema,
        signal,
      })
      return toExplorerTxViewModel(dto)
    },
    enabled: Boolean(txHash) && enabled,
  })
}

export function useExplorerAddressQuery(
  address: string | null | undefined,
  page = 1,
  limit = 20,
  enabled = true,
) {
  return useQuery<ExplorerAddressViewModel, ApiClientError>({
    queryKey: queryKeys.explorer.address(address ?? '', page, limit),
    queryFn: async ({ signal }) => {
      const path = buildApiPath(
        `/api/v1/explorer/address/${encodeURIComponent(address ?? '')}`,
        { page, limit },
      )
      const dto = await apiFetch(path, {
        schema: explorerAddressDtoSchema,
        signal,
      })
      return toExplorerAddressViewModel(dto)
    },
    enabled: Boolean(address) && enabled,
  })
}

export function useExplorerContractQuery(enabled = true) {
  return useQuery<ExplorerContractViewModel, ApiClientError>({
    queryKey: queryKeys.explorer.contract(),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch('/api/v1/explorer/contract', {
        schema: explorerContractDtoSchema,
        signal,
      })
      return toExplorerContractViewModel(dto)
    },
    enabled,
  })
}

export function useExplorerValidatorsQuery(enabled = true) {
  return useQuery<{ items: ExplorerValidatorViewModel[]; count: number }, ApiClientError>({
    queryKey: queryKeys.explorer.validators(),
    queryFn: async ({ signal }) => {
      const dto = await apiFetch('/api/v1/explorer/validators', {
        schema: explorerValidatorsDtoSchema,
        signal,
      })
      return toExplorerValidatorsViewModel(dto)
    },
    enabled,
  })
}

export function useExplorerSearchQuery(q: string | null | undefined, enabled = true) {
  const trimmed = (q ?? '').trim()
  const is16DigitNik = /^\d{16}$/.test(trimmed)
  return useQuery<ExplorerSearchResultViewModel, ApiClientError>({
    queryKey: queryKeys.explorer.search(is16DigitNik ? '' : trimmed),
    queryFn: async ({ signal }) => {
      const path = buildApiPath('/api/v1/explorer/search', { q: trimmed })
      const dto = await apiFetch(path, {
        schema: explorerSearchDtoSchema,
        signal,
      })
      return toExplorerSearchResultViewModel(dto)
    },
    enabled: Boolean(trimmed) && !is16DigitNik && enabled,
  })
}

