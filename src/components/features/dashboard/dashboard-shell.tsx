'use client'

import { createContext, Suspense, useContext, useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LogOut, AlertOctagon, AlertTriangle } from 'lucide-react'
import { LayoutDashboard, Users, Layers, ArrowLeftRight, ShieldX, Download, ShieldCheck, Clock3, ExternalLink, ArrowUpRight, AlignLeft, Search, ChevronDown, X } from 'lucide-react'
import styles from './overview/dashboard.module.css'

import { ForceChangePasswordDialog } from '@/components/features/auth/force-change-password-dialog'
import { isDevRolePreviewEnabled, RoleAccessProvider, useRoleAccess } from '@/hooks/use-role-access'
import { useLogoutMutation } from '@/lib/api/hooks/auth'
import { useDashboardSummaryQuery, useNetworkStatusQuery } from '@/lib/api/hooks'
import { roles, type Role, type Permission } from '@/types/rbac'
import { ROLE_METADATA, dashboardRoutePermissions } from '@/lib/rbac'

interface NavItem {
  label: string
  href: string
  icon: ComponentType<{ size?: number }>
  countKey?: 'failed'
}

const navigation: NavItem[] = [
  { label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Penerima Bantuan', href: '/dashboard/penerima', icon: Users },
  { label: 'Program bantuan', href: '/dashboard/bantuan', icon: Layers },
  { label: 'Penyaluran & IPFS', href: '/dashboard/penyaluran', icon: ArrowLeftRight },
  { label: 'Transaksi gagal', href: '/dashboard/penyaluran?status=FAILED', icon: ShieldX, countKey: 'failed' as const },
  { label: 'Laporan', href: '/dashboard/laporan', icon: Download },
]
const monitoring: NavItem[] = [
  { label: 'Status jaringan', href: '/dashboard/monitoring', icon: ShieldCheck },
  { label: 'Verifikasi integritas', href: '/dashboard/verifikasi', icon: ShieldCheck },
  { label: 'Log aktivitas', href: '/dashboard/log-aktivitas', icon: Clock3 },
  { label: 'Registri wallet / role', href: '/dashboard/wallet', icon: ShieldCheck },
  { label: 'Pengaturan akun', href: '/dashboard/pengaturan', icon: ShieldCheck },
  { label: 'Block explorer', href: '/explorer', icon: ExternalLink },
]

function hrefPath(href: string): string {
  return href.split('#')[0].split('?')[0]
}

function isNavItemActive(href: string, pathname: string, searchQuery = ''): boolean {
  if (href.includes('#')) return false
  const [itemPath, itemQuery] = href.split('?')
  if (itemQuery) {
    if (pathname !== itemPath) return false
    const expected = new URLSearchParams(itemQuery)
    const actual = new URLSearchParams(searchQuery)
    for (const [k, v] of expected.entries()) {
      if ((actual.get(k) ?? '').toUpperCase() !== v.toUpperCase()) return false
    }
    return true
  }
  if (itemPath === '/dashboard/penyaluran' && pathname === '/dashboard/penyaluran') {
    const actual = new URLSearchParams(searchQuery)
    if ((actual.get('status') ?? '').toUpperCase() === 'FAILED') return false
  }
  return pathname === itemPath || (itemPath !== '/dashboard' && pathname.startsWith(`${itemPath}/`))
}

function NavLinksList({
  items,
  pathname,
  searchQuery,
  failedCount,
  onSelect,
}: {
  items: NavItem[]
  pathname: string
  searchQuery: string
  failedCount: string
  onSelect: () => void
}) {
  return (
    <>
      {items.map(item => {
        const active = isNavItemActive(item.href, pathname, searchQuery)
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={active ? styles.active : ''}
            onClick={onSelect}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
            {item.countKey && <small>{failedCount}</small>}
          </Link>
        )
      })}
    </>
  )
}

function SearchAwareNavLinks(props: Omit<Parameters<typeof NavLinksList>[0], 'searchQuery'>) {
  const searchParams = useSearchParams()
  return <NavLinksList {...props} searchQuery={searchParams.toString()} />
}

function SidebarNav(props: Omit<Parameters<typeof NavLinksList>[0], 'searchQuery'>) {
  return (
    <Suspense fallback={<NavLinksList {...props} searchQuery="" />}>
      <SearchAwareNavLinks {...props} />
    </Suspense>
  )
}
const SearchContext = createContext<{ query: string; setQuery: (value: string) => void } | null>(null)

export function useDashboardSearch() {
  const context = useContext(SearchContext)
  if (!context) throw new Error('Dashboard search requires DashboardShell')
  return context
}

export function DashboardShell({
  children,
  initialRole,
  walletVerified,
  initialMustChangePassword = false,
}: {
  children: ReactNode
  initialRole: Role
  walletVerified: boolean
  initialMustChangePassword?: boolean
}) {
  return (
    <RoleAccessProvider initialRole={initialRole}>
      <DashboardFrame
        walletVerified={walletVerified}
        initialMustChangePassword={initialMustChangePassword}
      >
        {children}
      </DashboardFrame>
    </RoleAccessProvider>
  )
}

function DashboardFrame({
  children,
  walletVerified,
  initialMustChangePassword,
}: {
  children: ReactNode
  walletVerified: boolean
  initialMustChangePassword: boolean
}) {
  const { role, session, meta, can, canAccessRoute, isAuthenticated, isReadOnly, setPreviewRole } = useRoleAccess()
  const previewEnabled = process.env.NODE_ENV !== 'production' && isDevRolePreviewEnabled() && isAuthenticated
  const effectiveWalletVerified = session ? session.walletVerified : walletVerified
  const router = useRouter()
  const logoutMutation = useLogoutMutation()
  const loggingOut = logoutMutation.isPending
  const summaryQuery = useDashboardSummaryQuery()
  const networkQuery = useNetworkStatusQuery()
  const failedCount = summaryQuery.data ? String(summaryQuery.data.failed) : '-'
  const latestBlock = networkQuery.data ? `#${networkQuery.data.latestBlock.toLocaleString('id-ID')}` : '-'
  const validatorCount = networkQuery.data?.validatorCount ?? null
  const validatorLabel = validatorCount === null ? '-' : String(validatorCount)
  const networkStatus = networkQuery.data?.status ?? null
  const statusDotClass =
    networkStatus === 'Berhenti'
      ? `${styles.statusDot} ${styles.statusDotDanger}`
      : networkStatus === 'Terganggu'
        ? `${styles.statusDot} ${styles.statusDotWarning}`
        : styles.statusDot
  const abnormalStatus = networkStatus === 'Berhenti' || networkStatus === 'Terganggu' ? networkStatus : null
  const networkBanner =
    networkStatus === 'Berhenti' ? (
      <div role="alert" aria-live="assertive" className={`${styles.networkBanner} ${styles.networkBannerDanger}`}>
        <AlertOctagon size={19} aria-hidden="true" />
        <div>
          <strong>Jaringan blockchain berhenti</strong>
          <p>Produksi blok Hyperledger Besu sedang berhenti. Pengiriman dan penandatanganan transaksi on-chain ditangguhkan sementara hingga konsensus validator kembali normal.</p>
        </div>
      </div>
    ) : networkStatus === 'Terganggu' ? (
      <div role="status" aria-live="polite" className={`${styles.networkBanner} ${styles.networkBannerWarning}`}>
        <AlertTriangle size={19} aria-hidden="true" />
        <div>
          <strong>Jaringan blockchain terganggu</strong>
          <p>Jaringan Hyperledger Besu sedang mengalami keterlambatan blok. Konfirmasi transaksi on-chain mungkin lebih lama dari biasanya.</p>
        </div>
      </div>
    ) : null

  async function logout() {
    if (loggingOut) return
    try {
      await logoutMutation.mutateAsync()
      router.replace('/login')
      router.refresh()
    } catch {
      setNotice('Logout gagal. Silakan coba kembali.')
    }
  }

  const permissionFor = (href: string): Permission =>
    href === '/explorer' ? 'explorer:read' : dashboardRoutePermissions[hrefPath(href)]
  const visibleNavigation = navigation.map(item => ({ ...item, permission: permissionFor(item.href) })).filter(item => can(item.permission))
  const visibleMonitoring = monitoring.map(item => ({ ...item, permission: permissionFor(item.href) })).filter(item => can(item.permission))
  const pathname = usePathname()
  const [sidebar, setSidebar] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const isActive = (href: string) => isNavItemActive(href, pathname)
  const section = [...navigation, ...monitoring].find(item => isActive(item.href))?.label ?? 'Dashboard'

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      <ForceChangePasswordDialog initialOpen={initialMustChangePassword} />
      <div className={`${styles.dashboard} ${collapsed ? styles.collapsed : ''}`}>
        {sidebar && <button className={styles.backdrop} aria-label="Tutup navigasi" onClick={() => setSidebar(false)} />}
        <aside id="dashboard-sidebar" className={`${styles.sidebar} ${sidebar ? styles.open : ''}`}>
          <Link href="/" className={styles.brand}><span className={styles.logoCrop}><img src="/images/bansosledger-logo.png" alt="BansosLedger" width={2145} height={733} /></span></Link>
          <span className={styles.workspace}>WORKSPACE PENGELOLA</span>
          <nav aria-label="Navigasi dashboard">
            <SidebarNav
              items={visibleNavigation}
              pathname={pathname}
              failedCount={failedCount}
              onSelect={() => setSidebar(false)}
            />
          </nav>
          <div className={styles.navSection}>MONITORING</div>
          <nav aria-label="Monitoring dashboard">
            <SidebarNav
              items={visibleMonitoring}
              pathname={pathname}
              failedCount={failedCount}
              onSelect={() => setSidebar(false)}
            />
          </nav>
          <div className={styles.networkMini}><div><span className={statusDotClass} data-network-status={networkStatus ?? 'unknown'} aria-hidden="true" />Jaringan Besu{abnormalStatus && <span data-testid="sidebar-network-status"> — {abnormalStatus}</span>}</div><p>Block height <strong>{latestBlock}</strong></p><p>Validator aktif<strong>{validatorLabel}</strong></p></div>
          <Link href="/" className={styles.homeLink}>Kembali ke halaman publik <ArrowUpRight size={15} /></Link>
        </aside>
        <div className={styles.mainColumn}>
          <header className={styles.header}>
            <button className={`${styles.iconButton} ${styles.desktopToggle}`} aria-label={collapsed ? 'Perluas navigasi' : 'Ringkas navigasi'} aria-expanded={!collapsed} aria-controls="dashboard-sidebar" onClick={() => setCollapsed(!collapsed)}><AlignLeft size={18} strokeWidth={1.6} aria-hidden="true" /></button>
            <button className={`${styles.iconButton} ${styles.mobileToggle}`} aria-label="Buka navigasi" aria-expanded={sidebar} aria-controls="dashboard-sidebar" onClick={() => setSidebar(!sidebar)}><AlignLeft size={18} strokeWidth={1.6} aria-hidden="true" /></button>
            {pathname === '/dashboard' ? <label className={styles.search}><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, hash, atau alasan revert..." aria-label="Cari transaksi" /><kbd>⌕</kbd></label> : <span className={styles.period}>Pengelolaan / {section === 'Program bantuan' ? 'Program Bantuan' : section}</span>}
            <div className={styles.headerRight}>
              <span className={styles.headerNetwork} data-testid="header-network"><span className={statusDotClass} data-network-status={networkStatus ?? 'unknown'} aria-hidden="true" />Besu · {abnormalStatus ? `${abnormalStatus} · ` : ''}{validatorLabel} validator</span>
              {can('wallet:verify-session') ? (
                <Link
                  href="/dashboard/wallet"
                  className={`${styles.walletStatus} ${effectiveWalletVerified ? styles.walletVerified : styles.walletUnverified}`}
                  title={
                    effectiveWalletVerified
                      ? 'Wallet sesi terverifikasi — klik untuk membuka Registri Wallet'
                      : 'Wallet sesi belum terverifikasi — klik untuk mengikat wallet sesi'
                  }
                >
                  {effectiveWalletVerified ? 'Wallet terverifikasi' : 'Wallet belum terverifikasi'}
                </Link>
              ) : (
                <span className="text-xs">Wallet tidak diperlukan</span>
              )}
              <button disabled={loggingOut} onClick={logout} className="flex shrink-0 items-center gap-1 text-sm" aria-label="Keluar"><LogOut size={17} />{loggingOut ? 'Keluar…' : 'Keluar'}</button>
              {previewEnabled && <label className="text-xs">Simulasi UI (non-production)<select id="role-preview" aria-label="Simulasi Pratinjau UI Role" className="block max-w-48 rounded border bg-white p-1 text-black" value={role ?? ''} onChange={event => setPreviewRole?.(event.target.value as Role || null)}><option value="">Belum Login</option>{roles.map(value => <option key={value} value={value}>{ROLE_METADATA[value].shortLabel}</option>)}</select></label>}
              <div className={styles.profile}><span>{meta?.badgeCode ?? '—'}</span><div><strong>{meta?.shortLabel ?? 'Belum Login'}</strong><small>{meta?.instansi ?? 'Sesi belum terverifikasi'}</small></div><ChevronDown size={15} /></div>
            </div>
          </header>
          <main className={styles.content} id="ringkasan">
            {networkBanner}
            {notice && <div role="status" className={styles.notice}><ShieldCheck size={19} /><span>{notice}</span><button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}><X size={18} /></button></div>}
            {!isAuthenticated ? <section className="rounded-xl border bg-white p-8"><h1 className="text-xl font-semibold">401 — Sesi Belum Terautentikasi</h1><p className="my-4">Masuk dengan akun terverifikasi untuk membuka dashboard internal.</p><Link href="/login" className="text-primary underline">Menuju login</Link>{previewEnabled && <button className="ml-4 rounded border px-3 py-2" onClick={() => document.getElementById('role-preview')?.focus()}>Uji Pratinjau UI Role</button>}</section> : !canAccessRoute(pathname) ? <section className="rounded-xl border bg-white p-8"><h1 className="text-xl font-semibold">403 — Akses Ditolak untuk Peran Anda</h1><p className="my-4">Sesuai Tabel 3.1 dan User Role Matrix, audit independen dilakukan melalui halaman publik dan Blockchain Explorer.</p><Link href="/dashboard" className="text-primary underline">Kembali ke Dashboard</Link></section> : <>{isReadOnly && <div role="status" className={styles.notice}>Mode Baca Saja (Read-Only — Monitoring &amp; Verifikasi)</div>}{children}</>}
            <footer className={styles.footer}><span>© 2026 BansosLedger. Transparansi untuk setiap bantuan.</span><span>Dashboard pengelola</span></footer>
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  )
}

