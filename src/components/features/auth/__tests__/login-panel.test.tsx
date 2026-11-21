import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPanel } from '@/components/features/auth/login-panel'
import { createAppQueryClient, QueryProvider } from '@/components/providers/query-provider'

const pushMock = vi.fn()
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
    replace: vi.fn(),
  }),
}))

const walletMock = {
  status: 'disconnected' as 'disconnected' | 'connected' | 'wrong-chain',
  address: null as string | null,
  chainId: null as number | null,
  lastError: null as string | null,
  connect: vi.fn<() => Promise<string | null>>(),
  signMessage: vi.fn<(message: string, address?: string) => Promise<string>>(),
  ensureChain: vi.fn<() => Promise<void>>(),
}

vi.mock('@/lib/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet')>()
  return {
    ...actual,
    useWallet: () => walletMock,
  }
})

const operatorMeDto = {
  id: 'usr-op-1',
  name: 'Operator Takkalasi',
  institution: 'Kelurahan Takkalasi',
  email: 'operator@takkalasi.barru.go.id',
  role: 'OPERATOR_KELURAHAN' as const,
  mustChangePassword: false,
  walletVerified: false,
  boundWalletAddress: null,
  expiresAt: Date.now() + 3600_000,
}

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

beforeEach(() => {
  pushMock.mockReset()
  refreshMock.mockReset()
  walletMock.status = 'disconnected'
  walletMock.address = null
  walletMock.chainId = null
  walletMock.lastError = null
  walletMock.connect.mockReset()
  walletMock.signMessage.mockReset()
  walletMock.ensureChain.mockReset()
  window.history.replaceState({}, '', '/login')
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

function renderLoginPanel() {
  const client = createAppQueryClient()
  return render(
    <QueryProvider client={client}>
      <LoginPanel />
    </QueryProvider>,
  )
}

describe('<LoginPanel>', () => {
  it('redirects OPERATOR_KELURAHAN directly to /dashboard after successful credential login', async () => {
    const user = userEvent.setup()
    let authenticated = false

    server.use(
      http.get('http://localhost:3000/api/v1/auth/me', () => {
        if (!authenticated) {
          return HttpResponse.json(
            {
              type: 'https://bansosledger.local/problems/AUTH_REQUIRED',
              title: 'Autentikasi diperlukan',
              status: 401,
              detail: 'Sesi tidak ditemukan.',
              code: 'AUTH_REQUIRED',
              requestId: 'req-me-unauth',
            },
            { status: 401, headers: { 'content-type': 'application/problem+json' } },
          )
        }
        return HttpResponse.json(operatorMeDto)
      }),
      http.post('http://localhost:3000/api/v1/auth/login', () => {
        authenticated = true
        return HttpResponse.json({
          authenticated: true,
          userId: 'usr-op-1',
          role: 'OPERATOR_KELURAHAN',
          walletVerificationRequired: false,
          redirectTo: '/dashboard',
          mustChangePassword: false,
        })
      }),
    )

    renderLoginPanel()

    await user.type(await screen.findByLabelText('Email'), 'operator@takkalasi.barru.go.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'KataSandiValid123!')
    await user.click(screen.getByRole('button', { name: /masuk ke dashboard/i }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard')
      expect(refreshMock).toHaveBeenCalledTimes(1)
    })
  })

  it('shows only one "Masuk ke Dashboard" button plus secondary "Verifikasi Wallet" on tab 01, and moves "Masuk ke Dashboard" into tab 02', async () => {
    const user = userEvent.setup()

    server.use(
      http.get('http://localhost:3000/api/v1/auth/me', () => HttpResponse.json(operatorMeDto)),
    )

    renderLoginPanel()

    // Wait for session query to resolve so canVerifyWallet becomes true
    const verifyWalletBtn = await screen.findByRole('button', { name: 'Verifikasi Wallet' })
    expect(verifyWalletBtn).toBeInTheDocument()

    // Tab 01 must only have ONE "Masuk ke Dashboard" button (the submit button)
    const dashboardButtonsTab1 = screen.getAllByRole('button', { name: /masuk ke dashboard/i })
    expect(dashboardButtonsTab1).toHaveLength(1)
    expect(dashboardButtonsTab1[0]).toHaveAttribute('type', 'submit')

    // Switch to tab 02 via the secondary "Verifikasi Wallet" button
    await user.click(verifyWalletBtn)
    expect(screen.getByRole('heading', { name: 'Verifikasi kepemilikan wallet' })).toBeInTheDocument()

    // Tab 02 has a "Masuk ke Dashboard" button that navigates directly to /dashboard
    const dashboardBtnTab2 = screen.getByRole('button', { name: /masuk ke dashboard/i })
    expect(dashboardBtnTab2).toBeInTheDocument()
    await user.click(dashboardBtnTab2)
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('renders red role="alert" above Email input on login failure and green role="status" above Jaringan Besu on wallet verification success', async () => {
    const user = userEvent.setup()

    walletMock.status = 'connected'
    walletMock.address = '0x1111111111111111111111111111111111111111'
    walletMock.chainId = 250204
    walletMock.signMessage.mockResolvedValue('0xsig-valid')

    server.use(
      http.get('http://localhost:3000/api/v1/auth/me', () => HttpResponse.json(operatorMeDto)),
      http.post('http://localhost:3000/api/v1/auth/login', () =>
        HttpResponse.json(
          {
            type: 'https://bansosledger.local/problems/UNAUTHENTICATED',
            title: 'Autentikasi gagal',
            status: 401,
            detail: 'Email atau kata sandi salah.',
            code: 'UNAUTHENTICATED',
            requestId: 'req-login-fail-1',
          },
          { status: 401, headers: { 'content-type': 'application/problem+json' } },
        ),
      ),
      http.post('http://localhost:3000/api/v1/auth/wallet/nonce', () =>
        HttpResponse.json({
          message: 'Sign this nonce: nonce-123',
        }),
      ),
      http.post('http://localhost:3000/api/v1/auth/wallet/bind', () =>
        HttpResponse.json({
          verified: true,
        }),
      ),
    )

    renderLoginPanel()

    const emailInput = await screen.findByLabelText('Email')
    await user.type(emailInput, 'operator@takkalasi.barru.go.id')
    await user.type(screen.getByLabelText('Kata sandi'), 'SalahSandi123!')
    await user.click(screen.getByRole('button', { name: /masuk ke dashboard/i }))

    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent('Sesi autentikasi tidak ditemukan atau tidak valid.')
    expect(errorAlert.className).toContain('bg-red-50')
    // Alert must appear BEFORE the Email input in DOM order
    expect(
      errorAlert.compareDocumentPosition(emailInput) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    // Switch to tab 02 and verify wallet
    const verifyTabBtn = await screen.findByRole('button', { name: 'Verifikasi Wallet' })
    await user.click(verifyTabBtn)

    await user.click(screen.getByRole('button', { name: 'Tanda tangani nonce server' }))

    const successStatus = await screen.findByRole('status')
    expect(successStatus).toHaveTextContent(
      'Kepemilikan wallet telah diverifikasi server. Sesi diperbarui.',
    )
    expect(successStatus.className).toContain('bg-primary/5')

    const besuPanel = screen.getByText('Jaringan Besu')
    // Success alert must appear BEFORE the Jaringan Besu panel in DOM order
    expect(
      successStatus.compareDocumentPosition(besuPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
