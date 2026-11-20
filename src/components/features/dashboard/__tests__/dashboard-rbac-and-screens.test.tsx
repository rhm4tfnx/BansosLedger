import { useSyncExternalStore } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardShell } from '@/components/features/dashboard/dashboard-shell'
import { Disbursements } from '@/components/features/dashboard/disbursements/disbursements'
import { NetworkMonitoring } from '@/components/features/dashboard/monitoring/network-monitoring'
import { Recipients } from '@/components/features/dashboard/recipients/recipients'
import { Reports } from '@/components/features/dashboard/reports/reports'
import AccountSettings from '@/components/features/dashboard/settings/account-settings'
import { Verification } from '@/components/features/dashboard/verification/verification'
import { WalletRegistry } from '@/components/features/dashboard/wallet/wallet-registry'
import { RoleAccessProvider } from '@/hooks/use-role-access'
import { useUiEventsStore } from '@/lib/api'
import type { Role } from '@/types/rbac'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-csv')
  URL.revokeObjectURL = vi.fn()
}

let currentPathname = '/dashboard'
let currentSearch = ''
const navListeners = new Set<() => void>()

function setMockLocation(pathname: string, search = '') {
  currentPathname = pathname
  currentSearch = search.startsWith('?') ? search.slice(1) : search
  for (const listener of navListeners) listener()
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn((url: string) => {
      const [p, q = ''] = url.split('?')
      setMockLocation(p || currentPathname, q)
    }),
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () =>
    useSyncExternalStore(
      (cb) => {
        navListeners.add(cb)
        return () => navListeners.delete(cb)
      },
      () => currentPathname,
    ),
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (cb) => {
        navListeners.add(cb)
        return () => navListeners.delete(cb)
      },
      () => currentSearch,
    )
    return new URLSearchParams(search)
  },
}))

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

beforeEach(() => {
  setMockLocation('/dashboard', '')
  useUiEventsStore.getState().resetUiEvents()
})

afterEach(() => {
  server.resetHandlers()
  useUiEventsStore.getState().resetUiEvents()
  vi.useRealTimers()
})

afterAll(() => {
  server.close()
})

function renderForRole(ui: React.ReactElement, role: Role, enableSessionQuery = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RoleAccessProvider initialRole={role} enableSessionQuery={enableSessionQuery}>
        {ui}
      </RoleAccessProvider>
    </QueryClientProvider>,
  )
}

describe('Role-based action visibility & Part B read-only screens', () => {
  it('shows enabled write buttons for OPERATOR_KELURAHAN and hides them for KECAMATAN / DINAS_SOSIAL', async () => {
    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
      ),
      http.get('*/api/v1/recipients', () =>
        HttpResponse.json({
          data: [
            {
              id: '65f000000000000000000011',
              nikMasked: '7311••••••••0001',
              name: 'Baharuddin',
              address: { dusun: 'Takkalasi Utara', rt: '1', rw: '2' },
              phone: null,
              status: 'DRAFT',
              commitment: null,
              enrollments: [],
              createdAt: '2026-10-01T01:30:00.000Z',
              updatedAt: '2026-10-01T02:00:00.000Z',
              finalizedAt: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/disbursements', () =>
        HttpResponse.json({
          data: [
            {
              id: '65f000000000000000000099',
              refId: '0x' + '9'.repeat(64),
              programId: '65f000000000000000000001',
              recipientId: '65f000000000000000000011',
              program: { id: '65f000000000000000000001', code: 'BLT', name: 'BLT Kelurahan' },
              recipient: { id: '65f000000000000000000011', name: 'Baharuddin', nikMasked: '7311••••••••0001' },
              periodId: 202610,
              commitment: '0x' + '8'.repeat(64),
              amount: 600000,
              disbursedDate: null,
              note: '',
              status: 'DRAFT',
              evidence: [],
              chain: null,
              attempts: [],
              lastError: null,
              createdAt: '2026-10-15T03:00:00.000Z',
              updatedAt: '2026-10-15T03:00:00.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      ),
    )

    const operatorRecipients = renderForRole(<Recipients />, 'OPERATOR_KELURAHAN')
    await waitFor(() => {
      expect(screen.getByText('Baharuddin')).toBeInTheDocument()
    })
    const addRecipientBtn = screen.getByRole('button', { name: /tambah penerima/i })
    expect(addRecipientBtn).not.toBeDisabled()
    // CSV import stays hidden behind NEXT_PUBLIC_ENABLE_CSV_IMPORT (default false)
    expect(screen.queryByRole('button', { name: /impor csv/i })).not.toBeInTheDocument()
    operatorRecipients.unmount()

    const kecamatanRecipients = renderForRole(<Recipients />, 'KECAMATAN')
    await waitFor(() => {
      expect(screen.getByText('Baharuddin')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /tambah penerima/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /impor csv/i })).not.toBeInTheDocument()
    kecamatanRecipients.unmount()

    const operatorDisb = renderForRole(<Disbursements />, 'OPERATOR_KELURAHAN')
    await waitFor(() => {
      expect(screen.getByText('Baharuddin')).toBeInTheDocument()
    })
    const createDisbBtn = screen.getByRole('button', { name: /catat penyaluran baru/i })
    expect(createDisbBtn).not.toBeDisabled()
    operatorDisb.unmount()

    const dinsosDisb = renderForRole(<Disbursements />, 'DINAS_SOSIAL')
    await waitFor(() => {
      expect(screen.getByText('Baharuddin')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /catat penyaluran baru/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /konfirmasi/i })).not.toBeInTheDocument()
    dinsosDisb.unmount()
  })

  it('Monitoring renders "-" when validatorCount is null and polls every 10s only while tab is visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let networkCalls = 0

    server.use(
      http.get('*/api/v1/network/status', () => {
        networkCalls += 1
        return HttpResponse.json({
          status: 'Normal',
          latestBlock: 1234,
          timestamp: 1762240000,
          ageSeconds: 2,
          validatorCount: null,
          validators: [],
        })
      }),
      http.get('*/api/v1/explorer/validators', () =>
        HttpResponse.json({
          data: [],
          count: null,
        }),
      ),
      http.get('*/api/v1/wallet/status', () =>
        HttpResponse.json({
          authorizedWallet: '0x' + '1'.repeat(40),
          owner: '0x' + '2'.repeat(40),
          chainId: 1337,
          paused: false,
          networkOk: true,
          boundWallet: null,
        }),
      ),
    )

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })

    renderForRole(<NetworkMonitoring />, 'DINAS_SOSIAL')

    await waitFor(() => {
      expect(screen.getAllByText(/#1\.234/).length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
    expect(screen.queryByText(/simulasi/i)).not.toBeInTheDocument()

    const initialCalls = networkCalls
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500)
    })
    expect(networkCalls).toBeGreaterThan(initialCalls)

    // Hide the tab: polling must stop
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const callsWhenHidden = networkCalls
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25_000)
    })
    expect(networkCalls).toBe(callsWhenHidden)
  })

  it('Reports & Verification display real reconciliation anomalies, export CSV with format=csv, and omit LPJ & tampering mocks', async () => {
    const user = userEvent.setup()
    let exportFormatParam: string | null = null

    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
      ),
      http.get('*/api/v1/reports/realization', () =>
        HttpResponse.json({
          filters: {},
          summary: {
            pagu: 6000000,
            target: 10,
            realisasi: { count: 1, rupiah: 600000 },
            sisa: 5400000,
            percentage: 10,
          },
          data: [
            {
              id: 'd-1',
              programId: 'p-1',
              refId: '0x' + 'a'.repeat(64),
              periodId: 202610,
              amount: 600000,
              disbursedDate: '2026-10-15T00:00:00.000Z',
              txHash: '0x' + 'b'.repeat(64),
              recipient: { name: 'Rusdi', nikMasked: '7311••••••••0004' },
            },
          ],
          txHashes: ['0x' + 'b'.repeat(64)],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/reports/reconciliation', () =>
        HttpResponse.json({
          db: { count: 2, amount: 1200000 },
          chain: { count: 1, amount: 600000 },
          indexedThrough: 512,
          anomalies: {
            missingEvents: [
              {
                refId: '0x' + 'f'.repeat(64),
                txHash: null,
                code: 'DB_SUCCESS_WITHOUT_EVENT',
              },
            ],
            inconsistentEvents: [],
            page: 1,
            limitPerCategory: 20,
          },
        }),
      ),
      http.get('*/api/v1/reports/export', ({ request }) => {
        exportFormatParam = new URL(request.url).searchParams.get('format')
        return new HttpResponse('refId,amount\n0x1,600000', {
          status: 200,
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        })
      }),
    )

    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    const reportsView = renderForRole(<Reports />, 'OPERATOR_KELURAHAN')
    await waitFor(() => {
      expect(screen.getByText('Rusdi')).toBeInTheDocument()
      expect(screen.getByText('DB_SUCCESS_WITHOUT_EVENT')).toBeInTheDocument()
    })
    expect(screen.queryByText(/NTPN/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ekspor csv/i }))
    await waitFor(() => {
      expect(exportFormatParam).toBe('csv')
    })
    anchorClickSpy.mockRestore()
    reportsView.unmount()

    const verifView = renderForRole(<Verification />, 'KECAMATAN')
    await waitFor(() => {
      expect(screen.getByText('DB_SUCCESS_WITHOUT_EVENT')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /ubah nominal/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /aktifkan data uji/i })).not.toBeInTheDocument()
    verifView.unmount()
  })

  it('WalletRegistry and AccountSettings render live session/wallet status without fake Uji controls or fake NIP', async () => {
    const authWallet = '0x' + '1'.repeat(40)
    const ownerWallet = '0x' + '2'.repeat(40)

    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 'u-1',
          name: 'Rahmat Operator',
          institution: 'Kelurahan Takkalasi',
          email: 'rahmat@barrukab.go.id',
          role: 'OPERATOR',
          mustChangePassword: false,
          walletVerified: true,
          boundWalletAddress: authWallet,
          expiresAt: 1790000000000,
        }),
      ),
      http.get('*/api/v1/wallet/status', () =>
        HttpResponse.json({
          authorizedWallet: authWallet,
          owner: ownerWallet,
          chainId: 1337,
          paused: false,
          networkOk: true,
          boundWallet: authWallet,
        }),
      ),
      http.get('*/api/v1/explorer/validators', () =>
        HttpResponse.json({
          data: [{ address: '0x' + '3'.repeat(40), institution: 'Kelurahan Takkalasi' }],
          count: 1,
        }),
      ),
    )

    const walletView = renderForRole(<WalletRegistry />, 'OPERATOR_KELURAHAN', true)
    await waitFor(() => {
      expect(screen.getByText('1337')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /uji wallet ilegal/i })).not.toBeInTheDocument()
    const bindBtn = screen.getByRole('button', { name: /ikat wallet sesi/i })
    expect(bindBtn).not.toBeDisabled()
    walletView.unmount()

    const settingsView = renderForRole(<AccountSettings />, 'OPERATOR_KELURAHAN', true)
    await waitFor(() => {
      expect(screen.getAllByText('Rahmat Operator').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('rahmat@barrukab.go.id')).toBeInTheDocument()
    expect(screen.queryByText(/NIP/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /uji sesi wallet/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /uji ubah hak akses/i })).not.toBeInTheDocument()
    const pwdBtn = screen.getByRole('button', { name: /ganti kata sandi/i })
    expect(pwdBtn).not.toBeDisabled()
    settingsView.unmount()
  })

  it('DashboardShell links wallet verification badge to /dashboard/wallet, links Transaksi gagal to ?status=FAILED, and Disbursements activates FAILED tab from URL', async () => {
    let requestedDisbursementStatus: string | null = null

    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 'u-1',
          name: 'Rahmat Operator',
          institution: 'Kelurahan Takkalasi',
          email: 'rahmat@barrukab.go.id',
          role: 'OPERATOR',
          mustChangePassword: false,
          walletVerified: false,
          boundWalletAddress: null,
          expiresAt: 1790000000000,
        }),
      ),
      http.get('*/api/v1/network/status', () =>
        HttpResponse.json({
          status: 'Normal',
          latestBlock: 120,
          timestamp: 1762240000,
          ageSeconds: 2,
          validatorCount: 4,
          validators: [],
        }),
      ),
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
      ),
      http.get('*/api/v1/disbursements', ({ request }) => {
        requestedDisbursementStatus = new URL(request.url).searchParams.get('status')
        return HttpResponse.json({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      }),
    )

    setMockLocation('/dashboard/penyaluran', 'status=FAILED')
    renderForRole(
      <DashboardShell initialRole="OPERATOR_KELURAHAN" walletVerified={false}>
        <Disbursements />
      </DashboardShell>,
      'OPERATOR_KELURAHAN',
      true,
    )

    const walletLink = await screen.findByRole('link', { name: /Wallet belum terverifikasi/i })
    expect(walletLink).toHaveAttribute('href', '/dashboard/wallet')

    const failedNavLink = screen.getByRole('link', { name: /Transaksi gagal/i })
    expect(failedNavLink).toHaveAttribute('href', '/dashboard/penyaluran?status=FAILED')

    const failedFilterBtn = await screen.findByRole('button', { name: /^FAILED$/i })
    expect(failedFilterBtn).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => {
      expect(requestedDisbursementStatus).toBe('FAILED')
    })
  })

  it('Reports renders field-level Off-chain vs On-chain diffs for MISMATCH anomalies', async () => {
    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
      ),
      http.get('*/api/v1/reports/realization', () =>
        HttpResponse.json({
          filters: {},
          summary: {
            pagu: 6000000,
            target: 10,
            realisasi: { count: 1, rupiah: 600000 },
            sisa: 5400000,
            percentage: 10,
          },
          data: [],
          txHashes: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/reports/reconciliation', () =>
        HttpResponse.json({
          db: { count: 1, amount: 600000 },
          chain: { count: 1, amount: 600000 },
          indexedThrough: 512,
          anomalies: {
            missingEvents: [],
            inconsistentEvents: [
              {
                refId: '0x' + 'a'.repeat(64),
                txHash: '0x' + 'b'.repeat(64),
                code: 'MISMATCH',
                diffs: [
                  {
                    field: 'evidenceCid',
                    label: 'CID bukti IPFS',
                    offChain: 'bafy-offchain-modified-cid',
                    onChain: 'bafy-onchain-original-cid',
                  },
                  {
                    field: 'amount',
                    label: 'Nominal bantuan',
                    offChain: '750000',
                    onChain: '600000',
                  },
                ],
              },
            ],
            page: 1,
            limitPerCategory: 20,
          },
        }),
      ),
    )

    renderForRole(<Reports />, 'OPERATOR_KELURAHAN')
    const diffBox = await screen.findByLabelText(/Rincian perbedaan off-chain dan on-chain/i)
    expect(diffBox).toHaveTextContent(/Perbandingan Field \(Off-chain vs On-chain\)/i)
    expect(diffBox).toHaveTextContent('CID bukti IPFS')
    expect(diffBox).toHaveTextContent('bafy-offchain-modified-cid')
    expect(diffBox).toHaveTextContent('bafy-onchain-original-cid')
    expect(diffBox).toHaveTextContent('Rp 750.000')
    expect(diffBox).toHaveTextContent('Rp 600.000')
  })

  it('WalletRegistry shows real-time red Tidak sesuai when unverified or active MetaMask account mismatches, and displays specific 403 bind error', async () => {
    const authWallet = '0x' + '1'.repeat(40)
    const strangerWallet = '0x' + '9'.repeat(40)
    const ownerWallet = '0x' + '2'.repeat(40)
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
    const originalEthereum = (window as { ethereum?: unknown }).ethereum

    const mockEthereum = {
      isMetaMask: true,
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [authWallet]
        if (method === 'eth_chainId') return '0x3d15c'
        return null
      }),
      on: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event)!.add(fn)
      }),
      removeListener: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
        listeners.get(event)?.delete(fn)
      }),
    }
    ;(window as { ethereum?: unknown }).ethereum = mockEthereum

    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 'u-1',
          name: 'Rahmat Operator',
          institution: 'Kelurahan Takkalasi',
          email: 'rahmat@barrukab.go.id',
          role: 'OPERATOR',
          mustChangePassword: false,
          walletVerified: true,
          boundWalletAddress: authWallet,
          expiresAt: 1790000000000,
        }),
      ),
      http.get('*/api/v1/wallet/status', () =>
        HttpResponse.json({
          authorizedWallet: authWallet,
          owner: ownerWallet,
          chainId: 250204,
          paused: false,
          networkOk: true,
          boundWallet: authWallet,
        }),
      ),
      http.get('*/api/v1/explorer/validators', () =>
        HttpResponse.json({ data: [], count: 4 }),
      ),
      http.post('*/api/v1/auth/wallet/nonce', () =>
        HttpResponse.json(
          {
            type: 'urn:bansos:error:WALLET_UNAUTHORIZED',
            title: 'Wallet tidak valid.',
            status: 403,
            code: 'WALLET_UNAUTHORIZED',
            message:
              'Wallet tidak valid. Alamat ini bukan wallet resmi Kelurahan yang terdaftar pada kontrak pintar.',
            requestId: 'req-wallet-403',
          },
          { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    try {
      const user = userEvent.setup()
      renderForRole(<WalletRegistry />, 'OPERATOR_KELURAHAN', true)

      // Initially verified & active MetaMask account === authorizedWallet -> Sesuai
      await waitFor(() => {
        expect(screen.getByText('Sesuai')).toBeInTheDocument()
      })

      // Switch MetaMask account via accountsChanged -> immediately becomes Tidak sesuai (without reload)
      act(() => {
        for (const fn of listeners.get('accountsChanged') ?? []) {
          fn([strangerWallet])
        }
      })

      await waitFor(() => {
        expect(screen.getByText('Tidak sesuai')).toBeInTheDocument()
        expect(screen.getByText(/Akun MetaMask aktif bukan wallet resmi/i)).toBeInTheDocument()
      })

      // Click "Ikat wallet sesi" with stranger account -> displays specific 403 error message in role="alert"
      await user.click(screen.getByRole('button', { name: /Ikat wallet sesi/i }))
      const alertBox = await screen.findByRole('alert')
      expect(alertBox).toHaveTextContent(
        'Wallet tidak valid. Alamat ini bukan wallet resmi Kelurahan yang terdaftar pada kontrak pintar.',
      )
    } finally {
      ;(window as { ethereum?: unknown }).ethereum = originalEthereum
    }
  })
})
