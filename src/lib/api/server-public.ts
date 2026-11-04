import 'server-only'

import type { ZodType } from 'zod'
import {
  explorerBlockListDtoSchema,
   explorerValidatorsDtoSchema,
  listEnvelope,
  networkStatusDtoSchema,
  publicProgramDetailDtoSchema,
  publicProgramDtoSchema,
  publicSummaryDtoSchema,
} from '@/lib/api-contract'
import type {
  ExplorerBlockViewModel,
  ExplorerValidatorViewModel,
  NetworkStatusViewModel,
  PaginatedResult,
  PublicProgramDetailViewModel,
  PublicProgramViewModel,
  PublicSummaryViewModel,
} from '@/types'
import { toNetworkStatusViewModel } from './adapters/chain'
import {
  toExplorerBlockListViewModel,
  toExplorerValidatorsViewModel,
} from './adapters/explorer'
import {
  toPublicProgramDetailViewModel,
  toPublicProgramListViewModel,
  toPublicSummaryViewModel,
} from './adapters/public'
import { buildApiPath } from './client'

export type ServerFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; notFound: boolean; code?: string; requestId?: string }

function getInternalApiBaseUrl(): string {
  const configured =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    'http://127.0.0.1:3000'
  return configured.replace(/\/$/, '')
}

async function fetchPublicInternal<TDto, TViewModel>(
  path: string,
  schema: ZodType<TDto>,
  mapToViewModel: (dto: TDto) => TViewModel,
): Promise<ServerFetchResult<TViewModel>> {
  const baseUrl = getInternalApiBaseUrl()
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    })

    if (response.status === 404) {
      return { ok: false, notFound: true, code: 'NOT_FOUND' }
    }

    if (!response.ok) {
      let code: string | undefined
      let requestId: string | undefined
      try {
        const body = (await response.json()) as { code?: unknown; requestId?: unknown }
        if (typeof body?.code === 'string') code = body.code
        if (typeof body?.requestId === 'string') requestId = body.requestId
      } catch {
        // Ignore non-JSON error payloads
      }
      return { ok: false, notFound: false, code, requestId }
    }

    const raw = (await response.json()) as unknown
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, notFound: false, code: 'INVALID_CONTRACT_RESPONSE' }
    }

    return { ok: true, data: mapToViewModel(parsed.data) }
  } catch {
    return { ok: false, notFound: false, code: 'NETWORK_ERROR' }
  }
}

const publicProgramsEnvelopeSchema = listEnvelope(publicProgramDtoSchema)

export async function fetchPublicSummaryServer(): Promise<
  ServerFetchResult<PublicSummaryViewModel>
> {
  return fetchPublicInternal(
    '/api/v1/public/summary',
    publicSummaryDtoSchema,
    toPublicSummaryViewModel,
  )
}

export async function fetchPublicProgramsServer(params?: {
  page?: number
  limit?: number
  sort?: string
}): Promise<ServerFetchResult<PaginatedResult<PublicProgramViewModel>>> {
  const path = buildApiPath('/api/v1/public/programs', params)
  return fetchPublicInternal(
    path,
    publicProgramsEnvelopeSchema,
    toPublicProgramListViewModel,
  )
}

export async function fetchPublicProgramDetailServer(
  code: string,
  page = 1,
  limit = 20,
): Promise<ServerFetchResult<PublicProgramDetailViewModel>> {
  const path = buildApiPath(`/api/v1/public/programs/${encodeURIComponent(code)}`, {
    page,
    limit,
  })
  return fetchPublicInternal(
    path,
    publicProgramDetailDtoSchema,
    toPublicProgramDetailViewModel,
  )
}

export async function fetchPublicNetworkStatusServer(): Promise<
  ServerFetchResult<NetworkStatusViewModel>
> {
  return fetchPublicInternal(
    '/api/v1/network/status',
    networkStatusDtoSchema,
    toNetworkStatusViewModel,
  )
}

export async function fetchPublicValidatorsServer(): Promise<
  ServerFetchResult<{ items: ExplorerValidatorViewModel[]; count: number | null }>
> {
  return fetchPublicInternal(
    '/api/v1/explorer/validators',
    explorerValidatorsDtoSchema,
    toExplorerValidatorsViewModel,
  )
}

export async function fetchPublicRecentBlocksServer(
  limit = 6,
): Promise<ServerFetchResult<PaginatedResult<ExplorerBlockViewModel>>> {
  const path = buildApiPath('/api/v1/explorer/blocks', { page: 1, limit })
  return fetchPublicInternal(
    path,
    explorerBlockListDtoSchema,
    toExplorerBlockListViewModel,
  )
}

