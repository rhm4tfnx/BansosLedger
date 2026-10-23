'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Layers,
  ArrowLeftRight,
  ShieldX,
  Blocks,
  Search,
  AlignLeft,
  Bell,
  ChevronDown,
  ArrowUpRight,
  Plus,
  RotateCw,
  Download,
  ShieldCheck,
  CircleCheck,
  Clock3,
  X,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { DistributionCharts } from '@/components/features/dashboard/overview/distribution-charts'
import { rejectedTransactions } from '@/constants/dashboard'
import styles from '@/components/features/dashboard/overview/dashboard.module.css'

const navigation = [
  { label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Penerima Bantuan', href: '/dashboard/penerima', icon: Users },
  { label: 'Program bantuan', href: '/dashboard/bantuan', icon: Layers },
  { label: 'Penyaluran & IPFS', href: '/dashboard/penyaluran', icon: ArrowLeftRight },
  { label: 'Transaksi on-chain', href: '/explorer', icon: Blocks },
  { label: 'Transaksi ditolak', href: '#ditolak', icon: ShieldX, count: '23' },
  { label: 'Laporan & LPJ', href: '/dashboard/laporan', icon: Download },
]

export function Dashboard({
  children,
  section = 'Penerima Bantuan',
}: {
  children?: React.ReactNode
  section?: string
}) {
  const [sidebar, setSidebar] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Semua')
  const [notice, setNotice] = useState('')
  const rows = rejectedTransactions.filter(
    (r) =>
      (filter === 'Semua' || r.category === filter) &&
      `${r.name} ${r.hash} ${r.program} ${r.reason}`.toLowerCase().includes(query.toLowerCase()),
  )
  function exportReport() {
    const csv = [
      'Hash,Nama,Program,Kategori,Alasan',
      ...rows.map((r) =>
        [r.hash, r.name, r.program, r.category, r.reason]
          .map((v) => `"${v.replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'laporan-contoh-bansos.csv'
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className={`${styles.dashboard} ${collapsed ? styles.collapsed : ''}`}>
      {sidebar && (
        <button
          className={styles.backdrop}
          aria-label="Tutup navigasi"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside id="dashboard-sidebar" className={`${styles.sidebar} ${sidebar ? styles.open : ''}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logoCrop}>
            <img src="/images/bansosledger-logo.png" alt="BansosLedger" width={2145} height={733} />
          </span>
        </Link>
        <span className={styles.workspace}>WORKSPACE PENGELOLA</span>
        <nav aria-label="Navigasi dashboard">
          {navigation.map((item, i) => (
            <Link
              key={item.label}
              href={item.href.startsWith('#') ? `/dashboard${item.href}` : item.href}
              title={item.label}
              aria-label={item.label}
              onClick={() => setSidebar(false)}
              className={
                i ===
                (children
                  ? section === 'Status jaringan' ||
                    section === 'Verifikasi integritas' ||
                    section === 'Log aktivitas' ||
                    section === 'Registri wallet / role' || section === 'Pengaturan akun'
                    ? -1
                    : section === 'Laporan & LPJ'
                      ? 6
                      : section === 'Penyaluran & IPFS'
                        ? 3
                        : section === 'Program Bantuan'
                          ? 2
                          : 1
                  : 0)
                  ? styles.active
                  : ''
              }
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.count && <small>{item.count}</small>}
            </Link>
          ))}
        </nav>
        <div className={styles.navSection}>MONITORING</div>
        <nav>
          <Link
            href="/dashboard/monitoring"
            title="Status jaringan"
            aria-label="Status jaringan"
            aria-current={section === 'Status jaringan' ? 'page' : undefined}
            className={section === 'Status jaringan' ? styles.active : ''}
            onClick={() => setSidebar(false)}
          >
            <ShieldCheck size={19} />
            <span>Status jaringan</span>
          </Link>
          <Link
            href="/dashboard/verifikasi"
            title="Verifikasi integritas"
            aria-label="Verifikasi integritas"
            aria-current={section === 'Verifikasi integritas' ? 'page' : undefined}
            className={section === 'Verifikasi integritas' ? styles.active : ''}
            onClick={() => setSidebar(false)}
          >
            <ShieldCheck size={19} />
            <span>Verifikasi integritas</span>
          </Link>
          <Link
            href="/dashboard/log-aktivitas"
            title="Log aktivitas"
            aria-label="Log aktivitas"
            aria-current={section === 'Log aktivitas' ? 'page' : undefined}
            className={section === 'Log aktivitas' ? styles.active : ''}
            onClick={() => setSidebar(false)}
          >
            <Clock3 size={19} />
            <span>Log aktivitas</span>
          </Link>
          <Link
            href="/dashboard/wallet"
            title="Registri wallet / role"
            aria-label="Registri wallet / role"
            aria-current={section === 'Registri wallet / role' ? 'page' : undefined}
            className={section === 'Registri wallet / role' ? styles.active : ''}
            onClick={() => setSidebar(false)}
          >
            <ShieldCheck size={19} />
            <span>Registri wallet / role</span>
          </Link>
          <Link href="/dashboard/pengaturan" title="Pengaturan akun" aria-label="Pengaturan akun" className={section === 'Pengaturan akun' ? styles.active : ''} aria-current={section === 'Pengaturan akun' ? 'page' : undefined} onClick={() => setSidebar(false)}><ShieldCheck size={19}/><span>Pengaturan akun</span></Link>
          <Link href="/explorer" title="Block explorer" aria-label="Block explorer">
            <ExternalLink size={19} />
            <span>Block explorer</span>
          </Link>
        </nav>
        <div className={styles.networkMini}>
          <div>
            <span className={styles.statusDot} />
            Jaringan Besu
          </div>
          <p>
            Block height <strong>#1.482.914</strong>
          </p>
          <p>
            Validator aktif<strong>4 / 4</strong>
          </p>
        </div>
        <Link href="/" className={styles.homeLink}>
          Kembali ke halaman publik <ArrowUpRight size={15} />
        </Link>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.header}>
          <button
            className={`${styles.iconButton} ${styles.desktopToggle}`}
            aria-label={collapsed ? 'Perluas navigasi' : 'Ringkas navigasi'}
            aria-expanded={!collapsed}
            aria-controls="dashboard-sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <AlignLeft size={18} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button
            className={`${styles.iconButton} ${styles.mobileToggle}`}
            aria-label="Buka navigasi"
            aria-expanded={sidebar}
            onClick={() => setSidebar(!sidebar)}
          >
            <AlignLeft size={18} strokeWidth={1.6} aria-hidden="true" />
          </button>
          {children ? (
            <span className={styles.period}>Pengelolaan / {section}</span>
          ) : (
            <label className={styles.search}>
              <Search size={19} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, hash, atau alasan revert..."
                aria-label="Cari transaksi"
              />
              <kbd>⌕</kbd>
            </label>
          )}
          <div className={styles.headerRight}>
            <span className={styles.headerNetwork}>
              <span className={styles.statusDot} />
              Besu · 4/4 validator
            </span>
            <button
              className={styles.iconButton}
              aria-label="Notifikasi"
              onClick={() =>
                setNotice(
                  'Pratinjau notifikasi: 23 transaksi ditolak memerlukan peninjauan operator.',
                )
              }
            >
              <Bell size={19} />
              <i />
            </button>
            <div className={styles.profile}>
              <span>OP</span>
              <div>
                <strong>Operator</strong>
                <small>Pengelola bantuan</small>
              </div>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>
        <main className={styles.content} id="ringkasan">
          {children || (
            <>
              <div className={styles.titleRow}>
                <div>
                  <div className={styles.eyebrow}>WORKSPACE / RINGKASAN</div>
                  <h1>Dashboard</h1>
                  <p>Pantau penyaluran bantuan. Pastikan setiap rupiah sampai.</p>
                </div>
              </div>
              <div className={styles.toolbar}>
                <div>
                  <span className={styles.softBadge}>
                    <ShieldCheck size={14} />
                    OPERATOR_ROLE
                  </span>
                  <span className={styles.period}>Tahun anggaran 2026</span>
                </div>
                <div>
                  <button onClick={exportReport}>
                    <Download size={16} />
                    Unduh laporan
                  </button>
                  <button
                    onClick={() =>
                      setNotice(
                        'Pratinjau retry: 310 transaksi pending akan ditinjau sebelum dikirim ulang. Tidak ada transaksi yang dikirim.',
                      )
                    }
                  >
                    <RotateCw size={16} />
                    Retry pending <small>310</small>
                  </button>
                  <button
                    className={styles.primaryButton}
                    onClick={() =>
                      setNotice(
                        'Penyaluran batch belum tersedia dalam pratinjau. Integrasi wallet dan persetujuan operator diperlukan sebelum mengirim bantuan.',
                      )
                    }
                  >
                    <Plus size={17} />
                    Salurkan batch baru
                  </button>
                </div>
              </div>
              {notice && (
                <div role="status" className={styles.notice}>
                  <ShieldCheck size={19} />
                  <span>{notice}</span>
                  <button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')}>
                    <X size={18} />
                  </button>
                </div>
              )}
              <section className={styles.stats} aria-label="Statistik penyaluran">
                <article id="penerima">
                  <div className={styles.statTop}>
                    <span>Total penerima</span>
                    <Users size={19} />
                  </div>
                  <strong>
                    14.820<span>KPM</span>
                  </strong>
                  <div className={styles.statFooter}>
                    <span className={styles.positive}>↗ 4,2%</span>
                    <span>dari periode sebelumnya</span>
                  </div>
                  <div className={styles.statDetail}>13.450 tersalurkan · 980 pending</div>
                </article>
                <article>
                  <div className={styles.statTop}>
                    <span>Program aktif</span>
                    <Layers size={19} />
                  </div>
                  <strong>
                    8<span>program</span>
                  </strong>
                  <div className={styles.statFooter}>
                    <span className={styles.positive}>8 / 8</span>
                    <span>kontrak terdeploy</span>
                  </div>
                  <div className={styles.statDetail}>Seluruh program berjalan aktif</div>
                </article>
                <article>
                  <div className={styles.statTop}>
                    <span>Dana tersalurkan</span>
                    <ArrowUpRight size={19} />
                  </div>
                  <strong>
                    Rp 18,45<span>M</span>
                  </strong>
                  <div className={styles.statFooter}>
                    <span className={styles.positive}>92,4%</span>
                    <span>dari total pagu</span>
                  </div>
                  <div className={styles.progress}>
                    <i />
                  </div>
                </article>
                <article>
                  <div className={styles.statTop}>
                    <span>Transaksi on-chain</span>
                    <ArrowLeftRight size={19} />
                  </div>
                  <strong>42.891</strong>
                  <div className={styles.statFooter}>
                    <span className={styles.positive}>Finalized</span>
                    <span>tercatat di blockchain</span>
                  </div>
                  <div className={styles.statDetail}>Rata-rata finalitas 2,1 detik</div>
                </article>
                <article>
                  <div className={styles.statTop}>
                    <span>Perlu perhatian</span>
                    <Clock3 size={19} />
                  </div>
                  <strong>
                    352<span>transaksi</span>
                  </strong>
                  <div className={styles.statFooter}>
                    <span className={styles.warning}>310 pending</span>
                    <span className={styles.negative}>42 gagal</span>
                  </div>
                  <a className={styles.statDetail} href="#ditolak">
                    Tinjau transaksi <ArrowRight size={13} />
                  </a>
                </article>
              </section>
              <DistributionCharts />
              <div className={styles.bottomGrid}>
                <section className={styles.card} id="ditolak">
                  <div className={styles.cardHeading}>
                    <div>
                      <h2>Transaksi ditolak smart contract</h2>
                      <p>Penolakan otomatis untuk menjaga integritas penyaluran.</p>
                    </div>
                    <span className={styles.negative}>23 ditolak</span>
                  </div>
                  <div className={styles.tableTools}>
                    <label>
                      <Search size={16} />
                      <input
                        aria-label="Filter transaksi ditolak"
                        placeholder="Cari transaksi..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Kategori penolakan"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {['Semua', 'Duplikat', 'Nominal salah', 'Wallet tak berwenang'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.tableScroll}>
                    <table>
                      <thead>
                        <tr>
                          <th>Penerima / Tx hash</th>
                          <th>Program</th>
                          <th>Kategori</th>
                          <th>Alasan penolakan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.hash}>
                            <td>
                              <strong>{row.name}</strong>
                              <small>
                                {row.hash} · #{row.block}
                              </small>
                            </td>
                            <td>{row.program}</td>
                            <td>
                              <span
                                className={
                                  row.category === 'Nominal salah'
                                    ? styles.warning
                                    : styles.negative
                                }
                              >
                                {row.category}
                              </span>
                            </td>
                            <td>{row.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!rows.length && (
                      <p className={styles.empty}>
                        Tidak ada transaksi yang sesuai dengan pencarian.
                      </p>
                    )}
                  </div>
                  <div className={styles.tableFooter}>
                    Menampilkan {rows.length} dari 5 transaksi contoh
                    <span>Data sensitif disamarkan</span>
                  </div>
                </section>
                <div className={styles.rightStack}>
                  <section className={styles.card} id="jaringan">
                    <div className={styles.cardHeading}>
                      <div>
                        <h2>Status validator</h2>
                        <p>Konsensus QBFT · Proof of Authority</p>
                      </div>
                      <span className={styles.positive}>4/4 online</span>
                    </div>
                    <div className={styles.validators}>
                      {['Kemensos', 'Kemenkeu', 'BPKP Audit', 'Bank Himbara'].map((name, i) => (
                        <div key={name}>
                          <div>
                            <strong>VAL-0{i + 1}</strong>
                            <span className={styles.statusDot} />
                          </div>
                          <p>{name}</p>
                          <small>Sinkron · {11 + i} ms</small>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
          <footer className={styles.footer}>
            <span>© 2026 BansosLedger. Transparansi untuk setiap bantuan.</span>
            <span>Dashboard pengelola</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
