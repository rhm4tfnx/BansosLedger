'use client'

import { Suspense } from 'react'
import { AlertTriangle, CheckCircle2, FileCheck2, RotateCw, ShieldCheck } from 'lucide-react'
import { useUrlParams } from '@/hooks/use-url-params'
import { useReconciliationReportQuery } from '@/lib/api/hooks/reports'
import { VerificationSecurity } from '@/components/features/dashboard/verification/verification-security'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import {
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import type { ReconciliationAnomalyViewModel } from '@/types'
import s from '@/components/features/dashboard/verification/verification.module.css'

type AnomalyFilter = 'all' | 'missing' | 'inconsistent'

interface TaggedAnomaly extends ReconciliationAnomalyViewModel {
  category: 'missing' | 'inconsistent'
  categoryLabel: string
}

function parseAnomalyFilter(value: string): AnomalyFilter {
  if (value === 'missing' || value === 'inconsistent') return value
  return 'all'
}

function VerificationContent() {
  const { get, getPage, set } = useUrlParams()
  const tab = get('tab') === 'keamanan' ? 'keamanan' : 'rekonsiliasi'
  const filter = parseAnomalyFilter(get('type'))
  const page = getPage()
  const sort = get('sort') || '-createdAt'

  const reconciliation = useReconciliationReportQuery({
    page,
    limit: 20,
    sort,
  })
  const data = reconciliation.data

  const allAnomalies: TaggedAnomaly[] = data
    ? [
        ...data.missingEvents.map((item) => ({
          ...item,
          category: 'missing' as const,
          categoryLabel: 'Event on-chain belum ditemukan',
        })),
        ...data.inconsistentEvents.map((item) => ({
          ...item,
          category: 'inconsistent' as const,
          categoryLabel: 'Atribut tidak konsisten',
        })),
      ]
    : []

  const filteredAnomalies = allAnomalies.filter(
    (item) => filter === 'all' || item.category === filter,
  )

  const hasMoreAnomalies = Boolean(
    data &&
      (data.missingEvents.length >= data.limitPerCategory ||
        data.inconsistentEvents.length >= data.limitPerCategory),
  )
  const totalPages = hasMoreAnomalies ? page + 1 : page

  return (
    <div className={s.page}>
      <div className={s.breadcrumb}>
        Dashboard <span>/</span> Verifikasi integritas
      </div>
      <header className={s.hero}>
        <div>
          <span className={s.eyebrow}>
            <ShieldCheck size={15} /> INTEGRITAS &amp; REKONSILIASI
          </span>
          <h1>Verifikasi integritas dua arah</h1>
          <p>Perbandingan langsung penyaluran berstatus SUCCESS di MongoDB terhadap event kontrak pintar Besu.</p>
        </div>
      </header>

      <div className={s.toolbar}>
        <span className={s.badge}>
          {data ? `Terindeks sampai blok #${data.indexedThrough.toLocaleString('id-ID')}` : 'Memeriksa indeks blok…'}
        </span>
        <button
          type="button"
          className={s.primary}
          disabled={reconciliation.isFetching}
          onClick={() => void reconciliation.refetch()}
        >
          <RotateCw size={15} />
          {reconciliation.isFetching ? 'Memeriksa…' : 'Muat ulang rekonsiliasi'}
        </button>
      </div>

      <nav className={s.tabs} aria-label="Bagian verifikasi">
        <button
          type="button"
          aria-pressed={tab === 'rekonsiliasi'}
          onClick={() => set({ tab: null }, false)}
        >
          <span>01</span>
          Perbandingan DB vs on-chain
        </button>
        <button
          type="button"
          aria-pressed={tab === 'keamanan'}
          onClick={() => set({ tab: 'keamanan' }, false)}
        >
          <span>02</span>
          Arsitektur keamanan
        </button>
      </nav>

      {reconciliation.isPending ? (
        <TableSkeleton rows={6} label="Memuat hasil rekonsiliasi" />
      ) : reconciliation.isError ? (
        <ErrorState error={reconciliation.error} onRetry={() => void reconciliation.refetch()} />
      ) : !data ? (
        <EmptyState>Data rekonsiliasi belum tersedia.</EmptyState>
      ) : tab === 'keamanan' ? (
        <VerificationSecurity />
      ) : (
        <>
          <section className={s.card} aria-live="polite">
            <div className={s.heading}>
              <div>
                <span className={s.eyebrow}>OFF-CHAIN ↔ ON-CHAIN</span>
                <h2>Ringkasan perbandingan nyata</h2>
              </div>
              <span className={s.badge}>
                {data.isBalanced ? (
                  <>
                    <CheckCircle2 size={14} aria-hidden="true" /> Seimbang
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} aria-hidden="true" /> Tidak seimbang
                  </>
                )}
              </span>
            </div>

            <div className={s.stats}>
              <article className={`${s.stat} ${s.good}`}>
                <strong>Transaksi DB (SUCCESS)</strong>
                <div className={s.number}>
                  {data.dbCount}
                  <FileCheck2 size={21} />
                </div>
                <p>Nominal DB: {data.dbAmountFormatted}</p>
              </article>
              <article className={`${s.stat} ${data.isBalanced ? s.good : s.warn}`}>
                <strong>Event tercatat di blockchain</strong>
                <div className={s.number}>
                  {data.chainCount}
                  <FileCheck2 size={21} />
                </div>
                <p>Nominal on-chain: {data.chainAmountFormatted}</p>
              </article>
              <article className={`${s.stat} ${data.missingEvents.length === 0 ? s.good : s.warn}`}>
                <strong>Event on-chain hilang</strong>
                <div className={s.number}>
                  {data.missingEvents.length}
                  <FileCheck2 size={21} />
                </div>
                <p>Tercatat di DB namun event belum terindeks</p>
              </article>
              <article className={`${s.stat} ${data.inconsistentEvents.length === 0 ? s.good : s.bad}`}>
                <strong>Event tidak konsisten</strong>
                <div className={s.number}>
                  {data.inconsistentEvents.length}
                  <FileCheck2 size={21} />
                </div>
                <p>Perbedaan atribut antara DB dan event kontrak</p>
              </article>
            </div>
          </section>

          <section className={s.card}>
            <div className={s.heading}>
              <div className={s.filters}>
                <button
                  type="button"
                  aria-pressed={filter === 'all'}
                  onClick={() => set({ type: null })}
                >
                  Semua anomali ({allAnomalies.length})
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'missing'}
                  onClick={() => set({ type: 'missing' })}
                >
                  Event hilang ({data.missingEvents.length})
                </button>
                <button
                  type="button"
                  aria-pressed={filter === 'inconsistent'}
                  onClick={() => set({ type: 'inconsistent' })}
                >
                  Tidak konsisten ({data.inconsistentEvents.length})
                </button>
              </div>
              <small>Blok terindeks: #{data.indexedThrough.toLocaleString('id-ID')}</small>
            </div>

            {filteredAnomalies.length === 0 ? (
              <EmptyState>
                {data.isBalanced
                  ? 'Seluruh transaksi SUCCESS pada database konsisten dengan catatan blockchain.'
                  : 'Tidak ada anomali pada kategori ini di halaman saat ini.'}
              </EmptyState>
            ) : (
              <>
                <div className={s.scroll}>
                  <table className={s.transactions}>
                    <thead>
                      <tr>
                        <th>Referensi penyaluran</th>
                        <th>Kategori anomali</th>
                        <th>Kode pemeriksaan</th>
                        <th>Rincian temuan</th>
                        <th>TxHash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnomalies.map((item) => (
                        <tr key={`${item.category}-${item.refId}-${item.code}`}>
                          <td>
                            <strong title={item.refId}>{item.refIdShort}</strong>
                          </td>
                          <td>
                            <span className={`${s.status} ${s.error}`}>
                              <AlertTriangle size={13} aria-hidden="true" /> {item.categoryLabel}
                            </span>
                          </td>
                          <td>
                            <code>{item.code}</code>
                          </td>
                          <td>{item.message}</td>
                          <td>
                            <HashLink hash={item.txHash} short={item.txHashShort} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={page}
                  totalPages={totalPages}
                  total={filteredAnomalies.length}
                  onPage={(next) => set({ page: next }, false)}
                />
              </>
            )}
          </section>
        </>
      )}

      <footer className={s.footer}>
        BansosLedger · Verifikasi integritas <span>Privasi terlindungi · NIK tidak pernah dimuat</span>
      </footer>
    </div>
  )
}

export function Verification() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} label="Memuat halaman verifikasi" />}>
      <VerificationContent />
    </Suspense>
  )
}
