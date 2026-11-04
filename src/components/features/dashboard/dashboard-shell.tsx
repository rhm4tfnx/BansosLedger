'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { LayoutDashboard, Users, Layers, ArrowLeftRight, ShieldX, Download, ShieldCheck, Clock3, ExternalLink, ArrowUpRight, AlignLeft, Search, Bell, ChevronDown, X } from 'lucide-react'
import styles from './overview/dashboard.module.css'

import { ForceChangePasswordDialog } from '@/components/features/auth/force-change-password-dialog'
import { isDevRolePreviewEnabled, RoleAccessProvider, useRoleAccess } from '@/hooks/use-role-access'
import { useLogoutMutation } from '@/lib/api/hooks/auth'
import { roles, type Role, type Permission } from '@/types/rbac'
import { ROLE_METADATA, dashboardRoutePermissions } from '@/lib/rbac'

const navigation = [
  { label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Penerima Bantuan', href: '/dashboard/penerima', icon: Users },
  { label: 'Program bantuan', href: '/dashboard/bantuan', icon: Layers },
  { label: 'Penyaluran & IPFS', href: '/dashboard/penyaluran', icon: ArrowLeftRight },
  { label: 'Transaksi ditolak', href: '/dashboard#ditolak', icon: ShieldX, count: '23' },
  { label: 'Laporan', href: '/dashboard/laporan', icon: Download },
]
const monitoring = [
  { label: 'Status jaringan', href: '/dashboard/monitoring', icon: ShieldCheck },
  { label: 'Verifikasi integritas', href: '/dashboard/verifikasi', icon: ShieldCheck },
  { label: 'Log aktivitas', href: '/dashboard/log-aktivitas', icon: Clock3 },
  { label: 'Registri wallet / role', href: '/dashboard/wallet', icon: ShieldCheck },
  { label: 'Pengaturan akun', href: '/dashboard/pengaturan', icon: ShieldCheck },
  { label: 'Block explorer', href: '/explorer', icon: ExternalLink },
]
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
  const previewEnabled = isDevRolePreviewEnabled() && isAuthenticated
  const effectiveWalletVerified = session ? session.walletVerified : walletVerified
  const router = useRouter()
  const logoutMutation = useLogoutMutation()
  const loggingOut = logoutMutation.isPending

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

  const permissionFor = (href: string): Permission => href === '/explorer' ? 'explorer:read' : dashboardRoutePermissions[href.split('#')[0]]
  const visibleNavigation = navigation.map(item => ({ ...item, permission: permissionFor(item.href) })).filter(item => can(item.permission))
  const visibleMonitoring = monitoring.map(item => ({ ...item, permission: permissionFor(item.href) })).filter(item => can(item.permission))
  const pathname = usePathname()
  const [sidebar, setSidebar] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const isActive = (href: string) => !href.includes('#') && (pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)))
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
            {visibleNavigation.map(item => <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={isActive(item.href) ? 'page' : undefined} className={isActive(item.href) ? styles.active : ''} onClick={() => setSidebar(false)}><item.icon size={19} /><span>{item.label}</span>{item.count && <small>{item.count}</small>}</Link>)}
          </nav>
          <div className={styles.navSection}>MONITORING</div>
          <nav aria-label="Monitoring dashboard">
            {visibleMonitoring.map(item => <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={isActive(item.href) ? 'page' : undefined} className={isActive(item.href) ? styles.active : ''} onClick={() => setSidebar(false)}><item.icon size={19} /><span>{item.label}</span></Link>)}
          </nav>
          <div className={styles.networkMini}><div><span className={styles.statusDot} />Jaringan Besu</div><p>Block height <strong>#1.482.914</strong></p><p>Validator aktif<strong>4 / 4</strong></p></div>
          <Link href="/" className={styles.homeLink}>Kembali ke halaman publik <ArrowUpRight size={15} /></Link>
        </aside>
        <div className={styles.mainColumn}>
          <header className={styles.header}>
            <button className={`${styles.iconButton} ${styles.desktopToggle}`} aria-label={collapsed ? 'Perluas navigasi' : 'Ringkas navigasi'} aria-expanded={!collapsed} aria-controls="dashboard-sidebar" onClick={() => setCollapsed(!collapsed)}><AlignLeft size={18} strokeWidth={1.6} aria-hidden="true" /></button>
            <button className={`${styles.iconButton} ${styles.mobileToggle}`} aria-label="Buka navigasi" aria-expanded={sidebar} aria-controls="dashboard-sidebar" onClick={() => setSidebar(!sidebar)}><AlignLeft size={18} strokeWidth={1.6} aria-hidden="true" /></button>
            {pathname === '/dashboard' ? <label className={styles.search}><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, hash, atau alasan revert..." aria-label="Cari transaksi" /><kbd>⌕</kbd></label> : <span className={styles.period}>Pengelolaan / {section === 'Program bantuan' ? 'Program Bantuan' : section}</span>}
            <div className={styles.headerRight}>
              <span className={styles.headerNetwork}><span className={styles.statusDot} />Besu · 4/4 validator</span>
              <span className="text-xs">{can('wallet:verify-session') ? (effectiveWalletVerified ? 'Wallet terverifikasi' : 'Wallet belum terverifikasi') : 'Wallet tidak diperlukan'}</span>
              <button disabled={loggingOut} onClick={logout} className="flex shrink-0 items-center gap-1 text-sm" aria-label="Keluar"><LogOut size={17} />{loggingOut ? 'Keluar…' : 'Keluar'}</button>
              <button className={styles.iconButton} aria-label="Notifikasi" onClick={() => setNotice('Pratinjau notifikasi: 23 transaksi ditolak memerlukan peninjauan operator.')}><Bell size={19} /><i /></button>
              {previewEnabled && <label className="text-xs">Simulasi UI (non-production)<select id="role-preview" aria-label="Simulasi Pratinjau UI Role" className="block max-w-48 rounded border bg-white p-1 text-black" value={role ?? ''} onChange={event => setPreviewRole?.(event.target.value as Role || null)}><option value="">Belum Login</option>{roles.map(value => <option key={value} value={value}>{ROLE_METADATA[value].shortLabel}</option>)}</select></label>}
              <div className={styles.profile}><span>{meta?.badgeCode ?? '—'}</span><div><strong>{meta?.shortLabel ?? 'Belum Login'}</strong><small>{meta?.instansi ?? 'Sesi belum terverifikasi'}</small></div><ChevronDown size={15} /></div>
            </div>
          </header>
          <main className={styles.content} id="ringkasan">
            {notice && <div role="status" className={styles.notice}><ShieldCheck size={19} /><span>{notice}</span><button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}><X size={18} /></button></div>}
            {!isAuthenticated ? <section className="rounded-xl border bg-white p-8"><h1 className="text-xl font-semibold">401 — Sesi Belum Terautentikasi</h1><p className="my-4">Masuk dengan akun terverifikasi untuk membuka dashboard internal.</p><Link href="/login" className="text-primary underline">Menuju login</Link>{previewEnabled && <button className="ml-4 rounded border px-3 py-2" onClick={() => document.getElementById('role-preview')?.focus()}>Uji Pratinjau UI Role</button>}</section> : !canAccessRoute(pathname) ? <section className="rounded-xl border bg-white p-8"><h1 className="text-xl font-semibold">403 — Akses Ditolak untuk Peran Anda</h1><p className="my-4">Sesuai Tabel 3.1 dan User Role Matrix, audit independen dilakukan melalui halaman publik dan Blockchain Explorer.</p><Link href="/dashboard" className="text-primary underline">Kembali ke Dashboard</Link></section> : <>{isReadOnly && <div role="status" className={styles.notice}>Mode Baca Saja (Read-Only — Monitoring &amp; Verifikasi)</div>}{children}</>}
            <footer className={styles.footer}><span>© 2026 BansosLedger. Transparansi untuk setiap bantuan.</span><span>Dashboard pengelola</span></footer>
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  )
}
