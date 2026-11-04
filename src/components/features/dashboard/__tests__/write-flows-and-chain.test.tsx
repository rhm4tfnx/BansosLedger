import { useSyncExternalStore } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DisbursementWizard } from '@/components/features/dashboard/disbursements/disbursement-wizard'
import { Programs } from '@/components/features/dashboard/programs/programs'
import { Recipients } from '@/components/features/dashboard/recipients/recipients'
import { WalletGate } from '@/components/shared/wallet-gate'
import { RoleAccessProvider } from '@/hooks/use-role-access'
import { useUiEventsStore } from '@/lib/api'
import { useWalletStore } from '@/lib/wallet/store'
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
  URL.createObjectURL = vi.fn(() => 'blob:mock-preview')
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

const MOCK_WALLET_ADDRESS = '0x1111111111111111111111111111111111111111'
const MOCK_TX_HASH = '0x' + 'a'.repeat(64)

function installMockEthereum(options?: {
  accounts?: string[]
  chainIdHex?: string
  txHash?: string
}) {
  const accounts = options?.accounts ?? [MOCK_WALLET_ADDRESS]
  const chainIdHex = options?.chainIdHex ?? '0x539'
  const txHash = options?.txHash ?? MOCK_TX_HASH

  const provider = {
    isMetaMask: true,
    request: vi.fn(async ({ method }: { method: string; params?: unknown[] }) => {
      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return accounts
        case 'eth_chainId':
          return chainIdHex
        case 'eth_sendTransaction':
          return txHash
        case 'personal_sign':
          return '0x' + 'b'.repeat(130)
        case 'eth_estimateGas':
          return '0x5208'
        case 'eth_gasPrice':
        case 'eth_maxPriorityFeePerGas':
          return '0x0'
        case 'eth_blockNumber':
        case 'eth_getTransactionCount':
          return '0x1'
        case 'net_version':
          return '1337'
        default:
          return '0x0'
      }
    }),
    on: vi.fn(),
    removeListener: vi.fn(),
  }

  Object.defineProperty(window, 'ethereum', {
    configurable: true,
    writable: true,
    value: provider,
  })
  return provider
}

const server = setupServer()

beforeAll(() => {
  server.listen()
})

beforeEach(() => {
  process.env.NEXT_PUBLIC_CHAIN_ID = '1337'
  setMockLocation('/dashboard', '')
  useUiEventsStore.getState().resetUiEvents()
  useWalletStore.getState().resetWalletStore()
  installMockEthereum()
})

afterEach(() => {
  server.resetHandlers()
  useUiEventsStore.getState().resetUiEvents()
  useWalletStore.getState().resetWalletStore()
  vi.useRealTimers()
})

afterAll(() => {
  server.close()
})

function renderWithProviders(
  ui: React.ReactElement,
  role: Role = 'OPERATOR_KELURAHAN',
  enableSessionQuery = false,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RoleAccessProvider initialRole={role} enableSessionQuery={enableSessionQuery}>
        {ui}
      </RoleAccessProvider>
    </QueryClientProvider>,
  )
  return { ...view, queryClient }
}

describe('Part C — Write flows and chain transactions', () => {
  it('C.1 Recipients: creates DRAFT, requires double confirmation to finalize, reveals NIK for 30s without caching in queryClient, and shows Retry-After on 429', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    let recipientStatus: 'DRAFT' | 'FINAL' = 'DRAFT'
    let revealCount = 0

    const makeRecipientDto = () => ({
      id: '65f000000000000000000011',
      nikMasked: '7311••••••••0001',
      name: 'Siti Rahmawati',
      address: { dusun: 'Kampung Baru', rt: '001', rw: '002' },
      phone: '081234567890',
      status: recipientStatus,
      commitment: recipientStatus === 'FINAL' ? '0x' + 'c'.repeat(64) : null,
      enrollments: [],
      createdAt: '2026-10-01T01:30:00.000Z',
      updatedAt: '2026-10-01T02:00:00.000Z',
      finalizedAt: recipientStatus === 'FINAL' ? '2026-10-02T02:00:00.000Z' : null,
    })

    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
      ),
      http.get('*/api/v1/recipients', () =>
        HttpResponse.json({
          data: [makeRecipientDto()],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      ),
      http.post('*/api/v1/recipients', () =>
        HttpResponse.json(makeRecipientDto(), { status: 201 }),
      ),
      http.post('*/api/v1/recipients/65f000000000000000000011/finalize', () => {
        recipientStatus = 'FINAL'
        return HttpResponse.json(makeRecipientDto())
      }),
      http.post('*/api/v1/recipients/65f000000000000000000011/reveal-nik', () => {
        revealCount += 1
        if (revealCount > 1) {
          return HttpResponse.json(
            {
              type: 'about:blank',
              title: 'Too Many Requests',
              status: 429,
              code: 'NIK_REVEAL_LIMIT_EXCEEDED',
              detail: 'Batas pembukaan NIK tercapai.',
              requestId: 'req-429',
            },
            { status: 429, headers: { 'Retry-After': '45' } },
          )
        }
        return HttpResponse.json({ nik: '7311041505880001' })
      }),
    )

    const { queryClient } = renderWithProviders(<Recipients />, 'OPERATOR_KELURAHAN')

    await waitFor(() => {
      expect(screen.getByText('Siti Rahmawati')).toBeInTheDocument()
    })

    // 1. Create recipient form opens and validates/submits
    await user.click(screen.getByRole('button', { name: /tambah penerima/i }))
    expect(screen.getByRole('dialog', { name: /tambah penerima bantuan baru/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/nama lengkap sesuai ktp/i), 'Siti Rahmawati')
    await user.type(screen.getByLabelText(/nomor induk kependudukan/i), '7311041505880001')
    await user.click(screen.getByRole('button', { name: /simpan sebagai draft/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /tambah penerima bantuan baru/i })).not.toBeInTheDocument()
    })

    // 2. Reveal NIK shows decrypted NIK for 30s and never caches it in queryClient
    await user.click(screen.getByRole('button', { name: /buka nik siti rahmawati/i }))
    await waitFor(() => {
      expect(screen.getByText('7311041505880001')).toBeInTheDocument()
    })
    const cachedSnapshot = JSON.stringify(queryClient.getQueryCache().getAll().map((q) => q.state.data))
    expect(cachedSnapshot).not.toContain('7311041505880001')

    // Advance 30 seconds -> auto-masks back to 7311••••••••0001
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_500)
    })
    await waitFor(() => {
      expect(screen.queryByText('7311041505880001')).not.toBeInTheDocument()
      expect(screen.getByText('7311••••••••0001')).toBeInTheDocument()
    })

    // Second reveal returns 429 with Retry-After: 45
    await user.click(screen.getByRole('button', { name: /buka nik siti rahmawati/i }))
    await waitFor(() => {
      expect(screen.getByText(/coba lagi dalam 45 detik/i)).toBeInTheDocument()
    })

    // 3. Finalize requires double confirmation ("tidak dapat diubah lagi")
    await user.click(screen.getByRole('button', { name: /kunci final/i }))
    expect(screen.getByText(/tahap 1 dari 2/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /lanjut ke konfirmasi akhir/i }))
    expect(screen.getAllByText(/tidak dapat diubah lagi/i).length).toBeGreaterThan(0)

    const confirmFinalBtn = screen.getByRole('button', { name: /kunci final permanen/i })
    expect(confirmFinalBtn).toBeDisabled()
    await user.click(screen.getByRole('checkbox'))
    expect(confirmFinalBtn).not.toBeDisabled()
    await user.click(confirmFinalBtn)

    await waitFor(() => {
      expect(screen.getByText(/terkunci permanen/i)).toBeInTheDocument()
    })
  })

  it('C.2 Programs: executes on-chain activation pipeline (intent -> WalletGate -> sendIntent -> chain-confirm PENDING -> CONFIRMED)', async () => {
    const user = userEvent.setup()

    let confirmCalls = 0
    let shouldConfirm = false
    let programStatus: 'DRAFT' | 'ACTIVE' = 'DRAFT'

    const makeProgramDto = () => ({
      id: '65f000000000000000000001',
      code: 'BLT-2026',
      programId: '0x' + '1'.repeat(64),
      name: 'BLT Kelurahan Tahap I',
      description: 'Bantuan langsung tunai',
      fundSource: 'APBD Barru',
      kind: 'TUNAI' as const,
      amountPerRecipient: 600000,
      totalBudget: 6000000,
      startPeriod: 202601,
      endPeriod: 202603,
      status: programStatus,
      isPublic: true,
      enrolledCount: 5,
      registeredCount: 5,
      disbursedCount: 0,
      disbursedAmount: 0,
      remainingBudget: 6000000,
      chain: programStatus === 'ACTIVE' ? { createTxHash: MOCK_TX_HASH, blockNumber: 101 } : null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    })

    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 'u-1',
          name: 'Operator Takkalasi',
          institution: 'Kelurahan Takkalasi',
          email: 'operator@barru.go.id',
          role: 'OPERATOR',
          mustChangePassword: false,
          walletVerified: true,
          boundWalletAddress: MOCK_WALLET_ADDRESS,
          expiresAt: 1790000000000,
        }),
      ),
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({
          data: [makeProgramDto()],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/programs/65f000000000000000000001', () =>
        HttpResponse.json({
          ...makeProgramDto(),
          summary: {
            pagu: 6000000,
            target: 5,
            realisasi: { count: 0, rupiah: 0 },
            sisa: 6000000,
            percentage: 0,
          },
        }),
      ),
      http.get('*/api/v1/programs/65f000000000000000000001/enrollments', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 }),
      ),
      http.post('*/api/v1/programs/65f000000000000000000001/activate-intent', () =>
        HttpResponse.json({
          to: '0x2222222222222222222222222222222222222222',
          chainId: 1337,
          data: '0x12345678',
        }),
      ),
      http.post('*/api/v1/programs/65f000000000000000000001/chain-confirm', () => {
        confirmCalls += 1
        if (!shouldConfirm) {
          return HttpResponse.json({ status: 'PENDING' }, { status: 202 })
        }
        programStatus = 'ACTIVE'
        return HttpResponse.json(makeProgramDto())
      }),
    )

    renderWithProviders(<Programs />, 'OPERATOR_KELURAHAN', true)

    await waitFor(() => {
      expect(screen.getAllByText('BLT Kelurahan Tahap I').length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('button', { name: /aktivasi \(createprogram\)/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tanda tangani & aktivasi program/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /tanda tangani & aktivasi program/i }))

    // First confirm call returns PENDING -> shows "Menunggu blok"
    await waitFor(() => {
      expect(screen.getByText(/menunggu blok/i)).toBeInTheDocument()
    })

    // Allow next confirmation check to settle as CONFIRMED
    shouldConfirm = true
    await user.click(screen.getByRole('button', { name: /periksa ulang/i }))

    await waitFor(() => {
      expect(screen.getByText(/transaksi on-chain terkonfirmasi/i)).toBeInTheDocument()
    })
    expect(confirmCalls).toBeGreaterThanOrEqual(2)
  })

  it('C.3 Disbursement Wizard: completes full 7-step happy path, prevents double-click duplicate creation with Idempotency-Key, and supports FAILED -> retry', async () => {
    const user = userEvent.setup()

    const idempotencyKeysReceived: string[] = []
    let createCalls = 0
    let confirmAttempt = 0

    const programDto = {
      id: '65f000000000000000000001',
      code: 'BLT-2026',
      programId: '0x' + '1'.repeat(64),
      name: 'BLT Kelurahan Tahap I',
      description: 'Bantuan langsung tunai',
      fundSource: 'APBD Barru',
      kind: 'TUNAI' as const,
      amountPerRecipient: 600000,
      totalBudget: 6000000,
      startPeriod: 202601,
      endPeriod: 202603,
      status: 'ACTIVE' as const,
      isPublic: true,
      enrolledCount: 5,
      registeredCount: 5,
      disbursedCount: 0,
      disbursedAmount: 0,
      remainingBudget: 6000000,
      chain: { createTxHash: MOCK_TX_HASH, blockNumber: 100 },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    }

    const baseDisbursementDto = {
      id: '65f000000000000000000099',
      refId: '0x' + '9'.repeat(64),
      programId: '65f000000000000000000001',
      recipientId: '65f000000000000000000011',
      program: { id: '65f000000000000000000001', code: 'BLT-2026', name: 'BLT Kelurahan Tahap I' },
      recipient: { id: '65f000000000000000000011', name: 'Baharuddin', nikMasked: '7311••••••••0001' },
      periodId: 202601,
      commitment: '0x' + '8'.repeat(64),
      amount: 600000,
      disbursedDate: '2026-10-15T00:00:00.000Z',
      note: '',
      status: 'DRAFT' as const,
      evidence: [],
      chain: null,
      attempts: [],
      lastError: null,
      createdAt: '2026-10-15T03:00:00.000Z',
      updatedAt: '2026-10-15T03:00:00.000Z',
    }

    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({
          id: 'u-1',
          name: 'Operator Takkalasi',
          institution: 'Kelurahan Takkalasi',
          email: 'operator@barru.go.id',
          role: 'OPERATOR',
          mustChangePassword: false,
          walletVerified: true,
          boundWalletAddress: MOCK_WALLET_ADDRESS,
          expiresAt: 1790000000000,
        }),
      ),
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({
          data: [programDto],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/programs/65f000000000000000000001/enrollments', () =>
        HttpResponse.json({
          data: [
            {
              id: '65f000000000000000000055',
              recipient: {
                id: '65f000000000000000000011',
                name: 'Baharuddin',
                nikMasked: '7311••••••••0001',
              },
              status: 'REGISTERED_ONCHAIN',
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        }),
      ),
      http.post('*/api/v1/disbursements/preflight', () =>
        HttpResponse.json({
          ok: true,
          checks: [
            { key: 'program_active', label: 'Program aktif', ok: true },
            { key: 'period_in_range', label: 'Periode dalam rentang program', ok: true },
            { key: 'recipient_registered', label: 'Penerima terdaftar on-chain', ok: true },
            { key: 'no_duplicate', label: 'Duplikasi periode', ok: true },
            { key: 'amount_matches_program', label: 'Kesesuaian nominal', ok: true },
            { key: 'recipient_final_commitment', label: 'Status FINAL & commitment penerima', ok: true },
            { key: 'authorized_wallet', label: 'Kewenangan wallet Kelurahan', ok: true },
          ],
        }),
      ),
      http.post('*/api/v1/disbursements', async ({ request }) => {
        createCalls += 1
        const key = request.headers.get('idempotency-key') ?? ''
        idempotencyKeysReceived.push(key)
        return HttpResponse.json(
          {
            ...baseDisbursementDto,
            preview: {
              refId: baseDisbursementDto.refId,
              programId: programDto.programId,
              periodId: 202601,
              commitment: baseDisbursementDto.commitment,
              amount: 600000,
            },
          },
          { status: 201 },
        )
      }),
      http.post('*/api/v1/disbursements/65f000000000000000000099/evidence', () =>
        HttpResponse.json(
          {
            data: [
              {
                cid: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy',
                name: 'bukti.jpg',
                mime: 'image/jpeg',
                size: 1024,
                sha256: 'a'.repeat(64),
                access: 'PUBLIC',
                status: 'ACTIVE',
                withdrawnAt: null,
                withdrawReason: null,
              },
            ],
          },
          { status: 201 },
        ),
      ),
      http.post('*/api/v1/disbursements/65f000000000000000000099/tx-intent', () =>
        HttpResponse.json({
          to: '0x2222222222222222222222222222222222222222',
          data: '0xabcdef01',
          chainId: 1337,
          evidenceCid: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy',
        }),
      ),
      http.patch('*/api/v1/disbursements/65f000000000000000000099/tx-submitted', () =>
        HttpResponse.json({
          ...baseDisbursementDto,
          status: 'PENDING',
          chain: {
            txHash: MOCK_TX_HASH,
            blockNumber: null,
            logIndex: null,
            blockTimestamp: null,
            from: MOCK_WALLET_ADDRESS,
            confirmedAt: null,
          },
        }),
      ),
      http.post('*/api/v1/disbursements/65f000000000000000000099/confirm', () => {
        confirmAttempt += 1
        if (confirmAttempt === 1) {
          return HttpResponse.json({
            ...baseDisbursementDto,
            status: 'FAILED',
            lastError: 'AlreadyDisbursed',
            errorCode: 'AlreadyDisbursed',
            message: 'Penerima sudah menerima penyaluran pada periode ini.',
          })
        }
        return HttpResponse.json({
          ...baseDisbursementDto,
          status: 'SUCCESS',
          chain: {
            txHash: MOCK_TX_HASH,
            blockNumber: 555,
            logIndex: 0,
            blockTimestamp: '2026-10-15T03:01:00.000Z',
            from: MOCK_WALLET_ADDRESS,
            confirmedAt: '2026-10-15T03:01:02.000Z',
          },
        })
      }),
      http.post('*/api/v1/disbursements/65f000000000000000000099/retry', () =>
        HttpResponse.json({
          ...baseDisbursementDto,
          status: 'DRAFT',
          evidence: [
            {
              cid: 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy',
              name: 'bukti.jpg',
              mime: 'image/jpeg',
              size: 1024,
              sha256: 'a'.repeat(64),
              access: 'PUBLIC',
              status: 'ACTIVE',
              withdrawnAt: null,
              withdrawReason: null,
            },
          ],
        }),
      ),
    )

    const onClose = vi.fn()
    renderWithProviders(<DisbursementWizard onClose={onClose} />, 'OPERATOR_KELURAHAN', true)

    // Step 1: Program & Period
    await waitFor(() => {
      expect(screen.getByText('BLT Kelurahan Tahap I')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /lanjut ke langkah 2/i }))

    // Step 2: Select REGISTERED_ONCHAIN recipient
    await waitFor(() => {
      expect(screen.getByText('Baharuddin')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Baharuddin'))
    await user.click(screen.getByRole('button', { name: /lanjut ke langkah 3/i }))

    // Step 3: Read-only amount
    const amountInput = screen.getByLabelText(/nominal bantuan/i)
    expect(amountInput).toHaveAttribute('readonly')
    expect(amountInput).toHaveValue('Rp 600.000')
    await user.click(screen.getByRole('button', { name: /lanjut ke langkah 4/i }))

    // Step 4: Preflight 7/7 checks
    await waitFor(() => {
      expect(screen.getByText(/7\/7 aturan lolos/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /lanjut ke langkah 5/i }))

    // Step 5a: Double-click Save DRAFT -> inFlight ref lock ensures single POST with UUID Idempotency-Key
    const saveDraftBtn = screen.getByRole('button', { name: /simpan data draft/i })
    fireEvent.click(saveDraftBtn)
    fireEvent.click(saveDraftBtn)

    await waitFor(() => {
      expect(createCalls).toBe(1)
    })
    expect(idempotencyKeysReceived[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )

    // Step 5b: Upload JPEG with valid magic bytes (FF D8 FF E0)
    const validJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    const jpegFile = new File([validJpegBytes], 'bukti.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByLabelText(/pilih berkas bukti/i)
    await user.upload(fileInput, jpegFile)

    await waitFor(() => {
      expect(screen.getAllByText(/bukti\.jpg/i).length).toBeGreaterThan(0)
    })
    const checkboxes = screen.getAllByRole('checkbox')
    for (const cb of checkboxes) {
      await user.click(cb)
    }

    await user.click(screen.getByRole('button', { name: /unggah bukti ke ipfs/i }))
    await waitFor(() => {
      expect(screen.getByText(/1 berkas bukti berhasil diunggah/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /lanjut ke langkah 6/i }))

    // Step 6: Summary confirmation + sign
    expect(screen.getByText(/konfirmasi ringkasan & tanda tangan wallet/i)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /tanda tangani & kirim ke blockchain/i }))

    // First confirm returns FAILED -> shows error and "Coba lagi" button
    await waitFor(() => {
      expect(screen.getByText(/penerima sudah menerima penyaluran pada periode ini/i)).toBeInTheDocument()
    })
    const retryBtn = screen.getByRole('button', { name: /coba lagi/i })
    await user.click(retryBtn)

    // Back at Step 6 after retry -> confirm summary and sign again -> settles as SUCCESS
    await waitFor(() => {
      expect(screen.getByText(/konfirmasi ringkasan & tanda tangan wallet/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /tanda tangani & kirim ke blockchain/i }))

    await waitFor(() => {
      expect(screen.getByText(/penyaluran telah terkonfirmasi di blok #555/i)).toBeInTheDocument()
    })
  })

  it('C.5 WalletGate states: renders network stopped, unavailable, disconnected, wrong-chain, wrong-account, and ready with keyboard reachability', async () => {
    // 1. Network stopped
    const stoppedView = renderWithProviders(
      <WalletGate networkStatus="Berhenti" enableSessionQuery={false}>
        <button type="button">Aksi On-Chain</button>
      </WalletGate>,
    )
    expect(screen.getByText(/jaringan blockchain sedang berhenti/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /aksi on-chain/i })).not.toBeInTheDocument()
    stoppedView.unmount()

    // 2. MetaMask unavailable
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    const unavailableView = renderWithProviders(
      <WalletGate enableSessionQuery={false}>
        <button type="button">Aksi On-Chain</button>
      </WalletGate>,
    )
    await waitFor(() => {
      expect(screen.getByText(/metamask tidak terdeteksi/i)).toBeInTheDocument()
    })
    unavailableView.unmount()

    // 3. Disconnected
    installMockEthereum({ accounts: [] })
    const disconnectedView = renderWithProviders(
      <WalletGate enableSessionQuery={false}>
        <button type="button">Aksi On-Chain</button>
      </WalletGate>,
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hubungkan metamask/i })).toBeInTheDocument()
    })
    disconnectedView.unmount()

    // 4. Wrong chain
    installMockEthereum({ accounts: [MOCK_WALLET_ADDRESS], chainIdHex: '0x1' })
    const wrongChainView = renderWithProviders(
      <WalletGate enableSessionQuery={false}>
        <button type="button">Aksi On-Chain</button>
      </WalletGate>,
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pindah ke jaringan besu/i })).toBeInTheDocument()
    })
    wrongChainView.unmount()

    // 5. Wrong account
    installMockEthereum({ accounts: [MOCK_WALLET_ADDRESS], chainIdHex: '0x539' })
    const wrongAccountView = renderWithProviders(
      <WalletGate
        boundWalletAddress="0x9999999999999999999999999999999999999999"
        enableSessionQuery={false}
      >
        <button type="button">Aksi On-Chain</button>
      </WalletGate>,
    )
    await waitFor(() => {
      expect(screen.getByText(/akun metamask tidak sesuai/i)).toBeInTheDocument()
    })
    wrongAccountView.unmount()

    // 6. Ready + keyboard reachable
    installMockEthereum({ accounts: [MOCK_WALLET_ADDRESS], chainIdHex: '0x539' })
    const user = userEvent.setup()
    const onAction = vi.fn()
    renderWithProviders(
      <WalletGate boundWalletAddress={MOCK_WALLET_ADDRESS} enableSessionQuery={false}>
        <button type="button" onClick={onAction}>
          Aksi On-Chain
        </button>
      </WalletGate>,
    )
    const actionBtn = await screen.findByRole('button', { name: /aksi on-chain/i })
    await user.tab()
    expect(actionBtn).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
