'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRoleAccess } from '@/hooks/use-role-access'
import { formatApiError } from '@/lib/api/errors'
import {
  useDeleteDisbursementMutation,
  useDisbursementDetailQuery,
  usePublicEvidenceQuery,
  useWithdrawEvidenceMutation,
} from '@/lib/api/hooks/disbursements'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { ErrorState, TableSkeleton } from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import { DisbursementWizard } from '@/components/features/dashboard/disbursements/disbursement-wizard'
import type { DisbursementStatus } from '@/lib/api-contract'
import type { EvidenceViewModel } from '@/types'
import s from '@/components/features/dashboard/disbursements/disbursements.module.css'

export const STATUS_ICON: Record<DisbursementStatus, string> = {
  DRAFT: '✎',
  PENDING: '◷',
  SUCCESS: '✓',
  FAILED: '×',
}

const reasonFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Alasan wajib diisi minimal 3 karakter.')
    .max(500, 'Alasan maksimal 500 karakter.'),
})

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

  const [showWizard, setShowWizard] = useState(false)
  const [showDeleteDraft, setShowDeleteDraft] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState<EvidenceViewModel | null>(null)

  if (query.isPending) {
    return (
      <div className={s.page}>
        <TableSkeleton rows={8} label="Memuat detail penyaluran" />
      </div>
    )
  }
  if (query.isError || !row) {
    return (
      <div className={s.page}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        {onBack && (
          <button type="button" onClick={onBack}>
            Kembali ke tabel penyaluran
          </button>
        )}
      </div>
    )
  }
  const gatewayByCid = new Map(
    (publicEvidence.data ?? []).map((item) => [item.cid, item.gatewayUrl]),
  )
  const txHash = row.chain?.txHash ?? null

  return (
    <div className={s.page}>
      <div className={s.dark}>
        <div className={s.detailBanner}>
          <div>
            <small>BESU QBFT EXPLORER</small>
            <h2>Detail Penyaluran &amp; Catatan On-Chain</h2>
            <p>Pelacakan catatan penyaluran dan transaksi on-chain.</p>
            <code>{txHash ? `/explorer/tx/${txHash}` : 'Transaksi belum memiliki hash on-chain'}</code>
          </div>
          {onBack && (
            <button type="button" className={s.backBtn} onClick={onBack}>
              Kembali ke tabel penyaluran
            </button>
          )}
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
            <p>
              {row.programCode} · {row.periodLabel}
            </p>
          </div>
        </div>
        <p>
          {row.recipientName} · NIK {row.recipientNikMasked}
        </p>
        <p>
          {row.programCode} — {row.programName}
        </p>
        {row.status === 'FAILED' && row.lastErrorMessage && (
          <p role="alert">{row.lastErrorMessage}</p>
        )}
        {row.note && <p>Catatan: {row.note}</p>}
        <div className={s.actions}>
          {can('transaction:sign') && row.status !== 'SUCCESS' && row.status !== 'DRAFT' && (
            <button type="button" className={s.primary} onClick={() => setShowWizard(true)}>
              Kirim ulang
            </button>
          )}
          {can('disbursement:create') && row.status === 'DRAFT' && (
            <>
              <button type="button" className={s.primary} onClick={() => setShowWizard(true)}>
                Konfirmasi
              </button>
              {row.activeEvidenceCount === 0 && (
                <button type="button" onClick={() => setShowDeleteDraft(true)}>
                  Hapus draf
                </button>
              )}
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
                <b>
                  Percobaan {i + 1} · {attempt.outcome}
                </b>
                {attempt.errorCode && <p>Kode: {attempt.errorCode}</p>}
                <p>
                  <HashLink hash={attempt.txHash} short={attempt.txHashShort} />
                </p>
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
              <code>
                TxHash: <HashLink hash={row.chain.txHash} short={row.chain.txHashShort} />
              </code>
              <code>Nomor blok: {row.chain.blockNumber ?? '—'}</code>
              <code>Indeks log: {row.chain.logIndex ?? '—'}</code>
              <code>
                Timestamp blok:{' '}
                {row.chain.blockTimestamp ? row.chain.blockTimestampWita : '—'}
              </code>
              <code>
                Wallet pengirim:{' '}
                <HashLink hash={row.chain.from} short={row.chain.fromShort} kind="address" />
              </code>
              <code>
                Dikonfirmasi: {row.chain.confirmedAt ? row.chain.confirmedAtWita : '—'}
              </code>
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
            <div className={s.receiptList}>
              {row.evidence.map((item) => {
                const url = item.isWithdrawn
                  ? null
                  : (gatewayByCid.get(item.cid) ?? buildFallbackGatewayUrl(item.cid))
                return (
                  <div className={s.receipt} key={item.cid}>
                    <div className={s.receiptHeader}>
                      <p>{item.name}</p>
                      <span className={s.badge}>{item.isWithdrawn ? 'DITARIK' : 'TERSEDIA'}</span>
                    </div>
                    <code title={item.cid}>{item.cidShort}</code>
                    <small>
                      {item.mime} · {item.size} byte
                    </small>
                    {item.isWithdrawn ? (
                      <small>
                        Bukti ditarik dari tampilan aplikasi
                        {item.withdrawReason ? `: ${item.withdrawReason}` : ''}.
                      </small>
                    ) : (
                      <div className={s.actions}>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            Buka {item.name}
                          </a>
                        ) : (
                          <small>Tautan publik tidak tersedia.</small>
                        )}
                        {can('evidence:upload') && row.status === 'SUCCESS' && (
                          <button type="button" onClick={() => setWithdrawTarget(item)}>
                            Tarik bukti
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showWizard && (
        <DisbursementWizard
          initialDisbursement={row}
          onClose={() => setShowWizard(false)}
        />
      )}
      {showDeleteDraft && (
        <DeleteDraftFromDetailDialog
          disbursementId={row.id}
          refIdShort={row.refIdShort}
          onClose={() => setShowDeleteDraft(false)}
          onDeleted={() => {
            setShowDeleteDraft(false)
            onBack?.()
          }}
        />
      )}
      {withdrawTarget && (
        <WithdrawEvidenceDialog
          disbursementId={row.id}
          evidence={withdrawTarget}
          onClose={() => setWithdrawTarget(null)}
        />
      )}
    </div>
  )
}

function DeleteDraftFromDetailDialog({
  disbursementId,
  refIdShort,
  onClose,
  onDeleted,
}: {
  disbursementId: string
  refIdShort: string
  onClose: () => void
  onDeleted: () => void
}) {
  const deleteMutation = useDeleteDisbursementMutation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof reasonFormSchema>>({
    resolver: zodResolver(reasonFormSchema),
    defaultValues: { reason: '' },
  })
  const isPending = isSubmitting || deleteMutation.isPending
  const formattedError = deleteMutation.error ? formatApiError(deleteMutation.error) : null

  const onSubmit = handleSubmit(async (values) => {
    await deleteMutation.mutateAsync({
      id: disbursementId,
      reason: values.reason.trim(),
    })
    onDeleted()
  })

  return (
    <RecipientDialog
      title="Hapus Draf Penyaluran"
      subtitle="Penghapusan draf dicatat pada log audit."
      onClose={() => {
        if (!isPending) onClose()
      }}
    >
      <form className={s.dialogForm} onSubmit={(e) => void onSubmit(e)} noValidate>
        <p>
          Hapus draf penyaluran <strong>{refIdShort}</strong>?
        </p>
        <label>
          Alasan Penghapusan Draf *
          <textarea
            aria-label="Alasan Penghapusan Draf"
            rows={3}
            maxLength={500}
            disabled={isPending}
            {...register('reason')}
          />
          {errors.reason && <small role="alert">{errors.reason.message}</small>}
        </label>
        {formattedError && (
          <div role="alert" className={s.FAILED}>
            <p>{formattedError.message}</p>
            {formattedError.requestId && <small>ID Permintaan: {formattedError.requestId}</small>}
          </div>
        )}
        <div className={s.dialogFooter}>
          <button type="button" disabled={isPending} onClick={onClose}>
            Batal
          </button>
          <button type="submit" disabled={isPending} className={s.primary}>
            {isPending ? 'Menghapus…' : 'Konfirmasi Hapus Draf'}
          </button>
        </div>
      </form>
    </RecipientDialog>
  )
}

function WithdrawEvidenceDialog({
  disbursementId,
  evidence,
  onClose,
}: {
  disbursementId: string
  evidence: EvidenceViewModel
  onClose: () => void
}) {
  const withdrawMutation = useWithdrawEvidenceMutation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof reasonFormSchema>>({
    resolver: zodResolver(reasonFormSchema),
    defaultValues: { reason: '' },
  })
  const isPending = isSubmitting || withdrawMutation.isPending
  const formattedError = withdrawMutation.error ? formatApiError(withdrawMutation.error) : null

  const onSubmit = handleSubmit(async (values) => {
    await withdrawMutation.mutateAsync({
      disbursementId,
      cid: evidence.cid,
      reason: values.reason.trim(),
    })
    onClose()
  })

  return (
    <RecipientDialog
      title="Tarik Bukti Penyaluran (IPFS Unpin)"
      subtitle="Melepas pin Pinata dan menyembunyikan tautan publik dari aplikasi. Salinan di node IPFS pihak lain tidak dapat ditarik kembali."
      onClose={() => {
        if (!isPending) onClose()
      }}
    >
      <form className={s.dialogForm} onSubmit={(e) => void onSubmit(e)} noValidate>
        <p>
          Berkas: <strong>{evidence.name}</strong> (<code>{evidence.cidShort}</code>)
        </p>
        <label>
          Alasan Penarikan Bukti *
          <textarea
            aria-label="Alasan Penarikan Bukti"
            rows={3}
            maxLength={500}
            disabled={isPending}
            placeholder="Contoh: Terkandung informasi pribadi yang tidak sengaja terlihat pada foto"
            {...register('reason')}
          />
          {errors.reason && <small role="alert">{errors.reason.message}</small>}
        </label>
        {formattedError && (
          <div role="alert" className={s.FAILED}>
            <p>{formattedError.message}</p>
            {formattedError.requestId && <small>ID Permintaan: {formattedError.requestId}</small>}
          </div>
        )}
        <div className={s.dialogFooter}>
          <button type="button" disabled={isPending} onClick={onClose}>
            Batal
          </button>
          <button type="submit" disabled={isPending} className={s.primary}>
            {isPending ? 'Menarik Bukti…' : 'Konfirmasi Tarik Bukti'}
          </button>
        </div>
      </form>
    </RecipientDialog>
  )
}
