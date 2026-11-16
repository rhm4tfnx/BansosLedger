import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { generateMetadata as generateCekBansosMetadata } from '@/app/(public)/cek-bansos/page'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { MaintenanceBanner } from '@/components/shared/maintenance-banner'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

function renderBanner() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MaintenanceBanner />
    </QueryClientProvider>,
  )
}

describe('MaintenanceBanner & Public SEO (PRD FR-SYS-02, FR-PUB-10, D-52)', () => {
  it('does not render MaintenanceBanner when /api/v1/health/ready returns 200 and services are ok', async () => {
    let called = false
    server.use(
      http.get('*/api/v1/health/ready', () => {
        called = true
        return HttpResponse.json(
          {
            status: 'ready',
            services: { mongo: 'ok', rpc: 'ok', pinata: 'ok' },
          },
          { status: 200 },
        )
      }),
    )

    renderBanner()
    await waitFor(() => {
      expect(called).toBe(true)
    })
    expect(
      screen.queryByText(/Sistem sedang dalam pemeliharaan\. Data terbaru mungkin belum tersedia\./i),
    ).not.toBeInTheDocument()
  })

  it('renders MaintenanceBanner when Mongo or RPC is unavailable or HTTP status is non-200 without leaking internal error details', async () => {
    server.use(
      http.get('*/api/v1/health/ready', () =>
        HttpResponse.json(
          {
            status: 'unavailable',
            services: { mongo: 'unavailable', rpc: 'ok', pinata: 'ok' },
            internalSecretDetail: 'MongoServerSelectionError: ECONNREFUSED 127.0.0.1:27017',
          },
          { status: 503 },
        ),
      ),
    )

    const { unmount } = renderBanner()
    const banner = await screen.findByRole('status')
    expect(banner).toHaveTextContent(
      'Sistem sedang dalam pemeliharaan. Data terbaru mungkin belum tersedia.',
    )
    expect(banner.textContent).not.toContain('ECONNREFUSED')
    expect(banner.textContent).not.toContain('MongoServerSelectionError')
    unmount()

    // Also renders when HTTP 200 is returned but rpc is 'unavailable'
    server.use(
      http.get('*/api/v1/health/ready', () =>
        HttpResponse.json(
          {
            status: 'unavailable',
            services: { mongo: 'ok', rpc: 'unavailable', pinata: 'ok' },
          },
          { status: 200 },
        ),
      ),
    )

    renderBanner()
    expect(
      await screen.findByText(
        'Sistem sedang dalam pemeliharaan. Data terbaru mungkin belum tersedia.',
      ),
    ).toBeInTheDocument()
  })

  it('generates sitemap.xml, robots.txt, and noindex metadata on /cek-bansos per FR-PUB-10', async () => {
    const previousBase = process.env.APP_BASE_URL
    try {
      delete process.env.APP_BASE_URL
      const sitemapEntries = sitemap()
      const urls = sitemapEntries.map((entry) => entry.url)
      expect(urls).toEqual([
        'https://bansosledger.icu',
        'https://bansosledger.icu/transparansi',
        'https://bansosledger.icu/program',
        'https://bansosledger.icu/cara-verifikasi',
        'https://bansosledger.icu/explorer',
      ])

      const robotsConfig = robots()
      expect(robotsConfig.sitemap).toBe('https://bansosledger.icu/sitemap.xml')
      expect(robotsConfig.rules).toEqual({
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api', '/login'],
      })

      const cekBansosMeta = await generateCekBansosMetadata()
      expect(cekBansosMeta.robots).toEqual({
        index: false,
        follow: false,
      })
    } finally {
      if (previousBase === undefined) {
        delete process.env.APP_BASE_URL
      } else {
        process.env.APP_BASE_URL = previousBase
      }
    }
  })
})
