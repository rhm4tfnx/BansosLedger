import type { z } from 'zod'
import { ApiClientError, FALLBACK_API_ERROR_MESSAGE, mapApiErrorCode } from './errors'
import { triggerUnauthorized, useUiEventsStore } from './ui-events'

export { ApiClientError } from './errors'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiFetchOptions<T> {
  method?: HttpMethod
  body?: unknown
  schema?: z.ZodType<T>
  signal?: AbortSignal
  idempotencyKey?: string
  headers?: Record<string, string>
  skipGlobalErrorHandlers?: boolean
}

export function buildApiPath(
  basePath: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!params) return basePath
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    searchParams.set(key, String(value))
  }
  const qs = searchParams.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

function shouldValidateContractSchema(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
}

function parseRetryAfterHeader(value: string | null): number | null {
  if (!value) return null
  const seconds = Number.parseInt(value.trim(), 10)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds
  }
  const parsedDate = Date.parse(value)
  if (!Number.isNaN(parsedDate)) {
    const delta = Math.ceil((parsedDate - Date.now()) / 1000)
    return Math.max(0, delta)
  }
  return null
}

function resolveRequestUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (typeof window === 'undefined') {
    const base = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000'
    return `${base.replace(/\/$/, '')}${normalizedPath}`
  }
  return normalizedPath
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function handleCrossCuttingError(error: ApiClientError, path: string): void {
  const uiStore = useUiEventsStore.getState()

  if (error.status === 401 && !path.includes('/api/v1/auth/login')) {
    triggerUnauthorized()
    return
  }

  if (error.status === 403 && error.code === 'PASSWORD_CHANGE_REQUIRED') {
    uiStore.openMustChangePassword()
    return
  }

  if (error.status === 429) {
    uiStore.showRateLimitToast(error.retryAfter)
    return
  }

  if (error.status === 503) {
    uiStore.setServiceUnavailable(true, error.requestId)
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions<T> = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    schema,
    signal,
    idempotencyKey,
    headers: customHeaders,
    skipGlobalErrorHandlers = false,
  } = options

  const headers = new Headers(customHeaders)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, application/problem+json')
  }
  if (idempotencyKey) {
    headers.set('Idempotency-Key', idempotencyKey)
  }

  let serializedBody: BodyInit | undefined
  if (body instanceof FormData) {
    serializedBody = body
  } else if (body !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    serializedBody = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(resolveRequestUrl(path), {
      method,
      headers,
      body: serializedBody,
      credentials: 'same-origin',
      signal,
    })
  } catch (networkErr) {
    if (
      networkErr instanceof DOMException &&
      networkErr.name === 'AbortError'
    ) {
      throw networkErr
    }
    if (
      networkErr instanceof Error &&
      networkErr.name === 'AbortError'
    ) {
      throw networkErr
    }
    throw new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      detail: FALLBACK_API_ERROR_MESSAGE,
      requestId: null,
      errors: null,
      retryAfter: null,
    })
  }

  const headerRequestId = response.headers.get('x-request-id')
  const retryAfter = parseRetryAfterHeader(response.headers.get('retry-after'))
  const contentType = (response.headers.get('content-type') || '').toLowerCase()

  if (!response.ok) {
    let parsedProblem: Record<string, unknown> | null = null
    if (contentType.includes('json')) {
      const jsonBody: unknown = await response.json().catch(() => null)
      if (isRecord(jsonBody)) {
        parsedProblem = jsonBody
      }
    } else {
      const textBody = await response.text().catch(() => '')
      if (textBody.trim().startsWith('{')) {
        try {
          const maybeJson: unknown = JSON.parse(textBody)
          if (isRecord(maybeJson)) {
            parsedProblem = maybeJson
          }
        } catch {
          parsedProblem = null
        }
      }
    }

    const code =
      (parsedProblem && typeof parsedProblem.code === 'string' && parsedProblem.code) ||
      `HTTP_${response.status}`
    const requestId =
      (parsedProblem && typeof parsedProblem.requestId === 'string' && parsedProblem.requestId) ||
      headerRequestId ||
      null
    const detail =
      (parsedProblem && typeof parsedProblem.detail === 'string' && parsedProblem.detail) ||
      (parsedProblem && typeof parsedProblem.message === 'string' && parsedProblem.message) ||
      (parsedProblem && typeof parsedProblem.title === 'string' && parsedProblem.title) ||
      mapApiErrorCode(code)
    const errors = parsedProblem && 'errors' in parsedProblem ? parsedProblem.errors : null

    const clientError = new ApiClientError({
      status: response.status,
      code,
      detail,
      requestId,
      errors,
      retryAfter,
    })

    if (!skipGlobalErrorHandlers) {
      handleCrossCuttingError(clientError, path)
    }

    throw clientError
  }

  if (useUiEventsStore.getState().serviceUnavailable) {
    useUiEventsStore.getState().setServiceUnavailable(false)
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (contentType.includes('text/csv')) {
    const csvText = await response.text()
    return csvText as T
  }

  const payload: unknown = await response.json()
  if (schema && shouldValidateContractSchema()) {
    return schema.parse(payload)
  }
  return payload as T
}
