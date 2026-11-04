import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ForceChangePasswordDialog } from '@/components/features/auth/force-change-password-dialog'
import { createAppQueryClient, QueryProvider } from '@/components/providers/query-provider'
import { StateBoundary } from '@/components/shared/state-boundary'
import { ApiClientError, useUiEventsStore } from '@/lib/api'

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

describe('<StateBoundary>', () => {
  it('renders loading skeleton, empty state, error state with requestId + retry, and content', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    const { rerender } = render(
      <StateBoundary isLoading loadingRows={3}>
        <div>Data Siap</div>
      </StateBoundary>,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Data Siap')).not.toBeInTheDocument()

    // Error state with mapped Indonesian message + requestId + retry button
    const apiError = new ApiClientError({
      status: 409,
      code: 'DUPLICATE_PROGRAM_CODE',
      detail: 'Kode program sudah terdaftar.',
      requestId: 'req-prog-77788899',
    })

    rerender(
      <StateBoundary error={apiError} onRetry={onRetry}>
        <div>Data Siap</div>
      </StateBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Kode program sudah terdaftar.')).toBeInTheDocument()
    expect(screen.getByText('ID Permintaan: req-prog-77788899')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /coba lagi/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    // Empty state
    rerender(
      <StateBoundary isEmpty emptyTitle="Belum ada penerima" emptyDescription="Tambahkan penerima baru.">
        <div>Data Siap</div>
      </StateBoundary>,
    )
    expect(screen.getByText('Belum ada penerima')).toBeInTheDocument()
    expect(screen.getByText('Tambahkan penerima baru.')).toBeInTheDocument()

    // Content state
    rerender(
      <StateBoundary>
        <div>Data Siap</div>
      </StateBoundary>,
    )
    expect(screen.getByText('Data Siap')).toBeInTheDocument()
  })
})

describe('<ForceChangePasswordDialog>', () => {
  it('is non-dismissible, validates >= 12 char password policy, and submits via API', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    let submittedPayload: unknown = null

    server.use(
      http.post('http://localhost:3000/api/v1/auth/change-password', async ({ request }) => {
        submittedPayload = await request.json()
        return HttpResponse.json({
          changed: true,
          mustChangePassword: false,
        })
      }),
      http.get('http://localhost:3000/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 'u-1',
          name: 'Operator',
          institution: 'Kelurahan Takkalasi',
          email: 'operator@barru.go.id',
          role: 'OPERATOR',
          mustChangePassword: false,
          walletVerified: false,
          boundWalletAddress: null,
          expiresAt: 1793800000000,
        }),
      ),
    )

    const queryClient = createAppQueryClient()
    render(
      <QueryProvider client={queryClient}>
        <ForceChangePasswordDialog initialOpen onSuccess={onSuccess} />
      </QueryProvider>,
    )

    expect(await screen.findByText('Ganti kata sandi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()

    // Pressing Escape must NOT dismiss the mandatory dialog
    await user.keyboard('{Escape}')
    expect(screen.getByText('Ganti kata sandi')).toBeInTheDocument()

    // Short password (< 12 chars) is rejected client-side
    const currentInput = screen.getByLabelText('Kata sandi saat ini')
    const newInput = screen.getByLabelText('Kata sandi baru (minimal 12 karakter)')
    const confirmInput = screen.getByLabelText('Konfirmasi kata sandi baru')

    await user.type(currentInput, 'TempPass!2026')
    await user.type(newInput, 'pendek123')
    await user.type(confirmInput, 'pendek123')
    await user.click(screen.getByRole('button', { name: 'Simpan kata sandi baru' }))

    expect(await screen.findByText('Kata sandi baru minimal 12 karakter.')).toBeInTheDocument()
    expect(submittedPayload).toBeNull()

    // Valid strong password (>= 12 chars) succeeds and closes dialog
    await user.clear(newInput)
    await user.clear(confirmInput)
    await user.type(newInput, 'TakkalasiAman#2026!')
    await user.type(confirmInput, 'TakkalasiAman#2026!')
    await user.click(screen.getByRole('button', { name: 'Simpan kata sandi baru' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
    expect(submittedPayload).toEqual({
      currentPassword: 'TempPass!2026',
      newPassword: 'TakkalasiAman#2026!',
    })
    expect(useUiEventsStore.getState().mustChangePasswordOpen).toBe(false)
  })
})
