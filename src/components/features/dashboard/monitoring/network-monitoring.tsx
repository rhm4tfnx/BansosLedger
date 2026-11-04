'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, Activity, Server } from 'lucide-react'
import { NetworkWidget } from '@/components/features/dashboard/monitoring/network-widget'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import { useExplorerValidatorsQuery, useNetworkStatusQuery, useWalletStatusQuery } from '@/lib/api/hooks'
import s from '@/components/features/dashboard/monitoring/monitoring.module.css'

const NETWORK_POLL_MS = 10_000

function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

export function NetworkMonitoring() {
  const [tabVisible, setTabVisible] = useState(isDocumentVisible)
  useEffect(() => {
    const handleVisibility = () => setTabVisible(isDocumentVisible())
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const networkQuery = useNetworkStatusQuery({
    refetchInterval: tabVisible ? NETWORK_POLL_MS : false,
  })
  const validatorsQuery = useExplorerValidatorsQuery()
  const walletQuery = useWalletStatusQuery()
  const network = networkQuery.data
  const validators = validatorsQuery.data
  const wallet = walletQuery.data
  const locked = network?.status === 'Berhenti'
  const warning = network?.status === 'Terganggu'

  return (
    <>
      <div className={s.page}>
        <header className={s.hero}>
          <div>
            <span className={s.eyebrow}>
              <Activity size={14} /> INFRASTRUKTUR / MONITORING
            </span>
            <h1>Status jaringan</h1>
            <p>Monitoring jaringan &amp; kesehatan konsensus Hyperledger Besu QBFT.</p>
          </div>
          <div className={s.actions}>
            <Link href="/explorer">
              Widget publik <span aria-hidden>↗</span>
            </Link>
          </div>
        </header>
        {networkQuery.isPending ? (
          <TableSkeleton rows={2} label="Memuat status jaringan" />
        ) : networkQuery.isError ? (
          <ErrorState error={networkQuery.error} onRetry={() => void networkQuery.refetch()} />
        ) : network ? (
          <section
            className={`${s.safety} ${locked ? s.critical : warning ? s.warning : ''}`}
            aria-live="polite"
          >
            {locked ? <ShieldAlert size={30} /> : <ShieldCheck size={30} />}
            <div>
              <span className={s.eyebrow}>
                STATUS · {locked ? 'JARINGAN BERHENTI' : warning ? 'PERINGATAN RISIKO' : 'OPERASIONAL NORMAL'}
              </span>
              <h2>
                {locked
                  ? 'Jaringan berhenti — penyaluran tidak dapat diproses'
                  : warning
                    ? 'Jaringan terganggu — blok terbaru tertunda'
                    : 'Jaringan beroperasi normal'}
              </h2>
              <p>
                Blok terakhir #{network.latestBlock.toLocaleString('id-ID')} · {network.timestampWita} ·{' '}
                {network.ageSeconds} detik yang lalu.
              </p>
            </div>
          </section>
        ) : null}
        <section className={s.card}>
          <header className={s.heading}>
            <div>
              <span className={s.eyebrow}>KONSENSUS HYPERLEDGER BESU QBFT</span>
              <h2>Validator institusional</h2>
              <p>Daftar validator yang menandatangani blok jaringan.</p>
            </div>
            <span className={s.badge}>
              {validators ? (validators.count === null ? '-' : `${validators.count} validator`) : '-'}
            </span>
          </header>
          {validatorsQuery.isPending ? (
            <TableSkeleton rows={3} label="Memuat validator" />
          ) : validatorsQuery.isError ? (
            <ErrorState error={validatorsQuery.error} onRetry={() => void validatorsQuery.refetch()} />
          ) : validators && validators.items.length > 0 ? (
            <div className={s.validators}>
              {validators.items.map((v, i) => (
                <article className={s.node} key={v.address}>
                  <div className={s.heading}>
                    <Server size={19} />
                    <span className={s.good}>TERDAFTAR</span>
                  </div>
                  <span className={s.eyebrow}>BESU-VAL{i + 1}</span>
                  <h3>{v.institution}</h3>
                  <dl>
                    <dt>Alamat node</dt>
                    <dd>
                      <HashLink hash={v.address} short={v.addressShort} kind="address" />
                    </dd>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>Belum ada data validator.</EmptyState>
          )}
        </section>
        <div className={s.metrics}>
          {[
            ['Block height terbaru', network ? `#${network.latestBlock.toLocaleString('id-ID')}` : '-', 'Blok terakhir terfinalisasi'],
            ['Umur blok terakhir', network ? `${network.ageSeconds} dtk` : '-', 'Sejak blok terakhir dibuat'],
            ['Status jaringan', network?.status ?? '-', 'Diperbarui otomatis tiap 10 detik'],
            ['Jumlah validator', network?.validatorCount === null || !network ? '-' : String(network.validatorCount), 'Validator aktif'],
          ].map(([title, value, sub]) => (
            <article className={s.card} key={title}>
              <p>{title}</p>
              <strong className={s.value}>{value}</strong>
              <small>{sub}</small>
            </article>
          ))}
        </div>
        <section className={s.card}>
          <header className={s.heading}>
            <div>
              <span className={s.eyebrow}>ARSITEKTUR KEAMANAN WEB3</span>
              <h2>Pemisahan kunci konsensus &amp; otorisasi aplikasi</h2>
            </div>
            <span className={s.badge}>Rancangan kriptografis</span>
          </header>
          <div className={s.columns}>
            <article className={s.inset}>
              <h3>Kunci identitas node validator Besu</h3>
              <p>
                Khusus block sealing dan voting konsensus. Tidak memberikan hak menjalankan fungsi
                smart contract.
              </p>
            </article>
            <article className={s.inset}>
              <h3>Wallet otorisasi Kelurahan</h3>
              <p>Signer aplikasi yang diotorisasi pada kontrak BansosDisbursementRegistry.</p>
              {walletQuery.isPending ? (
                <TableSkeleton rows={1} label="Memuat status wallet" />
              ) : walletQuery.isError ? (
                <ErrorState error={walletQuery.error} onRetry={() => void walletQuery.refetch()} />
              ) : (
                <HashLink hash={wallet?.authorizedWallet ?? null} short={wallet?.authorizedWalletShort ?? '-'} kind="address" />
              )}
            </article>
          </div>
        </section>
        <NetworkWidget />
      </div>
    </>
  )
}
