'use client'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useDisbursementDetailQuery, usePublicEvidenceQuery } from '@/lib/api/hooks/disbursements'
import { COMING_SOON_TITLE, ErrorState, TableSkeleton } from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import type { DisbursementStatus } from '@/lib/api-contract'
import s from '@/components/features/dashboard/disbursements/disbursements.module.css'

export const STATUS_ICON: Record<DisbursementStatus, string> = {
  DRAFT: '✎',
  PENDING: '◷',
  SUCCESS: '✓',
  FAILED: '×',
}

/** Status badge: always icon + text, never colour only (PRD 13.2). */
export function StatusBadge({ status }: { status: DisbursementStatus }) {
  return (
    <span className={`${s.badge} ${s[status] ?? ''}`} aria-live="polite">
      <span aria-hidden="true">{STATUS_ICON[status]}</span> {status}
    </span>
  )
}

function buildFallbackGatewayUrl(cid: string): string {
  const base = (process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud')
    .replace(/\/$/, '')
    .replace(/\/ipfs$/, '')
  return `${base}/ipfs/${encodeURIComponent(cid)}`
}

export function DisbursementDetail({ id, onBack }: { id: string; onBack?: () => void }) {
  const { can } = useRoleAccess()
  const query = useDisbursementDetailQuery(id)
  const row = query.data
  const publicEvidence = usePublicEvidenceQuery(id, row?.status === 'SUCCESS')

  if (query.isPending) return <div className={s.page}><TableSkeleton rows={8} label="Memuat detail penyaluran" /></div>
  if (query.isError || !row) {
    return (
      <div className={s.page}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        {onBack && <button onClick={onBack}>Kembali ke tabel penyaluran</button>}
      </div>
    )
  }
  const gatewayByCid = new Map((publicEvidence.data ?? []).map((item) => [item.cid, item.gatewayUrl]))
  const txHash = row.chain?.txHash ?? null

  return (
    <div className={s.page}>
      <div className={s.dark}>
        <div className={s.grid}>
          <div>
            <small>BESU QBFT EXPLORER</small>
            <h2>Detail Penyaluran &amp; Catatan On-Chain</h2>
            <p>Pelacakan catatan penyaluran dan transaksi on-chain.</p>
            <code>{txHash ? `/explorer/tx/${txHash}` : 'Transaksi belum memiliki hash on-chain'}</code>
          </div>
          <div>
            {onBack && <button onClick={onBack} style={{ marginTop: 12 }}>Kembali ke tabel penyaluran</button>}
          </div>
        </div>
      </div>
      <div className={`${s.card} ${s[row.status] ?? ''}`}>
        <div className={s.row}>
          <div>
            <StatusBadge status={row.status} /> <b title={row.refId}>{row.refIdShort}</b>
            <p>{row.createdAtWita}</p>
          </div>
          <div>
            <b>{row.amountFormatted}</b>
            <p>{row.programCode} · {row.periodLabel}</p>
          </div>
        </div>
        <p>{row.recipientName} · NIK {row.recipientNikMasked}</p>
        <p>{row.programCode} — {row.programName}</p>
        {row.status === 'FAILED' && row.lastErrorMessage && <p role="alert">{row.lastErrorMessage}</p>}
        {row.note && <p>Catatan: {row.note}</p>}
        <div className={s.actions}>
          {can('transaction:sign') && row.status !== 'SUCCESS' && (
            <button disabled title={COMING_SOON_TITLE}>Kirim ulang</button>
          )}
          {can('disbursement:create') && row.status === 'DRAFT' && (
            <>
              <button disabled title={COMING_SOON_TITLE}>Konfirmasi</button>
              <button disabled title={COMING_SOON_TITLE}>Hapus draf</button>
            </>
          )}
        </div>
      </div>
      <div className={s.card}>
        <h2>Riwayat percobaan</h2>
        {row.attempts.length === 0 ? (
          <p className={s.empty}>Belum ada percobaan pengiriman.</p>
        ) : (
          <ol className={s.grid} aria-live="polite" style={{ listStyle: 'none', padding: 0 }}>
            {row.attempts.map((attempt, i) => (
              <li className={s.phase} key={`${attempt.at}-${i}`}>
                <b>Percobaan {i + 1} · {attempt.outcome}</b>
                {attempt.errorCode && <p>Kode: {attempt.errorCode}</p>}
                <p><HashLink hash={attempt.txHash} short={attempt.txHashShort} /></p>
                <small>{attempt.atWita}</small>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className={s.grid}>
        <div className={s.dark}>
          <h2>Rincian kriptografi &amp; blok</h2>
          {row.chain ? (
            <>
              <code>TxHash: <HashLink hash={row.chain.txHash} short={row.chain.txHashShort} /></code>
              <code>Nomor blok: {row.chain.blockNumber ?? '—'}</code>
              <code>Indeks log: {row.chain.logIndex ?? '—'}</code>
              <code>Timestamp blok: {row.chain.blockTimestamp ? row.chain.blockTimestampWita : '—'}</code>
              <code>Wallet pengirim: <HashLink hash={row.chain.from} short={row.chain.fromShort} kind="address" /></code>
              <code>Dikonfirmasi: {row.chain.confirmedAt ? row.chain.confirmedAtWita : '—'}</code>
            </>
          ) : (
            <code>TxHash: Belum terekam</code>
          )}
          <code>Hash komitmen: {row.commitment ? row.commitmentShort : 'Belum tersedia'}</code>
        </div>
        <div className={s.card}>
          <h2>Bukti penyaluran</h2>
          {row.evidence.length === 0 ? (
            <p className={s.empty}>Belum ada bukti.</p>
          ) : (
            row.evidence.map((item) => {
              const url = item.isWithdrawn
                ? null
                : (gatewayByCid.get(item.cid) ?? buildFallbackGatewayUrl(item.cid))
              return (
                <div className={s.receipt} key={item.cid}>
                  <span className={s.badge}>{item.isWithdrawn ? 'DITARIK' : 'TERSEDIA'}</span>
                  <p>{item.name}</p>
                  <code title={item.cid}>{item.cidShort}</code>
                  <small>{item.mime} · {item.size} byte</small>
                  {item.isWithdrawn ? (
                    <small>Bukti ditarik dari tampilan aplikasi{item.withdrawReason ? `: ${item.withdrawReason}` : ''}.</small>
                  ) : (
                    <div className={s.actions}>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer">Buka {item.name}</a>
                      ) : (
                        <small>Tautan publik tidak tersedia.</small>
                      )}
                      {can('evidence:upload') && row.status === 'SUCCESS' && (
                        <button disabled title={COMING_SOON_TITLE}>Tarik bukti</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
