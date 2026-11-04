import { act, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createAppQueryClient, QueryProvider } from '@/components/providers/query-provider'
import { RoleAccessProvider, useRoleAccess } from '@/hooks/use-role-access'
import {
  ApiClientError,
  apiFetch,
  FALLBACK_API_ERROR_MESSAGE,
  formatApiError,
  isStatusQueryKey,
  mapApiErrorCode,
  queryKeys,
  useDashboardSummaryQuery,
  useUiEventsStore,
} from '@/lib/api'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

beforeEach(() => {
  useUiEventsStore.getState().resetUiEvents()
})

afterEach(() => {
  server.resetHandlers()
  useUiEventsStore.getState().resetUiEvents()
})

afterAll(() => {
  server.close()
})

describe('errors.ts — catalog mapping and unknown fallback', () => {
  it('maps known ERROR_CATALOG codes to Indonesian messages', () => {
    expect(mapApiErrorCode('DUPLICATE_NIK')).toBe('NIK sudah terdaftar.')
    expect(mapApiErrorCode('NIK_IN_QUERY')).toBe(
      'NIK tidak boleh dikirim melalui URL; gunakan pencarian POST.',
    )
    expect(mapApiErrorCode('NotAuthorized')).toBe(
      'Wallet yang dipakai bukan wallet resmi Kelurahan. Ganti akun di MetaMask.',
    )
    expect(mapApiErrorCode('PASSWORD_CHANGE_REQUIRED')).toBe(
      'Ganti kata sandi terlebih dahulu.',
    )
  })

  it('falls back to "Terjadi kesalahan. Coba lagi." plus requestId for unknown codes', () => {
    expect(mapApiErrorCode('UNLISTED_FUTURE_CODE')).toBe(FALLBACK_API_ERROR_MESSAGE)
    expect(mapApiErrorCode(null)).toBe(FALLBACK_API_ERROR_MESSAGE)

    const unknownErr = new ApiClientError({
      status: 502,
      code: 'BAD_UPSTREAM_GATEWAY',
      detail: 'Upstream gateway timeout',
      requestId: 'req-abc-12345',
    })
    const formatted = formatApiError(unknownErr)
    expect(formatted.message).toBe('Terjadi kesalahan. Coba lagi.')
    expect(formatted.requestId).toBe('req-abc-12345')
    expect(formatted.fullMessage).toBe('Terjadi kesalahan. Coba lagi. (req-abc-12345)')
  })
})

describe('client.ts — apiFetch & cross-cutting handlers', () => {
  it('fetches JSON, forwards Idempotency-Key, and validates response with Zod schema', async () => {
    let capturedIdempotencyKey: string | null = null
    server.use(
      http.post('http://localhost:3000/api/v1/test-create', ({ request }) => {
        capturedIdempotencyKey = request.headers.get('idempotency-key')
        return HttpResponse.json({ id: 'item-1', count: 3 }, { status: 201 })
      }),
    )

    const schema = z.object({ id: z.string(), count: z.number().int() }).strict()
    const result = await apiFetch('/api/v1/test-create', {
      method: 'POST',
      body: { name: 'Uji' },
      idempotencyKey: 'idem-key-001',
      schema,
    })

    expect(result).toEqual({ id: 'item-1', count: 3 })
    expect(capturedIdempotencyKey).toBe('idem-key-001')
  })

  it('supports multipart FormData without overriding Content-Type to application/json', async () => {
    let capturedContentType = ''
    server.use(
      http.post('http://localhost:3000/api/v1/test-upload', ({ request }) => {
        capturedContentType = request.headers.get('content-type') ?? ''
        return HttpResponse.json({ uploaded: true })
      }),
    )

    const form = new FormData()
    form.append('privacyConsent', 'true')
    form.append('files', new File(['jpeg-bytes'], 'bukti.jpg', { type: 'image/jpeg' }))

    const res = await apiFetch<{ uploaded: boolean }>('/api/v1/test-upload', {
      method: 'POST',
      body: form,
    })

    expect(res.uploaded).toBe(true)
    expect(capturedContentType).toContain('multipart/form-data')
  })

  it('parses RFC 9457 application/problem+json into ApiClientError', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/recipients', () =>
        HttpResponse.json(
          {
            type: 'urn:bansos:error:DUPLICATE_NIK',
            title: 'NIK sudah terdaftar.',
            status: 409,
            code: 'DUPLICATE_NIK',
            message: 'NIK sudah terdaftar.',
            requestId: 'req-dup-99887766',
            errors: [{ field: 'nik' }],
          },
          {
            status: 409,
            headers: {
              'Content-Type': 'application/problem+json',
              'X-Request-Id': 'req-dup-99887766',
            },
          },
        ),
      ),
    )

    await expect(
      apiFetch('/api/v1/recipients', {
        method: 'POST',
        body: { name: 'Tes' },
      }),
    ).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 409,
      code: 'DUPLICATE_NIK',
      detail: 'NIK sudah terdaftar.',
      requestId: 'req-dup-99887766',
      errors: [{ field: 'nik' }],
    })
  })

  it('converts network failures into ApiClientError with NETWORK_ERROR code', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/public/summary', () => HttpResponse.error()),
    )

    await expect(apiFetch('/api/v1/public/summary')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })

  it('clears QueryClient cache and redirects to /login?next=<path> on 401', async () => {
    window.history.pushState({}, '', '/dashboard/penyaluran?status=PENDING')
    const queryClient = createAppQueryClient()
    queryClient.setQueryData(['recipients', 'cached'], { secret: 'cached-value' })

    const redirectedUrls: string[] = []

    server.use(
      http.get('http://localhost:3000/api/v1/dashboard/summary', () =>
        HttpResponse.json(
          {
            type: 'urn:bansos:error:UNAUTHENTICATED',
            title: 'Sesi habis',
            status: 401,
            code: 'UNAUTHENTICATED',
            message: 'Sesi autentikasi tidak ditemukan atau tidak valid.',
            requestId: 'req-401-session',
          },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    function Probe() {
      useDashboardSummaryQuery()
      return <div>Probe</div>
    }

    render(
      <QueryProvider
        client={queryClient}
        onUnauthorizedRedirect={(targetUrl) => redirectedUrls.push(targetUrl)}
      >
        <Probe />
      </QueryProvider>,
    )

    await waitFor(() => {
      expect(redirectedUrls).toEqual([
        '/login?next=%2Fdashboard%2Fpenyaluran%3Fstatus%3DPENDING',
      ])
    })
    expect(queryClient.getQueryData(['recipients', 'cached'])).toBeUndefined()
  })

  it('triggers cross-cutting handlers for 403 PASSWORD_CHANGE_REQUIRED, 429 Retry-After, and 503 banner', async () => {
    const queryClient = createAppQueryClient()

    render(
      <QueryProvider client={queryClient}>
        <div>App Content</div>
      </QueryProvider>,
    )

    // 1. 403 PASSWORD_CHANGE_REQUIRED
    server.use(
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json(
          {
            type: 'urn:bansos:error:PASSWORD_CHANGE_REQUIRED',
            title: 'Ganti kata sandi terlebih dahulu.',
            status: 403,
            code: 'PASSWORD_CHANGE_REQUIRED',
            message: 'Ganti kata sandi terlebih dahulu.',
            requestId: 'req-403-pwd',
          },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    await act(async () => {
      await expect(apiFetch('/api/v1/auth/me')).rejects.toThrow(ApiClientError)
    })
    expect(useUiEventsStore.getState().mustChangePasswordOpen).toBe(true)

    // 2. 429 Retry-After toast
    server.use(
      http.post('http://localhost:3000/api/v1/recipients/1/reveal-nik', () =>
        HttpResponse.json(
          {
            type: 'urn:bansos:error:REVEAL_LIMIT',
            title: 'Batas pembukaan NIK tercapai.',
            status: 429,
            code: 'REVEAL_LIMIT',
            message: 'Batas pembukaan NIK tercapai.',
            requestId: 'req-429-limit',
          },
          {
            status: 429,
            headers: {
              'Content-Type': 'application/problem+json',
              'Retry-After': '45',
            },
          },
        ),
      ),
    )
    await act(async () => {
      await expect(
        apiFetch('/api/v1/recipients/1/reveal-nik', { method: 'POST', body: {} }),
      ).rejects.toMatchObject({ retryAfter: 45 })
    })

    await waitFor(() => {
      expect(
        screen.getByText('Terlalu banyak permintaan. Coba lagi dalam 45 detik.'),
      ).toBeInTheDocument()
    })

    // 3. 503 banner "Layanan sedang tidak tersedia"
    server.use(
      http.get('http://localhost:3000/api/v1/network/status', () =>
        HttpResponse.json(
          {
            type: 'urn:bansos:error:SERVICE_UNAVAILABLE',
            title: 'Layanan belum dikonfigurasi.',
            status: 503,
            code: 'SERVICE_UNAVAILABLE',
            message: 'Layanan belum dikonfigurasi.',
            requestId: 'req-503-down',
          },
          { status: 503, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    await act(async () => {
      await expect(apiFetch('/api/v1/network/status')).rejects.toMatchObject({ status: 503 })
    })

    await waitFor(() => {
      expect(screen.getByText('Layanan sedang tidak tersedia')).toBeInTheDocument()
    })
  })

  it('distinguishes status query keys for refetchOnWindowFocus and reads role from useSession', async () => {
    expect(isStatusQueryKey(queryKeys.auth.session())).toBe(true)
    expect(isStatusQueryKey(queryKeys.dashboard.summary())).toBe(true)
    expect(isStatusQueryKey(queryKeys.chain.networkStatus())).toBe(true)
    expect(isStatusQueryKey(queryKeys.disbursements.detail('123'))).toBe(true)
    expect(isStatusQueryKey(queryKeys.programs.list({}))).toBe(false)
    expect(isStatusQueryKey(queryKeys.public.summary())).toBe(false)

    server.use(
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 'u-1',
          name: 'Petugas Takkalasi',
          institution: 'Kelurahan Takkalasi',
          email: 'operator@barru.go.id',
          role: 'OPERATOR',
          mustChangePassword: false,
          walletVerified: true,
          boundWalletAddress: '0x1111111111111111111111111111111111111111',
          expiresAt: 1793800000000,
        }),
      ),
    )

    function RoleReader() {
      const { role } = useRoleAccess()
      return <span data-testid="resolved-role">{role ?? 'NONE'}</span>
    }

    const queryClient = createAppQueryClient()
    const retryFn = queryClient.getDefaultOptions().queries?.retry
    expect(typeof retryFn).toBe('function')
    if (typeof retryFn === 'function') {
      const err404 = new ApiClientError({
        status: 404,
        code: 'NOT_FOUND',
        detail: 'Data tidak ditemukan.',
      })
      const err503 = new ApiClientError({
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        detail: 'Layanan belum dikonfigurasi.',
      })
      expect(retryFn(0, err404)).toBe(false)
      expect(retryFn(0, err503)).toBe(true)
      expect(retryFn(1, err503)).toBe(true)
      expect(retryFn(2, err503)).toBe(false)
    }

    render(
      <QueryProvider client={queryClient}>
        <RoleAccessProvider>
          <RoleReader />
        </RoleAccessProvider>
      </QueryProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('resolved-role')).toHaveTextContent('OPERATOR_KELURAHAN')
    })
  })
})
