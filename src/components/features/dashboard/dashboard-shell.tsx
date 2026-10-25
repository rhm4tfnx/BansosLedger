'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Layers, ArrowLeftRight, ShieldX, Download, ShieldCheck, Clock3, ExternalLink, ArrowUpRight, AlignLeft, Search, Bell, ChevronDown, X } from 'lucide-react'
import styles from './overview/dashboard.module.css'

const navigation = [
  { label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Penerima Bantuan', href: '/dashboard/penerima', icon: Users },
  { label: 'Program bantuan', href: '/dashboard/bantuan', icon: Layers },
  { label: 'Penyaluran & IPFS', href: '/dashboard/penyaluran', icon: ArrowLeftRight },
  { label: 'Transaksi ditolak', href: '/dashboard#ditolak', icon: ShieldX, count: '23' },
  { label: 'Laporan & LPJ', href: '/dashboard/laporan', icon: Download },
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

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [sidebar, setSidebar] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const isActive = (href: string) => !href.includes('#') && (pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)))
  const section = [...navigation, ...monitoring].find(item => isActive(item.href))?.label ?? 'Dashboard'

  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      <div className={`${styles.dashboard} ${collapsed ? styles.collapsed : ''}`}>
        {sidebar && <button className={styles.backdrop} aria-label="Tutup navigasi" onClick={() => setSidebar(false)} />}
        <aside id="dashboard-sidebar" className={`${styles.sidebar} ${sidebar ? styles.open : ''}`}>
          <Link href="/" className={styles.brand}><span className={styles.logoCrop}><img src="/images/bansosledger-logo.png" alt="BansosLedger" width={2145} height={733} /></span></Link>
          <span className={styles.workspace}>WORKSPACE PENGELOLA</span>
          <nav aria-label="Navigasi dashboard">
            {navigation.map(item => <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={isActive(item.href) ? 'page' : undefined} className={isActive(item.href) ? styles.active : ''} onClick={() => setSidebar(false)}><item.icon size={19} /><span>{item.label}</span>{item.count && <small>{item.count}</small>}</Link>)}
          </nav>
          <div className={styles.navSection}>MONITORING</div>
          <nav aria-label="Monitoring dashboard">
            {monitoring.map(item => <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={isActive(item.href) ? 'page' : undefined} className={isActive(item.href) ? styles.active : ''} onClick={() => setSidebar(false)}><item.icon size={19} /><span>{item.label}</span></Link>)}
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
              <button className={styles.iconButton} aria-label="Notifikasi" onClick={() => setNotice('Pratinjau notifikasi: 23 transaksi ditolak memerlukan peninjauan operator.')}><Bell size={19} /><i /></button>
              <div className={styles.profile}><span>OP</span><div><strong>Operator</strong><small>Pengelola bantuan</small></div><ChevronDown size={15} /></div>
            </div>
          </header>
          <main className={styles.content} id="ringkasan">
            {notice && <div role="status" className={styles.notice}><ShieldCheck size={19} /><span>{notice}</span><button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}><X size={18} /></button></div>}
            {children}
            <footer className={styles.footer}><span>© 2026 BansosLedger. Transparansi untuk setiap bantuan.</span><span>Dashboard pengelola</span></footer>
          </main>
        </div>
      </div>
    </SearchContext.Provider>
  )
}
