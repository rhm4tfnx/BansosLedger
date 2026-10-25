'use client'

import { useState } from 'react'
import { Users, Layers, ArrowLeftRight, Search, ArrowUpRight, Plus, RotateCw, Download, ShieldCheck, Clock3, X, ArrowRight } from 'lucide-react'
import { DistributionCharts } from './distribution-charts'
import { rejectedTransactions } from '@/constants/dashboard'
import { useDashboardSearch } from '../dashboard-shell'
import styles from './dashboard.module.css'

export function Dashboard() {
  const { query, setQuery } = useDashboardSearch()
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
  )
}
