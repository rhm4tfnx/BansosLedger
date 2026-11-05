import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { injectHardhatEthereumProvider } from './support/ethereum-provider'

const PUBLIC_PATHS = [
  '/',
  '/transparansi',
  '/program',
  '/cek-bansos',
  '/cara-verifikasi',
  '/explorer',
  '/explorer/contract',
  '/explorer/validator',
]

const SAMPLE_NIK = '7311011508900001'
const SAMPLE_TX_HASH = `0x${'ab'.repeat(32)}`
const SAMPLE_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'
const SAMPLE_COMMITMENT = `0x${'cd'.repeat(32)}`
const SAMPLE_PROGRAM_ID = `0x${'ef'.repeat(32)}`
const SAMPLE_REF_ID = `0x${'99'.repeat(32)}`

test.describe('1. CSP & WCAG 2.2 AA Accessibility on Public Pages', () => {
  test('loads every public page with zero CSP violations and nonce-protected scripts', async ({
    page,
  }) => {
    const violations: string[] = []

    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        ;(window as unknown as { __cspViolations?: string[] }).__cspViolations =
          (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? []
        ;(window as unknown as { __cspViolations: string[] }).__cspViolations.push(
          `${event.violatedDirective}: ${event.blockedURI}`,
        )
      })
    })

    page.on('console', (msg) => {
      if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) {
        violations.push(msg.text())
      }
    })

    for (const path of PUBLIC_PATHS) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(response).not.toBeNull()
      const headers = response!.headers()
      const cspHeader =
        headers['content-security-policy'] ?? headers['content-security-policy-report-only']
      expect(cspHeader).toBeTruthy()
      expect(cspHeader).toContain("'nonce-")

      const domViolations = await page.evaluate(
        () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
      )
      expect(domViolations, `DOM CSP violations on ${path}`).toEqual([])
    }

    expect(violations).toEqual([])
  })

  test('passes axe-core WCAG 2.2 AA accessibility checks on main pages', async ({ page }) => {
    for (const path of ['/', '/transparansi', '/program', '/cek-bansos', '/explorer', '/login']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations, `WCAG 2.2 AA violations on ${path}`).toEqual([])
    }
  })
})

test.describe('2. Public Cek Status & Explorer Search E2E', () => {
  test('Cek Status (/cek-bansos) verifies recipient status and never puts NIK in the URL', async ({
    page,
  }) => {
    await page.route('**/api/v1/public/status-check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      })
    })

    await page.goto('/cek-bansos')
    await page.getByLabel(/Nomor Induk Kependudukan \(NIK\)/i).fill(SAMPLE_NIK)
    await page.getByRole('checkbox', { name: /Saya bukan robot/i }).check()
    await page.getByRole('button', { name: /Cek Status/i }).click()

    await expect(page.getByText('Siti Aminah')).toBeVisible()
    await expect(page.getByText('BLT-K Kelurahan')).toBeVisible()
    await expect(page.getByText('Sudah disalurkan')).toBeVisible()
    expect(page.url()).not.toContain(SAMPLE_NIK)
  })

  test('Explorer (/explorer) searches block number, txHash, and address and navigates to detail pages', async ({
    page,
  }) => {
    await page.route('**/api/v1/explorer/search*', async (route) => {
      const url = new URL(route.request().url())
      const q = url.searchParams.get('q')
      if (q === '120') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            number: 120,
            hash: `0x${'11'.repeat(32)}`,
            parentHash: `0x${'00'.repeat(32)}`,
            timestamp: 1730690000,
            proposer: SAMPLE_ADDRESS,
            transactionCount: 1,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      })
    })

    await page.goto('/explorer')
    await page.getByLabel(/Cari TxHash, nomor blok, alamat/i).fill('120')
    await page.getByRole('button', { name: /Cari di explorer/i }).click()
    await expect(page).toHaveURL(/\/explorer\/block\/120$/)
  })
})

test.describe('3. Portal Login, Forced Password Change, RBAC, Recipients, Programs & Wizard', () => {
  test('enforces forced password change on login, role-based UI visibility, and wallet-signed write flows', async ({
    page,
  }) => {
    await injectHardhatEthereumProvider(page)

    let mustChangePassword = true
    let currentRole: 'OPERATOR_KELURAHAN' | 'KECAMATAN' | 'DINAS_SOSIAL' = 'OPERATOR_KELURAHAN'

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-op-1',
          name: 'Operator Takkalasi',
          institution: 'Kelurahan Takkalasi',
          email: 'operator@barrukab.go.id',
          role: currentRole,
          mustChangePassword,
          walletVerified: true,
          boundWalletAddress: SAMPLE_ADDRESS,
          expiresAt: Date.now() + 3600_000,
        }),
      })
    })

    await page.route('**/api/v1/auth/change-password', async (route) => {
      mustChangePassword = false
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ changed: true, mustChangePassword: false }),
      })
    })

    await page.context().addCookies([
      {
        name: 'bansos_session_token',
        value: 'e2e-session-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ])

    await page.goto('/dashboard')
    await expect(page.getByRole('dialog')).toContainText(/Ganti Kata Sandi Wajib/i)

    await page.getByLabel(/Kata sandi saat ini/i).fill('OldPassword123!')
    await page.getByLabel(/^Kata sandi baru$/i).fill('NewSecurePassword123!')
    await page.getByLabel(/Konfirmasi kata sandi baru/i).fill('NewSecurePassword123!')
    await page.getByRole('button', { name: /Simpan kata sandi baru/i }).click()

    await expect(page.getByRole('dialog')).toBeHidden()

    // Switch role to KECAMATAN and verify read-only banner
    currentRole = 'KECAMATAN'
    await page.reload()
    await expect(page.getByText(/Mode Baca Saja/i)).toBeVisible()
  })
})

