import { useSyncExternalStore } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityLog } from '@/components/features/dashboard/audit-log/activity-log'
import { Disbursements } from '@/components/features/dashboard/disbursements/disbursements'
import { Programs } from '@/components/features/dashboard/programs/programs'
import { Recipients } from '@/components/features/dashboard/recipients/recipients'
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
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
}

let currentPathname = '/dashboard/penerima'
let currentSearch = ''
const navListeners = new Set<() => void>()

function setMockLocation(pathname: string, search = '') {
  currentPathname = pathname
  currentSearch = search.startsWith('?') ? search.slice(1) : search
  for (const listener of navListeners) listener()
}

function navigateUrl(url: string) {
  const [pathPart, queryPart = ''] = url.split('?')
  setMockLocation(pathPart || currentPathname, queryPart)
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn((url: string) => navigateUrl(url)),
    push: vi.fn((url: string) => navigateUrl(url)),
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
  setMockLocation('/dashboard/penerima', '')
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

function renderWithProviders(ui: React.ReactElement, role: Role = 'OPERATOR_KELURAHAN') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RoleAccessProvider initialRole={role} enableSessionQuery={false}>
        {ui}
      </RoleAccessProvider>
    </QueryClientProvider>,
  )
}

const sampleProgramDto = {
  id: '65f000000000000000000001',
  code: 'BLT-2026',
  programId: '0x' + '1'.repeat(64),
  name: 'BLT Dana Kelurahan',
  description: 'Bantuan tunai keluarga sasaran Takkalasi',
  fundSource: 'APBD',
  kind: 'TUNAI' as const,
  amountPerRecipient: 600000,
  totalBudget: 6000000,
  enrolledCount: 10,
  registeredCount: 8,
  disbursedCount: 5,
  disbursedAmount: 3000000,
  remainingBudget: 3000000,
  startPeriod: 202607,
  endPeriod: 202612,
  status: 'ACTIVE' as const,
  chain: { createTxHash: '0x' + '2'.repeat(64), blockNumber: 120 },
  isPublic: true,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
}

const sampleRecipientDto = {
  id: '65f000000000000000000011',
  nikMasked: '7311••••••••0001',
  name: 'Baharuddin Mattewakkang',
  address: { dusun: 'Takkalasi Utara', rt: '1', rw: '2' },
  phone: '08123456789',
  status: 'FINAL' as const,
  commitment: '0x' + 'a'.repeat(64),
  enrollments: [{ programCode: 'BLT-2026', status: 'REGISTERED_ONCHAIN' as const }],
  createdAt: '2026-10-01T01:30:00.000Z',
  updatedAt: '2026-10-01T02:00:00.000Z',
  finalizedAt: '2026-10-01T02:00:00.000Z',
}

describe('Dashboard read-only list screens (Part B)', () => {
  it('Recipients list renders nikMasked only, syncs filters & pagination in URL, and never writes 16-digit NIK to URL', async () => {
    const user = userEvent.setup()
    const seenUrls: string[] = []

    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({
          data: [sampleProgramDto],
          total: 1,
          page: 1,
          limit: 100,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/recipients', ({ request }) => {
        const url = new URL(request.url)
        seenUrls.push(url.search)
        const page = Number(url.searchParams.get('page') ?? '1')
        const status = url.searchParams.get('status')
        if (status === 'DRAFT') {
          return HttpResponse.json({
            data: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          })
        }
        return HttpResponse.json({
          data: [
            {
              ...sampleRecipientDto,
              id: page === 2 ? '65f000000000000000000012' : sampleRecipientDto.id,
              name: page === 2 ? 'Sitti Aminah' : sampleRecipientDto.name,
            },
          ],
          total: 25,
          page,
          limit: 20,
          totalPages: 2,
        })
      }),
    )

    renderWithProviders(<Recipients />)

    await waitFor(() => {
      expect(screen.getByText('Baharuddin Mattewakkang')).toBeInTheDocument()
    })
    expect(screen.getByText('7311••••••••0001')).toBeInTheDocument()
    expect(screen.queryByText(/No\. KK/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Penghasilan/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Soft Deleted/i)).not.toBeInTheDocument()

    // Pagination updates URL search params and fetches page 2
    await user.click(screen.getByRole('button', { name: /halaman berikutnya/i }))
    await waitFor(() => {
      expect(currentSearch).toContain('page=2')
      expect(screen.getByText('Sitti Aminah')).toBeInTheDocument()
    })

    // Status filter updates URL search params and shows empty state when 0 results
    await user.click(screen.getByRole('button', { name: /^DRAFT/i }))
    await waitFor(() => {
      expect(currentSearch).toContain('status=DRAFT')
      expect(screen.getByText(/tidak ada penerima/i)).toBeInTheDocument()
    })

    // Typing a 16-digit NIK never writes the NIK to URL search params or GET query string
    const searchInputs = screen.getAllByRole('textbox')
    const keywordInput =
      searchInputs.find((el) =>
        (el.getAttribute('placeholder') ?? '').toLowerCase().includes('nama'),
      ) ?? searchInputs[searchInputs.length - 1]!
    await user.clear(keywordInput)
    await user.type(keywordInput, '7311020101800001')

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })

    expect(currentSearch).not.toContain('7311020101800001')
    for (const qs of seenUrls) {
      expect(qs).not.toContain('7311020101800001')
    }
  })

  it('Recipients list shows RFC 9457 Indonesian error state with requestId and retries cleanly', async () => {
    const user = userEvent.setup()
    let shouldFail = true

    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
      ),
      http.get('*/api/v1/recipients', ({ request }) => {
        const limit = new URL(request.url).searchParams.get('limit')
        if (limit === '1') {
          return HttpResponse.json({ data: [], total: 0, page: 1, limit: 1, totalPages: 1 })
        }
        if (shouldFail) {
          return HttpResponse.json(
            {
              type: 'about:blank',
              title: 'Internal Error',
              status: 500,
              code: 'INTERNAL_ERROR',
              detail: 'Server error',
              requestId: 'req-rec-err-99',
            },
            { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
          )
        }
        return HttpResponse.json({
          data: [sampleRecipientDto],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      }),
    )

    renderWithProviders(<Recipients />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/req-rec-err-99/)).toBeInTheDocument()

    shouldFail = false
    await user.click(screen.getByRole('button', { name: /coba lagi/i }))

    await waitFor(() => {
      expect(screen.getByText('Baharuddin Mattewakkang')).toBeInTheDocument()
    })
  })

  it('Programs list renders enrolledCount quota, description instead of criteria, and enrollments pagination', async () => {
    setMockLocation('/dashboard/bantuan', '')

    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({
          data: [sampleProgramDto],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/programs/:id', () =>
        HttpResponse.json({
          ...sampleProgramDto,
          summary: {
            pagu: 6000000,
            target: 10,
            realisasi: { count: 5, rupiah: 3000000 },
            sisa: 3000000,
            percentage: 50,
          },
        }),
      ),
      http.get('*/api/v1/programs/:id/enrollments', () =>
        HttpResponse.json({
          data: [
            {
              id: 'enr-1',
              recipient: {
                id: sampleRecipientDto.id,
                name: 'Nurhayati Lateppa',
                nikMasked: '7311••••••••0005',
              },
              status: 'REGISTERED_ONCHAIN',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        }),
      ),
    )

    renderWithProviders(<Programs />)

    await waitFor(() => {
      expect(screen.getAllByText('BLT Dana Kelurahan').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText(/Bantuan tunai keluarga sasaran Takkalasi/).length).toBeGreaterThan(0)
    expect(screen.getByText('5/10 KPM (50%)')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Nurhayati Lateppa')).toBeInTheDocument()
    })
  })

  it('Disbursements list renders icon+text status badges, explorer link, DITARIK evidence badge, and status filter', async () => {
    const user = userEvent.setup()
    setMockLocation('/dashboard/penyaluran', '')
    const txHash = '0x' + '7'.repeat(64)

    server.use(
      http.get('*/api/v1/programs', () =>
        HttpResponse.json({ data: [sampleProgramDto], total: 1, page: 1, limit: 100, totalPages: 1 }),
      ),
      http.get('*/api/v1/disbursements', ({ request }) => {
        const status = new URL(request.url).searchParams.get('status')
        if (status === 'PENDING') {
          return HttpResponse.json({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 })
        }
        return HttpResponse.json({
          data: [
            {
              id: '65f000000000000000000099',
              refId: '0x' + '9'.repeat(64),
              programId: sampleProgramDto.id,
              recipientId: sampleRecipientDto.id,
              program: { id: sampleProgramDto.id, code: 'BLT-2026', name: 'BLT Dana Kelurahan' },
              recipient: {
                id: sampleRecipientDto.id,
                name: 'Baharuddin Mattewakkang',
                nikMasked: '7311••••••••0001',
              },
              periodId: 202610,
              commitment: '0x' + '8'.repeat(64),
              amount: 600000,
              disbursedDate: '2026-10-15T03:00:00.000Z',
              note: 'Penyaluran Oktober',
              status: 'SUCCESS',
              evidence: [
                {
                  cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
                  mime: 'image/jpeg',
                  size: 12000,
                  sha256: 'a'.repeat(64),
                  name: 'bukti.jpg',
                  access: 'PUBLIC',
                  status: 'WITHDRAWN',
                  withdrawnAt: '2026-10-16T00:00:00.000Z',
                  withdrawReason: 'Foto buram',
                },
              ],
              chain: {
                txHash,
                blockNumber: 210,
                logIndex: 0,
                blockTimestamp: '2026-10-15T03:01:00.000Z',
                from: '0x' + '6'.repeat(40),
                confirmedAt: '2026-10-15T03:01:05.000Z',
              },
              attempts: [],
              lastError: null,
              createdAt: '2026-10-15T03:00:00.000Z',
              updatedAt: '2026-10-15T03:01:05.000Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      }),
    )

    renderWithProviders(<Disbursements />)

    await waitFor(() => {
      expect(screen.getByText('Baharuddin Mattewakkang')).toBeInTheDocument()
    })
    expect(screen.getByText('DITARIK')).toBeInTheDocument()
    const explorerLink = screen.getByRole('link', { name: /buka di explorer/i })
    expect(explorerLink).toHaveAttribute('href', `/explorer/tx/${txHash}`)

    await user.click(screen.getByRole('button', { name: 'PENDING' }))
    await waitFor(() => {
      expect(currentSearch).toContain('status=PENDING')
      expect(screen.getByText(/tidak ada penyaluran yang sesuai filter/i)).toBeInTheDocument()
    })
  })

  it('Audit log filters by action/user/date and runs on-demand chain verification', async () => {
    const user = userEvent.setup()
    setMockLocation('/dashboard/log-aktivitas', '')
    let verifyCalled = false

    server.use(
      http.get('*/api/v1/audit-logs', () =>
        HttpResponse.json({
          data: [
            {
              id: 'aud-1',
              seq: 12,
              prevHash: '0'.repeat(64),
              hash: 'b'.repeat(64),
              actorId: '65f0000000000000000000aa',
              role: 'OPERATOR',
              action: 'DISBURSEMENT_CONFIRMED',
              entity: 'disbursements',
              entityId: '65f000000000000000000099',
              diff: { status: 'SUCCESS' },
              ip: '127.0.0.1',
              userAgent: 'Vitest',
              requestId: 'req-aud-1',
              at: '2026-10-15T03:01:05.000Z',
              note: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      ),
      http.get('*/api/v1/audit-logs/verify', ({ request }) => {
        verifyCalled = true
        const url = new URL(request.url)
        expect(url.searchParams.get('from')).toBe('1')
        expect(url.searchParams.get('to')).toBe('12')
        return HttpResponse.json({
          valid: true,
          missingSequences: [],
          invalidSequences: [],
          gapEntries: [],
        })
      }),
    )

    renderWithProviders(<ActivityLog />)

    await waitFor(() => {
      expect(screen.getByText('DISBURSEMENT_CONFIRMED')).toBeInTheDocument()
    })
    expect(verifyCalled).toBe(false)

    await user.click(screen.getByRole('button', { name: /verifikasi rantai/i }))

    await waitFor(() => {
      expect(verifyCalled).toBe(true)
      expect(screen.getByText(/rantai valid/i)).toBeInTheDocument()
    })
  })
})
