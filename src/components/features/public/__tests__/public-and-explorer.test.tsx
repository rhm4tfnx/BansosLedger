import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CekBansos } from '@/components/features/cek-bansos/cek-bansos'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import { BlockExplorer } from '@/components/features/explorer/block-explorer'
import { ContractDetails } from '@/components/features/explorer/contract-details'
import { TransactionDetails } from '@/components/features/explorer/transaction-details'
import { VerificationGuide } from '@/components/features/public/verification-guide'
import { TransparencyTransactions } from '@/components/features/transparency/transparency-transactions'
import { toPublicProgramViewModel } from '@/lib/api/adapters/public'

const pushMock = vi.fn()
const replaceMock = vi.fn()
let currentSearchParams = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: vi.fn(),
  }),
  usePathname: () => '/explorer',
  useSearchParams: () => new URLSearchParams(currentSearchParams),
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
  currentSearchParams = ''
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
              amount: 600000,
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
    expect(screen.getByText('Rp 600.000')).toBeInTheDocument()
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

  it('TransparencyTransactions (#transaksi): renders two separate vertical tables (transactions on top, blocks below), sorts by timestamp descending, deduplicates entries, handles partial program failure & pagination independently', async () => {
    const progA = toPublicProgramViewModel({
      code: 'PROG-A',
      name: 'Bantuan Tunai A',
      description: 'Program A',
      kind: 'TUNAI',
      fundSource: 'APBD',
      amountPerRecipient: 600000,
      totalBudget: 12000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
    })
    const progB = toPublicProgramViewModel({
      code: 'PROG-B',
      name: 'Bantuan Sembako B',
      description: 'Program B',
      kind: 'BARANG',
      fundSource: 'APBN',
      amountPerRecipient: 300000,
      totalBudget: 9000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
    })
    const progFail = toPublicProgramViewModel({
      code: 'PROG-ERR',
      name: 'Program Gangguan',
      description: null,
      kind: 'TUNAI',
      fundSource: 'APBD',
      amountPerRecipient: 500000,
      totalBudget: 5000000,
      startPeriod: 202601,
      endPeriod: 202612,
      status: 'ACTIVE',
    })

    const txOld = `0x${'10'.repeat(32)}`
    const txNewest = `0x${'20'.repeat(32)}`
    const txMid1 = `0x${'31'.repeat(32)}`
    const txMid2 = `0x${'32'.repeat(32)}`
    const txMid3 = `0x${'33'.repeat(32)}`
    const txMid4 = `0x${'34'.repeat(32)}`
    const txMid5 = `0x${'35'.repeat(32)}`

    server.use(
      http.get('*/api/v1/public/programs/:code', ({ params }) => {
        const code = params.code
        if (code === 'PROG-A') {
          return HttpResponse.json({
            program: {
              code: 'PROG-A',
              name: 'Bantuan Tunai A',
              description: 'Program A',
              kind: 'TUNAI',
              fundSource: 'APBD',
              amountPerRecipient: 600000,
              totalBudget: 12000000,
              startPeriod: 202601,
              endPeriod: 202612,
              status: 'ACTIVE',
            },
            ledger: {
              data: [
                // Older transaction + duplicate entry to test deduplication
                {
                  txHash: txOld,
                  period: 202609,
                  amount: 600000,
                  time: '2026-09-10T02:00:00.000Z',
                },
                {
                  txHash: txOld,
                  period: 202609,
                  amount: 600000,
                  time: '2026-09-10T02:00:00.000Z',
                },
                {
                  txHash: txMid1,
                  period: 202610,
                  amount: 600000,
                  time: '2026-10-11T02:00:00.000Z',
                },
                {
                  txHash: txMid2,
                  period: 202610,
                  amount: 600000,
                  time: '2026-10-12T02:00:00.000Z',
                },
                {
                  txHash: txMid3,
                  period: 202610,
                  amount: 600000,
                  time: '2026-10-13T02:00:00.000Z',
                },
              ],
              total: 25,
              page: 1,
              limit: 20,
              totalPages: 2,
            },
          })
        }
        if (code === 'PROG-B') {
          return HttpResponse.json({
            program: {
              code: 'PROG-B',
              name: 'Bantuan Sembako B',
              description: 'Program B',
              kind: 'BARANG',
              fundSource: 'APBN',
              amountPerRecipient: 300000,
              totalBudget: 9000000,
              startPeriod: 202601,
              endPeriod: 202612,
              status: 'ACTIVE',
            },
            ledger: {
              data: [
                // Newest transaction across all programs
                {
                  txHash: txNewest,
                  period: 202611,
                  amount: 300000,
                  time: '2026-11-05T04:30:00.000Z',
                },
                {
                  txHash: txMid4,
                  period: 202610,
                  amount: 300000,
                  time: '2026-10-14T02:00:00.000Z',
                },
                {
                  txHash: txMid5,
                  period: 202610,
                  amount: 300000,
                  time: '2026-10-15T02:00:00.000Z',
                },
              ],
              total: 3,
              page: 1,
              limit: 20,
              totalPages: 1,
            },
          })
        }
        return HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Internal Server Error',
            status: 500,
            code: 'INTERNAL_ERROR',
            message: 'Gagal memuat program',
            requestId: 'req-prog-err',
          },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        )
      }),
    )

    const queryClient = createTestQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <TransparencyTransactions programs={[progA, progB, progFail]} />
      </QueryClientProvider>,
    )

    // Both table headings are rendered in stacked cards
    expect(
      await screen.findByRole('heading', { name: /Transaksi penyaluran tercatat terbaru/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Blok tercatat terbaru/i }),
    ).toBeInTheDocument()

    // Wait for transactions to load and verify descending sort (txNewest from PROG-B is first row)
    expect((await screen.findAllByText(/Bantuan Sembako B/i)).length).toBeGreaterThan(0)
    const tables = screen.getAllByRole('table')
    expect(tables).toHaveLength(2)

    const txRows = tables[0]!.querySelectorAll('tbody tr')
    // 7 unique transactions total (duplicate txOld removed), page size 6 -> 6 rows on page 1
    expect(txRows).toHaveLength(6)
    expect(txRows[0]?.textContent).toContain('0x2020…2020')
    expect(txRows[0]?.textContent).toContain('Bantuan Sembako B')

    // Partial failure notice & truncation note are displayed
    expect(screen.getByText(/7 transaksi terbaru · Halaman 1 dari 2/i)).toBeInTheDocument()
    expect(screen.getByText(/Sebagian program \(PROG-ERR\) belum dapat dimuat/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Menampilkan ringkasan transaksi terbaru per program publik/i),
    ).toBeInTheDocument()

    // Navigate to page 2 of transactions -> shows the 7th (oldest) deduplicated transaction
    await user.click(screen.getByRole('button', { name: /Berikutnya/i }))
    const page2Rows = tables[0]!.querySelectorAll('tbody tr')
    expect(page2Rows).toHaveLength(1)
    expect(page2Rows[0]?.textContent).toContain('0x1010…1010')

    // Blocks table below remains intact with #120
    expect(screen.getByText('#120')).toBeInTheDocument()
  })

  it('Navigation buttons on /explorer/contract and /cara-verifikasi: render explicit href links with back icon', async () => {
    server.use(
      http.get('*/api/v1/explorer/contract', () =>
        HttpResponse.json({
          address: SAMPLE_ADDRESS,
          authorizedWallet: SAMPLE_ADDRESS,
          owner: SAMPLE_ADDRESS,
          paused: false,
          chainId: 250204,
          networkOk: true,
          abi: [],
        }),
      ),
    )

    const queryClient = createTestQueryClient()
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <ContractDetails />
      </QueryClientProvider>,
    )

    const backFromContract = screen.getByRole('link', { name: /Kembali ke ringkasan publik/i })
    const toExplorer = screen.getByRole('link', { name: /^Explorer$/i })
    expect(backFromContract).toHaveAttribute('href', '/transparansi')
    expect(toExplorer).toHaveAttribute('href', '/explorer')
    unmount()

    render(<VerificationGuide />)
    const backFromGuide = screen.getByRole('link', { name: /Kembali ke ringkasan publik/i })
    expect(backFromGuide).toHaveAttribute('href', '/transparansi')
  })

  it('HashLink kind="search" links to /explorer?q=... and BlockExplorer auto-triggers search from ?q=', async () => {
    const { unmount } = render(
      <div>
        <HashLink hash={SAMPLE_COMMITMENT} short="0xcdcd…cdcd" kind="search" />
        <HashLink hash={SAMPLE_TX_HASH} short="0xabab…abab" />
      </div>,
    )
    const links = screen.getAllByRole('link', { name: /Buka di explorer/i })
    expect(links[0]).toHaveAttribute('href', `/explorer?q=${encodeURIComponent(SAMPLE_COMMITMENT)}`)
    expect(links[1]).toHaveAttribute('href', `/explorer/tx/${SAMPLE_TX_HASH}`)
    unmount()

    let searchedQ: string | null = null
    server.use(
      http.get('*/api/v1/explorer/search', ({ request }) => {
        searchedQ = new URL(request.url).searchParams.get('q')
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
      }),
    )

    currentSearchParams = `q=${encodeURIComponent(SAMPLE_COMMITMENT)}`
    const queryClient = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <BlockExplorer />
      </QueryClientProvider>,
    )

    const searchInput = screen.getByLabelText(/Cari TxHash, nomor blok, alamat, refId, atau commitment/i)
    await waitFor(() => {
      expect(searchInput).toHaveValue(SAMPLE_COMMITMENT)
      expect(searchedQ).toBe(SAMPLE_COMMITMENT)
    })
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(`/explorer/tx/${SAMPLE_TX_HASH}`)
    })
  })
})
