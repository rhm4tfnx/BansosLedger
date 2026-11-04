'use client'

import { useState } from 'react'
import { Users, Layers, ArrowLeftRight, Search, ArrowUpRight, Plus, RotateCw, Download, ShieldCheck, Clock3, X, ArrowRight, CheckCircle2, AlertTriangle, CircleDashed } from 'lucide-react'
import { DistributionCharts } from './distribution-charts'
import { useDashboardSearch } from '../dashboard-shell'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useRouter } from 'next/navigation'
import { useDashboardSummaryQuery, useNetworkStatusQuery } from '@/lib/api/hooks'
import type { DashboardRecentTxViewModel } from '@/types'
import { COMING_SOON_TITLE, EmptyState, ErrorState, TableSkeleton } from '../shared/states'
import { HashLink } from '../shared/hash-link'
import styles from './dashboard.module.css'

function TxStatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS') {
    return (
      <span className={styles.positive}>
        <CheckCircle2 size={14} aria-hidden="true" /> Berhasil
      </span>
    )
  }
  if (status === 'FAILED') {
    return (
      <span className={styles.negative}>
        <AlertTriangle size={14} aria-hidden="true" /> Gagal
      </span>
    )
  }
  return (
    <span className={styles.warning}>
      <CircleDashed size={14} aria-hidden="true" /> {status === 'PENDING' ? 'Menunggu' : 'Draf'}
    </span>
  )
}

function matches(row: DashboardRecentTxViewModel, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return `${row.refId} ${row.txHash ?? ''} ${row.programId} ${row.periodLabel}`.toLowerCase().includes(q)
}

export function Dashboard() {
  const router = useRouter()
  const { can, meta } = useRoleAccess()
  const { query, setQuery } = useDashboardSearch()
  const [notice, setNotice] = useState('')
  const summaryQuery = useDashboardSummaryQuery()
  const networkQuery = useNetworkStatusQuery()
  const summary = summaryQuery.data
  const network = networkQuery.data ?? summary?.network
  const rows = summary ? summary.recentTransactions.filter((r) => matches(r, query)) : []
  const dash = (value: string | number | undefined) => (value === undefined ? '-' : value)
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
            {meta?.shortLabel ?? 'Belum Login'}
          </span>
          <span className={styles.period}>Tahun anggaran 2026</span>
        </div>
        <div>
          {can('report:read') && (
            <button onClick={() => router.push('/dashboard/laporan')}>
              <Download size={16} />
              Unduh laporan
            </button>
          )}
          {can('transaction:sign') && (
            <button disabled title={COMING_SOON_TITLE}>
              <RotateCw size={16} />
              Retry pending
            </button>
          )}
          {can('disbursement:create') && (
            <button className={styles.primaryButton} disabled title={COMING_SOON_TITLE}>
              <Plus size={17} />
              Salurkan batch baru
            </button>
          )}
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
      {summaryQuery.isError ? (
        <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : (
        <section className={styles.stats} aria-label="Statistik penyaluran" aria-busy={summaryQuery.isPending}>
          <article id="penerima">
            <div className={styles.statTop}>
              <span>Penerima final</span>
              <Users size={19} />
            </div>
            <strong>
              {dash(summary?.finalRecipients)}
              <span>KPM</span>
            </strong>
            <div className={styles.statDetail}>Penerima berstatus FINAL</div>
          </article>
          <article>
            <div className={styles.statTop}>
              <span>Program aktif</span>
              <Layers size={19} />
            </div>
            <strong>
              {dash(summary?.activePrograms)}
              <span>program</span>
            </strong>
            <div className={styles.statDetail}>Pagu total {dash(summary?.paguFormatted)}</div>
          </article>
          <article>
            <div className={styles.statTop}>
              <span>Dana tersalurkan</span>
              <ArrowUpRight size={19} />
            </div>
            <strong>{dash(summary?.realisasiFormatted)}</strong>
            <div className={styles.statFooter}>
              <span className={styles.positive}>{summary ? `${summary.percentage}%` : '-'}</span>
              <span>dari total pagu</span>
            </div>
            <div className={styles.progress}>
              <i style={{ width: `${Math.min(Math.max(summary?.percentage ?? 0, 0), 100)}%` }} />
            </div>
          </article>
          <article>
            <div className={styles.statTop}>
              <span>Transaksi on-chain</span>
              <ArrowLeftRight size={19} />
            </div>
            <strong>{dash(summary?.realisasiCount)}</strong>
            <div className={styles.statFooter}>
              <span className={styles.positive}>Terverifikasi</span>
              <span>tercatat di blockchain</span>
            </div>
            <div className={styles.statDetail}>
              Blok terakhir {network ? `#${network.latestBlock.toLocaleString('id-ID')}` : '-'}
            </div>
          </article>
          <article>
            <div className={styles.statTop}>
              <span>Perlu perhatian</span>
              <Clock3 size={19} />
            </div>
            <strong>
              {summary ? summary.pending + summary.failed : '-'}
              <span>transaksi</span>
            </strong>
            <div className={styles.statFooter}>
              <span className={styles.warning}>{dash(summary?.pending)} menunggu</span>
              <span className={styles.negative}>{dash(summary?.failed)} gagal</span>
            </div>
            <a className={styles.statDetail} href="#transaksi-terbaru">
              Tinjau transaksi <ArrowRight size={13} />
            </a>
          </article>
        </section>
      )}
      <DistributionCharts />
      <div className={styles.bottomGrid}>
        <section className={styles.card} id="transaksi-terbaru">
          <div className={styles.cardHeading}>
            <div>
              <h2>Penyaluran terbaru</h2>
              <p>Transaksi penyaluran terakhir beserta status verifikasinya.</p>
            </div>
          </div>
          <div className={styles.tableTools}>
            <label>
              <Search size={16} />
              <input
                aria-label="Filter penyaluran terbaru"
                placeholder="Cari transaksi..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          {summaryQuery.isPending ? (
            <TableSkeleton rows={5} label="Memuat penyaluran terbaru" />
          ) : summaryQuery.isError ? (
            <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
          ) : (
            <>
              <div className={styles.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th>Ref / Tx hash</th>
                      <th>Periode</th>
                      <th>Nominal</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.refIdShort}</strong>
                          <small>
                            <HashLink hash={row.txHash} short={row.txHashShort} />
                          </small>
                        </td>
                        <td>{row.periodLabel}</td>
                        <td>{row.amountFormatted}</td>
                        <td>
                          <TxStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && <EmptyState>Tidak ada penyaluran yang sesuai.</EmptyState>}
              </div>
              <div className={styles.tableFooter}>
                Menampilkan {rows.length} dari {summary?.recentTransactions.length ?? 0} penyaluran terbaru
                <span>Data sensitif disamarkan</span>
              </div>
            </>
          )}
        </section>
        <div className={styles.rightStack}>
          <section className={styles.card} id="jaringan">
            <div className={styles.cardHeading}>
              <div>
                <h2>Status jaringan</h2>
                <p>Konsensus QBFT · Proof of Authority</p>
              </div>
              <span className={styles.positive}>
                {network ? (network.validatorCount === null ? '-' : `${network.validatorCount} validator`) : '-'}
              </span>
            </div>
            {summaryQuery.isPending ? (
              <TableSkeleton rows={2} label="Memuat status jaringan" />
            ) : network ? (
              <div className={styles.validators}>
                <div>
                  <div>
                    <strong>Blok terakhir</strong>
                    <span className={styles.statusDot} />
                  </div>
                  <p>#{network.latestBlock.toLocaleString('id-ID')}</p>
                  <small>{network.timestampWita}</small>
                </div>
                <div>
                  <div>
                    <strong>Validator</strong>
                  </div>
                  <p>{network.validatorCount === null ? '-' : network.validatorCount}</p>
                  <small>Status {network.status}</small>
                </div>
              </div>
            ) : (
              <EmptyState>Status jaringan belum tersedia.</EmptyState>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
