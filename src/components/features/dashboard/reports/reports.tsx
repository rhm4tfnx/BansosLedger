'use client'
import { Suspense, useState } from 'react'
import { FileText, Download, ShieldCheck, ArrowUpRight, RotateCw, Users, Wallet, Coins } from 'lucide-react'
import { useUrlParams } from '@/hooks/use-url-params'
import {
  useExportReportCsvMutation,
  useRealizationReportQuery,
  useReconciliationReportQuery,
} from '@/lib/api/hooks/reports'
import { useProgramsQuery } from '@/lib/api/hooks/programs'
import { formatApiError } from '@/lib/api/errors'
import {
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import { ReportCharts } from '@/components/features/dashboard/reports/report-charts'
import type { ReconciliationAnomalyViewModel } from '@/types'
import s from '@/components/features/dashboard/reports/reports.module.css'

const PAGE_SIZE = 20

function Tag({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={`${s.tag} ${tone === 'green' ? s.green : tone === 'amber' ? s.amber : tone === 'red' ? s.red : ''}`}
    >
      {children}
    </span>
  )
}
function Heading({
  number,
  title,
  description,
  action,
}: {
  number: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className={s.heading}>
      <div>
        <span className={s.eyebrow}>BAGIAN {number}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}

function AnomalyList({ title, items }: { title: string; items: ReconciliationAnomalyViewModel[] }) {
  return (
    <div className={s.inset}>
      <h3>
        {title} <Tag tone={items.length ? 'red' : 'green'}>{items.length}</Tag>
      </h3>
      {items.length === 0 ? (
        <p>Tidak ada anomali.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={`${item.refId}-${item.code}`}>
              <strong title={item.refId}>{item.refIdShort}</strong> · <code>{item.code}</code>
              <p>{item.message}</p>
              <HashLink hash={item.txHash} short={item.txHashShort} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReportsContent() {
  const { get, getPage, set } = useUrlParams()
  const [notice, setNotice] = useState('')
  const programId = get('programId')
  const periodRaw = get('period')
  const period = /^\d{6}$/.test(periodRaw) ? Number(periodRaw) : undefined
  const page = getPage()

  const programs = useProgramsQuery({ limit: 100 })
  const report = useRealizationReportQuery({
    programId: programId || undefined,
    period,
    page,
    limit: PAGE_SIZE,
    sort: get('sort') || undefined,
  })
  const reconciliation = useReconciliationReportQuery({})
  const exportCsv = useExportReportCsvMutation()

  async function downloadCsv() {
    try {
      const csv = await exportCsv.mutateAsync({ programId: programId || undefined, period })
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'laporan-realisasi.csv'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('CSV berhasil diunduh. NIK pada ekspor selalu disamarkan.')
    } catch (error) {
      const formatted = formatApiError(error)
      setNotice(`${formatted.message}${formatted.requestId ? ` (ID permintaan: ${formatted.requestId})` : ''}`)
    }
  }

  const summary = report.data?.summary
  const stats = summary
    ? [
        { icon: Users, label: 'Jumlah penerima', value: `${summary.realisasiCount} KPM`, note: `Dari target ${summary.target} KPM` },
        { icon: Wallet, label: 'Total pagu anggaran', value: summary.paguFormatted, note: 'Alokasi program' },
        { icon: Coins, label: 'Dana tersalurkan', value: summary.realisasiFormatted, note: 'Nominal berstatus SUCCESS' },
        { icon: ArrowUpRight, label: 'Persentase realisasi', value: `${summary.percentage}%`, note: `Sisa ${summary.sisaFormatted} dari pagu` },
      ]
    : []

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div>
          <div className={s.titleIcon}>
            <FileText size={20} />
            <span>LAPORAN REALISASI</span>
          </div>
          <h1>Laporan Realisasi</h1>
          <p>Rekap penyaluran yang transparan dan dapat diverifikasi di blockchain.</p>
        </div>
        <div className={s.actions}>
          <button onClick={() => void downloadCsv()} disabled={exportCsv.isPending}>
            <Download size={15} />
            {exportCsv.isPending ? 'Mengunduh…' : 'Ekspor CSV'}
          </button>
        </div>
      </header>
      <div className={s.context}>
        <ShieldCheck size={18} />
        <span>
          <strong>Data langsung dari server</strong> · NIK selalu disamarkan pada tampilan dan ekspor.
        </span>
      </div>
      {notice && (
        <div className={s.notice} role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Tutup pemberitahuan">
            ×
          </button>
        </div>
      )}
      <section className={s.card}>
        <Heading
          number="01 · REKAP OPERASIONAL"
          title="Realisasi penyaluran bantuan"
          description="Pantau penerima, penyerapan pagu, dan realisasi berdasarkan cakupan laporan."
        />
        <div className={s.filters}>
          <label>
            Program bansos
            <select value={programId} onChange={(e) => set({ programId: e.target.value })}>
              <option value="">Semua program</option>
              {(programs.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Periode penyaluran
            <input
              type="month"
              value={/^\d{6}$/.test(periodRaw) ? `${periodRaw.slice(0, 4)}-${periodRaw.slice(4)}` : ''}
              onChange={(e) => set({ period: e.target.value.replace('-', '') })}
            />
          </label>
          <button onClick={() => set({ programId: null, period: null })}>
            <RotateCw size={14} />
            Reset filter
          </button>
        </div>
        {report.isPending ? (
          <TableSkeleton rows={6} label="Memuat laporan realisasi" />
        ) : report.isError ? (
          <ErrorState error={report.error} onRetry={() => void report.refetch()} />
        ) : (
          <>
            <div className={s.stats}>
              {stats.map((r, i) => (
                <div className={s.stat} key={r.label}>
                  <div className={s.spread}>
                    <span>{r.label}</span>
                    <r.icon size={17} />
                  </div>
                  <strong className={i === 2 ? s.blueText : i === 3 ? s.greenText : ''}>{r.value}</strong>
                  {i === 3 && <progress max={100} value={summary?.percentage ?? 0} aria-label="Persentase realisasi" />}
                  <small>{r.note}</small>
                </div>
              ))}
            </div>
            {summary && <ReportCharts summary={summary} />}
            {report.data.items.length === 0 ? (
              <EmptyState>Tidak ada rekap untuk kombinasi filter ini.</EmptyState>
            ) : (
              <>
                <div className={s.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        {['Penerima', 'Periode', 'Nominal', 'Tanggal salur', 'TxHash'].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.data.items.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.recipientName}</strong>
                            <small className={s.mono}>NIK: {r.recipientNikMasked}</small>
                          </td>
                          <td>{r.periodLabel}</td>
                          <td className={s.money}>{r.amountFormatted}</td>
                          <td>{r.disbursedDateLabel}</td>
                          <td>
                            <HashLink hash={r.txHash} short={r.txHashShort} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={report.data.page}
                  totalPages={report.data.totalPages}
                  total={report.data.total}
                  onPage={(next) => set({ page: next }, false)}
                />
              </>
            )}
          </>
        )}
      </section>
      <section className={s.card} id="rekonsiliasi">
        <Heading
          number="02 · AUDIT KRIPTOGRAFIS"
          title="Rekonsiliasi off-chain & on-chain"
          description="Perbandingan koleksi MongoDB dengan state Smart Contract Hyperledger Besu QBFT."
          action={
            <div className={s.actions}>
              <button onClick={() => void reconciliation.refetch()} disabled={reconciliation.isFetching}>
                <RotateCw size={15} />
                Muat ulang
              </button>
            </div>
          }
        />
        {reconciliation.isPending ? (
          <TableSkeleton rows={4} label="Memuat rekonsiliasi" />
        ) : reconciliation.isError ? (
          <ErrorState error={reconciliation.error} onRetry={() => void reconciliation.refetch()} />
        ) : (
          <>
            <div className={s.auditGrid}>
              <div className={s.inset}>
                <h3>Database off-chain</h3>
                <small>MongoDB · transaksi SUCCESS</small>
                <dl>
                  <div>
                    <dt>Record tersimpan</dt>
                    <dd>{reconciliation.data.dbCount}</dd>
                  </div>
                  <div>
                    <dt>Total nominal</dt>
                    <dd>{reconciliation.data.dbAmountFormatted}</dd>
                  </div>
                </dl>
              </div>
              <div className={s.inset}>
                <h3>Ledger on-chain</h3>
                <small>Hyperledger Besu QBFT</small>
                <dl>
                  <div>
                    <dt>Event smart contract</dt>
                    <dd>{reconciliation.data.chainCount}</dd>
                  </div>
                  <div>
                    <dt>Total nominal</dt>
                    <dd>{reconciliation.data.chainAmountFormatted}</dd>
                  </div>
                  <div>
                    <dt>Terindeks sampai blok</dt>
                    <dd>#{reconciliation.data.indexedThrough}</dd>
                  </div>
                </dl>
              </div>
              <div className={`${s.inset} ${reconciliation.data.isBalanced ? s.auditSuccess : s.auditError}`}>
                <Tag tone={reconciliation.data.isBalanced ? 'green' : 'red'}>
                  {reconciliation.data.isBalanced ? '✓ Seimbang' : '× Tidak seimbang'}
                </Tag>
                <h3>
                  {reconciliation.data.isBalanced
                    ? 'Data off-chain dan on-chain konsisten'
                    : 'Terdapat selisih data off-chain dan on-chain'}
                </h3>
                <p aria-live="polite">
                  {reconciliation.data.missingEvents.length + reconciliation.data.inconsistentEvents.length} anomali
                  terdeteksi pada halaman ini.
                </p>
              </div>
            </div>
            <div className={s.auditGrid}>
              <AnomalyList title="Event hilang" items={reconciliation.data.missingEvents} />
              <AnomalyList title="Event tidak konsisten" items={reconciliation.data.inconsistentEvents} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export function Reports() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ReportsContent />
    </Suspense>
  )
}
