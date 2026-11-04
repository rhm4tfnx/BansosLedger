import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CekBansos } from '@/components/features/cek-bansos/cek-bansos'
import { BlockExplorer } from '@/components/features/explorer/block-explorer'
import { TransactionDetails } from '@/components/features/explorer/transaction-details'

const pushMock = vi.fn()
const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: vi.fn(),
  }),
  usePathname: () => '/explorer',
  useSearchParams: () => new URLSearchParams(),
}))

const VALID_NIK = '7311011508900001'
const SAMPLE_TX_HASH = `0x${'ab'.repeat(32)}`
const SAMPLE_ADDRESS = `0x${'12'.repeat(20)}`
const SAMPLE_COMMITMENT = `0x${'cd'.repeat(32)}`
const SAMPLE_PROGRAM_ID = `0x${'ef'.repeat(32)}`
const SAMPLE_REF_ID = `0x${'99'.repeat(32)}`

const requestedUrls: string[] = []

const server = setupServer(
  http.get('*/api/v1/explorer/blocks', () => {
    return HttpResponse.json({
      data: [
        {
          number: 120,
          hash: `0x${'11'.repeat(32)}`,
          parentHash: `0x${'00'.repeat(32)}`,
          timestamp: 1730690000,
          proposer: SAMPLE_ADDRESS,
          transactionCount: 2,
        },
      ],
      page: 1,
      limit: 10,
      total: 1,
    })
  }),
  http.get('*/api/v1/network/status', () => {
    return HttpResponse.json({
      status: 'ONLINE',
      latestBlock: 120,
      timestamp: 1730690000,
      ageSeconds: 2,
      validatorCount: 4,
    })
  }),
  http.get('*/api/v1/explorer/validators', () => {
    return HttpResponse.json({
      data: [{ address: SAMPLE_ADDRESS, institution: 'Kelurahan Takkalasi' }],
      count: 4,
    })
  }),
)

beforeAll(() => {
  server.listen()
  server.events.on('request:start', ({ request }) => {
    requestedUrls.push(request.url)
  })
})

beforeEach(() => {
  requestedUrls.length = 0
  pushMock.mockReset()
  replaceMock.mockReset()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  })
}

describe('FRONTEND INTEGRATION D — Public Cek Status & Explorer', () => {
  it('Cek Status (found): renders recipient name, typed NIK, entries, explorer link, screenshot warning, and never puts NIK in URL or storage', async () => {
    let capturedBody: unknown = null
    server.use(
      http.post('*/api/v1/public/status-check', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({
          found: true,
          name: 'Siti Aminah',
          entries: [
            {
              program: { code: 'BLTK-2026', name: 'BLT-K Kelurahan' },
              period: 202610,
              status: 'SUDAH_DISALURKAN',
              txHash: SAMPLE_TX_HASH,
            },
          ],
        })
      }),
    )

    const queryClient = createTestQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <CekBansos />
      </QueryClientProvider>,
    )

    const nikInput = screen.getByLabelText(/Nomor Induk Kependudukan \(NIK\)/i)
    await user.type(nikInput, VALID_NIK)

    const captchaCheckbox = screen.getByRole('checkbox', { name: /Saya bukan robot/i })
    await user.click(captchaCheckbox)

    const submitButton = screen.getByRole('button', { name: /Cek Status/i })
    await user.click(submitButton)

    expect(await screen.findByText('Siti Aminah')).toBeInTheDocument()
    expect(screen.getByText(VALID_NIK)).toBeInTheDocument()
    expect(screen.getByText('BLT-K Kelurahan')).toBeInTheDocument()
    expect(screen.getByText('Oktober 2026')).toBeInTheDocument()
    expect(screen.getByText('Sudah disalurkan')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Jangan bagikan tangkapan layar halaman ini karena memuat NIK dan nama lengkap/i,
      ),
    ).toBeInTheDocument()

    const explorerLink = screen.getByRole('link', { name: /Lihat di Explorer/i })
    expect(explorerLink).toHaveAttribute('href', `/explorer/tx/${SAMPLE_TX_HASH}`)

    expect(capturedBody).toEqual({
      nik: VALID_NIK,
      turnstileToken: 'demo',
    })

    // Privacy assertions: NIK never in any request URL, window.location, storage, or query cache
    for (const url of requestedUrls) {
      expect(url).not.toContain(VALID_NIK)
    }
    expect(window.location.href).not.toContain(VALID_NIK)
    expect(JSON.stringify(window.localStorage)).not.toContain(VALID_NIK)
    expect(JSON.stringify(window.sessionStorage)).not.toContain(VALID_NIK)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('Cek Status (not found, 429 rate limit, CAPTCHA invalid, and 503): maps errors with Retry-After and requestId', async () => {
    const queryClient = createTestQueryClient()
    const user = userEvent.setup()

    // 1. Not found
    server.use(
      http.post('*/api/v1/public/status-check', () => {
        return HttpResponse.json({ found: false })
      }),
    )

    render(
      <QueryClientProvider client={queryClient}>
        <CekBansos />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText(/Nomor Induk Kependudukan \(NIK\)/i), VALID_NIK)
    await user.click(screen.getByRole('checkbox', { name: /Saya bukan robot/i }))
    await user.click(screen.getByRole('button', { name: /Cek Status/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Data tidak ditemukan.')

    // 2. 429 with Retry-After
    server.use(
      http.post('*/api/v1/public/status-check', () => {
        return HttpResponse.json(
          {
            type: 'https://bansosledger.local/problems/RATE_LIMIT',
            title: 'Too Many Requests',
            status: 429,
            code: 'RATE_LIMIT',
            message: 'Terlalu banyak permintaan.',
            requestId: 'req-rate-429',
          },
          {
            status: 429,
            headers: {
              'Content-Type': 'application/problem+json',
              'Retry-After': '45',
            },
          },
        )
      }),
    )

    await user.click(screen.getByRole('button', { name: /Cek Status/i }))
    const rateAlert = await screen.findByRole('alert')
    expect(rateAlert).toHaveTextContent(/Coba lagi dalam 45 detik/i)
    expect(rateAlert).toHaveTextContent('req-rate-429')

    // 3. 400 CAPTCHA_INVALID
    server.use(
      http.post('*/api/v1/public/status-check', () => {
        return HttpResponse.json(
          {
            type: 'https://bansosledger.local/problems/CAPTCHA_INVALID',
            title: 'Bad Request',
            status: 400,
            code: 'CAPTCHA_INVALID',
            message: 'Verifikasi keamanan tidak valid.',
            requestId: 'req-captcha-400',
          },
          {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        )
      }),
    )

    await user.click(screen.getByRole('button', { name: /Cek Status/i }))
    const captchaAlert = await screen.findByRole('alert')
    expect(captchaAlert).toHaveTextContent(/CAPTCHA/i)
    expect(captchaAlert).toHaveTextContent('req-captcha-400')

    // 4. 503 service unavailable
    server.use(
      http.post('*/api/v1/public/status-check', () => {
        return HttpResponse.json(
          {
            type: 'https://bansosledger.local/problems/TURNSTILE_UNAVAILABLE',
            title: 'Service Unavailable',
            status: 503,
            code: 'TURNSTILE_UNAVAILABLE',
            message: 'Layanan verifikasi tidak tersedia.',
            requestId: 'req-503',
          },
          {
            status: 503,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        )
      }),
    )

    await user.click(screen.getByRole('button', { name: /Cek Status/i }))
    const unavailableAlert = await screen.findByRole('alert')
    expect(unavailableAlert).toHaveTextContent('req-503')
  })

  it('Explorer search routing: routes block, txHash, address, and commitment/refId, and rejects 16-digit NIK on client', async () => {
    server.use(
      http.get('*/api/v1/explorer/search', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q')
        if (q === '120') {
          return HttpResponse.json({
            number: 120,
            hash: `0x${'11'.repeat(32)}`,
            parentHash: `0x${'00'.repeat(32)}`,
            timestamp: 1730690000,
            proposer: SAMPLE_ADDRESS,
            transactionCount: 2,
          })
        }
        if (q === SAMPLE_TX_HASH) {
          return HttpResponse.json({
            txHash: SAMPLE_TX_HASH,
            from: SAMPLE_ADDRESS,
            to: `0x${'99'.repeat(20)}`,
            blockNumber: 120,
            status: 'SUCCESS',
            utc: '2026-11-04T03:13:20.000Z',
            events: [],
          })
        }
        if (q === SAMPLE_ADDRESS) {
          return HttpResponse.json({
            address: SAMPLE_ADDRESS,
            data: [],
            total: 0,
            page: 1,
            limit: 20,
          })
        }
        if (q === SAMPLE_COMMITMENT) {
          return HttpResponse.json({
            data: [
              {
                txHash: SAMPLE_TX_HASH,
                refId: SAMPLE_REF_ID,
                programId: SAMPLE_PROGRAM_ID,
                period: 202610,
                amount: '600000',
                commitment: SAMPLE_COMMITMENT,
                cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
                gatewayUrl:
                  'https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
                recordedBy: SAMPLE_ADDRESS,
                utc: '2026-11-04T03:13:20.000Z',
                wita: '4 November 2026 11.13.20 WITA',
              },
            ],
            limit: 100,
          })
        }
        return HttpResponse.json(
          {
            type: 'https://bansosledger.local/problems/NOT_FOUND',
            title: 'Not Found',
            status: 404,
            code: 'NOT_FOUND',
            message: 'Data tidak ditemukan.',
            requestId: 'req-exp-404',
          },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        )
      }),
    )

    const queryClient = createTestQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BlockExplorer />
      </QueryClientProvider>,
    )

    const searchInput = screen.getByLabelText(/Cari TxHash, nomor blok, alamat/i)
    const searchBtn = screen.getByRole('button', { name: /Cari di explorer/i })

    // 1. Reject 16-digit NIK without calling API
    await user.clear(searchInput)
    await user.type(searchInput, VALID_NIK)
    await user.click(searchBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /NIK tidak pernah ditampilkan atau dicari di Block Explorer/i,
    )
    expect(requestedUrls.some((u) => u.includes(VALID_NIK))).toBe(false)

    // 2. Block number -> /explorer/block/120
    await user.clear(searchInput)
    await user.type(searchInput, '120')
    await user.click(searchBtn)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/explorer/block/120')
    })

    // 3. TxHash -> /explorer/tx/0x...
    pushMock.mockReset()
    await user.clear(searchInput)
    await user.type(searchInput, SAMPLE_TX_HASH)
    await user.click(searchBtn)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(`/explorer/tx/${SAMPLE_TX_HASH}`)
    })

    // 4. Address -> /explorer/address/0x...
    pushMock.mockReset()
    await user.clear(searchInput)
    await user.type(searchInput, SAMPLE_ADDRESS)
    await user.click(searchBtn)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(`/explorer/address/${SAMPLE_ADDRESS}`)
    })

    // 5. Commitment / refId -> /explorer/tx/0x...
    pushMock.mockReset()
    await user.clear(searchInput)
    await user.type(searchInput, SAMPLE_COMMITMENT)
    await user.click(searchBtn)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(`/explorer/tx/${SAMPLE_TX_HASH}`)
    })
  })

  it('Explorer TransactionDetails & CHAIN_NOT_CONFIGURED: renders decoded event with DITARIK badge and handles CHAIN_NOT_CONFIGURED banner', async () => {
    server.use(
      http.get(`*/api/v1/explorer/tx/${SAMPLE_TX_HASH}`, () => {
        return HttpResponse.json({
          txHash: SAMPLE_TX_HASH,
          from: SAMPLE_ADDRESS,
          to: `0x${'99'.repeat(20)}`,
          blockNumber: 120,
          status: 'SUCCESS',
          utc: '2026-11-04T03:13:20.000Z',
          events: [
            {
              refId: SAMPLE_REF_ID,
              programId: SAMPLE_PROGRAM_ID,
              period: 202610,
              amount: '600000',
              commitment: SAMPLE_COMMITMENT,
              cid: 'WITHDRAWN',
              gatewayUrl: null,
              recordedBy: SAMPLE_ADDRESS,
              utc: '2026-11-04T03:13:20.000Z',
              wita: '4 November 2026 11.13.20',
            },
          ],
        })
      }),
    )

    const queryClient = createTestQueryClient()
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <TransactionDetails txHash={SAMPLE_TX_HASH} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('DITARIK')).toBeInTheDocument()
    expect(screen.getByText('Oktober 2026')).toBeInTheDocument()
    expect(screen.getByText(/Rp\s*600\.000/)).toBeInTheDocument()
    expect(screen.getByText(SAMPLE_COMMITMENT)).toBeInTheDocument()
    unmount()

    // Now test CHAIN_NOT_CONFIGURED banner
    server.use(
      http.get(`*/api/v1/explorer/tx/${SAMPLE_TX_HASH}`, () => {
        return HttpResponse.json(
          {
            type: 'https://bansosledger.local/problems/CHAIN_NOT_CONFIGURED',
            title: 'Service Unavailable',
            status: 503,
            code: 'CHAIN_NOT_CONFIGURED',
            message: 'Blockchain belum dikonfigurasi.',
            requestId: 'req-chain-503',
          },
          { status: 503, headers: { 'Content-Type': 'application/problem+json' } },
        )
      }),
    )

    const queryClient2 = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient2}>
        <TransactionDetails txHash={SAMPLE_TX_HASH} />
      </QueryClientProvider>,
    )

    expect((await screen.findAllByText('Jaringan belum tersedia')).length).toBeGreaterThan(0)
  })
})
