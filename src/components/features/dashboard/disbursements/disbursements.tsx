'use client'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search } from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useUrlParams } from '@/hooks/use-url-params'
import { formatApiError } from '@/lib/api/errors'
import {
  useDeleteDisbursementMutation,
  useDisbursementsQuery,
} from '@/lib/api/hooks/disbursements'
import { useProgramsQuery } from '@/lib/api/hooks/programs'
import type { DisbursementStatus } from '@/lib/api-contract'
import type { DisbursementViewModel } from '@/types'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import {
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import {
  DisbursementDetail,
  StatusBadge,
} from '@/components/features/dashboard/disbursements/disbursement-detail'
import { DisbursementWizard } from '@/components/features/dashboard/disbursements/disbursement-wizard'
import s from '@/components/features/dashboard/disbursements/disbursements.module.css'

const STATUSES: readonly DisbursementStatus[] = ['DRAFT', 'PENDING', 'SUCCESS', 'FAILED']
const PAGE_SIZE = 20

const deleteReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Alasan penghapusan draf wajib diisi minimal 3 karakter.')
    .max(500, 'Alasan penghapusan draf maksimal 500 karakter.'),
})

function parseStatus(value: string): DisbursementStatus | undefined {
  return STATUSES.find((status) => status === value)
}

/** `YYYYMM` URL value to `YYYY-MM` month input value. */
function periodToInput(value: string): string {
  return /^\d{6}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4)}` : ''
}

function DisbursementsContent() {
  const { can } = useRoleAccess()
  const { get, getPage, set } = useUrlParams()
  const status = parseStatus(get('status'))
  const programId = get('programId')
  const periodRaw = get('period')
  const period = /^\d{6}$/.test(periodRaw) ? Number(periodRaw) : undefined
  const detailId = get('id')
  const page = getPage()

  const [wizardState, setWizardState] = useState<{
    open: boolean
    initial?: DisbursementViewModel
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DisbursementViewModel | null>(null)

  const programs = useProgramsQuery({ limit: 100 })
  const list = useDisbursementsQuery({
    page,
    limit: PAGE_SIZE,
    sort: get('sort') || '-createdAt',
    status,
    programId: programId || undefined,
    period,
    enabled: !detailId,
  })

  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <small className={s.accent}>Operasional Bansos / Penyaluran &amp; IPFS</small>
          <h1>Pencatatan Penyaluran Bantuan Sosial</h1>
          <p>Bukti terdistribusi &amp; pencatatan transparan · MongoDB → IPFS → Hyperledger Besu</p>
        </div>
      </div>
      {detailId ? (
        <DisbursementDetail key={detailId} id={detailId} onBack={() => set({ id: null }, false)} />
      ) : (
        <section className={s.tableCard}>
          <div className={s.toolbar}>
            <div className={s.row}>
              <div className={s.tabs} role="group" aria-label="Filter status">
                <button
                  aria-pressed={!status}
                  className={!status ? s.selected : ''}
                  onClick={() => set({ status: null })}
                >
                  Semua
                </button>
                {STATUSES.map((x) => (
                  <button
                    key={x}
                    aria-pressed={status === x}
                    className={status === x ? s.selected : ''}
                    onClick={() => set({ status: x })}
                  >
                    {x}
                  </button>
                ))}
              </div>
              {can('disbursement:create') && (
                <div className={s.actions}>
                  <button
                    type="button"
                    className={s.primary}
                    onClick={() => setWizardState({ open: true })}
                  >
                    <Plus size={16} /> Catat penyaluran baru
                  </button>
                </div>
              )}
            </div>
            <div className={s.row}>
              <div className={s.actions}>
                <label>
                  Program
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
                  Periode
                  <input
                    type="month"
                    value={periodToInput(periodRaw)}
                    onChange={(e) => set({ period: e.target.value.replace('-', '') })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => set({ status: null, programId: null, period: null })}
                >
                  Reset filter
                </button>
              </div>
              {list.data && (
                <small>
                  Menampilkan {list.data.items.length} dari {list.data.total} transaksi
                </small>
              )}
            </div>
          </div>
          {list.isPending ? (
            <TableSkeleton rows={8} label="Memuat daftar penyaluran" />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : list.data.items.length === 0 ? (
            <EmptyState>Tidak ada penyaluran yang sesuai filter.</EmptyState>
          ) : (
            <>
              <div className={s.scroll}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      {[
                        'ID & waktu (WITA)',
                        'Penerima',
                        'Program, periode & nominal',
                        'Bukti IPFS',
                        'Status eksekusi',
                        'TxHash on-chain',
                        'Aksi & pemulihan',
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((t) => {
                      const withdrawn = t.evidence.some((e) => e.isWithdrawn)
                      const active = t.activeEvidenceCount
                      return (
                        <tr key={t.id}>
                          <td>
                            <strong title={t.refId}>{t.refIdShort}</strong>
                            <small>{t.createdAtWita}</small>
                          </td>
                          <td>
                            <strong>{t.recipientName}</strong>
                            <small>NIK: {t.recipientNikMasked}</small>
                          </td>
                          <td>
                            <span className={`${s.badge} ${s.banner}`} title={t.programName}>
                              {t.programCode}
                            </span>
                            <small>{t.periodLabel}</small>
                            <b>{t.amountFormatted}</b>
                          </td>
                          <td>
                            <small>
                              {active > 0 ? `${active} berkas tersedia` : 'Menunggu bukti'}
                            </small>
                            {withdrawn && <small>DITARIK</small>}
                          </td>
                          <td>
                            <StatusBadge status={t.status} />
                            {t.status === 'FAILED' && t.lastErrorMessage && (
                              <p>{t.lastErrorMessage}</p>
                            )}
                          </td>
                          <td>
                            {t.chain?.txHash ? (
                              <HashLink hash={t.chain.txHash} short={t.chain.txHashShort} />
                            ) : (
                              <small>Belum terekam pada blok</small>
                            )}
                          </td>
                          <td>
                            <button type="button" onClick={() => set({ id: t.id }, false)}>
                              <Search size={12} /> Detail &amp; verifikasi
                            </button>
                            {can('transaction:sign') && t.status !== 'SUCCESS' && (
                              <div className={s.actions}>
                                <button
                                  type="button"
                                  className={s.primary}
                                  onClick={() => setWizardState({ open: true, initial: t })}
                                >
                                  {t.status === 'DRAFT' ? 'Konfirmasi' : 'Kirim ulang'}
                                </button>
                                {t.status === 'DRAFT' && t.activeEvidenceCount === 0 && (
                                  <button type="button" onClick={() => setDeleteTarget(t)}>
                                    Hapus draf
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager
                page={list.data.page}
                totalPages={list.data.totalPages}
                total={list.data.total}
                onPage={(next) => set({ page: next }, false)}
              />
            </>
          )}
        </section>
      )}

      {wizardState?.open && (
        <DisbursementWizard
          initialDisbursement={wizardState.initial}
          onClose={() => setWizardState(null)}
        />
      )}
      {deleteTarget && (
        <DeleteDisbursementDialog
          disbursement={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export function DeleteDisbursementDialog({
  disbursement,
  onClose,
}: {
  disbursement: DisbursementViewModel
  onClose: () => void
}) {
  const deleteMutation = useDeleteDisbursementMutation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof deleteReasonSchema>>({
    resolver: zodResolver(deleteReasonSchema),
    defaultValues: { reason: '' },
  })

  const isPending = isSubmitting || deleteMutation.isPending
  const formattedError = deleteMutation.error ? formatApiError(deleteMutation.error) : null

  const onSubmit = handleSubmit(async (values) => {
    await deleteMutation.mutateAsync({
      id: disbursement.id,
      reason: values.reason.trim(),
    })
    onClose()
  })

  return (
    <RecipientDialog
      title="Hapus Draf Penyaluran"
      subtitle="Hanya draf yang belum memiliki bukti terunggah yang dapat dibatalkan."
      onClose={() => {
        if (!isPending) onClose()
      }}
    >
      <form className={s.page} onSubmit={(e) => void onSubmit(e)} noValidate>
        <p>
          Anda akan menghapus draf penyaluran <strong>{disbursement.refIdShort}</strong> untuk{' '}
          <strong>{disbursement.recipientName}</strong>.
        </p>
        <label>
          Alasan Penghapusan Draf *
          <textarea
            aria-label="Alasan Penghapusan Draf"
            rows={3}
            maxLength={500}
            disabled={isPending}
            placeholder="Contoh: Kesalahan pemilihan periode penyaluran"
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
        <div className={s.actions}>
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

export function Disbursements() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <DisbursementsContent />
    </Suspense>
  )
}
