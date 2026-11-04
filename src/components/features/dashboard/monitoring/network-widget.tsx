'use client'

import { useNetworkStatusQuery } from '@/lib/api/hooks'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import s from '@/components/features/dashboard/monitoring/monitoring.module.css'

export function NetworkWidget() {
  const query = useNetworkStatusQuery()
  const network = query.data
  return (
    <section className={s.card} aria-label="Ringkasan jaringan publik">
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>TRANSPARANSI KONSENSUS · PUBLIK &amp; AUDITOR</span>
          <h2>Kesehatan jaringan BansosLedger</h2>
          <p>Kabupaten Barru · Data langsung dari node jaringan.</p>
        </div>
        <span className={s.badge}>
          {network ? (network.validatorCount === null ? '-' : `${network.validatorCount} validator`) : '-'}
        </span>
      </header>
      {query.isPending ? (
        <TableSkeleton rows={3} label="Memuat status jaringan" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : network ? (
        <>
          <p className={s.meta}>
            Blok terakhir #{network.latestBlock.toLocaleString('id-ID')} · {network.timestampWita} · Status {network.status}
          </p>
          {network.validators.length === 0 ? (
            <EmptyState>Daftar validator belum tersedia.</EmptyState>
          ) : (
            <div className={s.institutions}>
              {network.validators.map((v) => (
                <span key={v.address}>
                  <i className={s.dot} />
                  {v.institution} <HashLink hash={v.address} short={v.addressShort} kind="address" />
                </span>
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
