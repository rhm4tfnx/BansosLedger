import { ERROR_CATALOG, type ErrorCode } from '@/lib/api-contract/errors'

export const FALLBACK_API_ERROR_MESSAGE = 'Terjadi kesalahan. Coba lagi.'

export interface ApiClientErrorInit {
  status: number
  code: string
  detail: string
  requestId?: string | null
  errors?: unknown
  retryAfter?: number | null
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string
  readonly detail: string
  readonly requestId: string | null
  readonly errors: unknown
  readonly retryAfter: number | null

  constructor(init: ApiClientErrorInit) {
    super(init.detail || mapApiErrorCode(init.code))
    this.name = 'ApiClientError'
    this.status = init.status
    this.code = init.code
    this.detail = init.detail || mapApiErrorCode(init.code)
    this.requestId = init.requestId ?? null
    this.errors = init.errors ?? null
    this.retryAfter = init.retryAfter ?? null
  }
}

export function isKnownErrorCode(code: string): code is ErrorCode {
  return Object.hasOwn(ERROR_CATALOG, code)
}

export function mapApiErrorCode(code?: string | null): string {
  if (!code) {
    return FALLBACK_API_ERROR_MESSAGE
  }
  if (isKnownErrorCode(code)) {
    return ERROR_CATALOG[code].message
  }
  return FALLBACK_API_ERROR_MESSAGE
}

export interface FormattedApiError {
  status: number | null
  code: string | null
  message: string
  requestId: string | null
  retryAfter: number | null
  fullMessage: string
}

export function formatApiError(error: unknown): FormattedApiError {
  if (error instanceof ApiClientError) {
    const message = mapApiErrorCode(error.code)
    const fullMessage = error.requestId ? `${message} (${error.requestId})` : message
    return {
      status: error.status,
      code: error.code,
      message,
      requestId: error.requestId,
      retryAfter: error.retryAfter,
      fullMessage,
    }
  }

  return {
    status: null,
    code: null,
    message: FALLBACK_API_ERROR_MESSAGE,
    requestId: null,
    retryAfter: null,
    fullMessage: FALLBACK_API_ERROR_MESSAGE,
  }
}

