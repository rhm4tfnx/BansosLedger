'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Users,
  UserCheck,
  FilePenLine,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  LockKeyhole,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useUrlParams } from '@/hooks/use-url-params'
import { formatApiError } from '@/lib/api/errors'
import { useProgramsQuery } from '@/lib/api/hooks/programs'
import {
  useDeleteRecipientMutation,
  useFinalizeRecipientMutation,
  useRecipientDetailQuery,
  useRecipientSearchMutation,
  useRecipientsQuery,
  useRevealNikMutation,
} from '@/lib/api/hooks/recipients'
import type { RecipientStatus } from '@/lib/api-contract'
import type { RecipientViewModel } from '@/types'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { RecipientForm } from '@/components/features/dashboard/recipients/recipient-form'
import {
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import s from '@/components/features/dashboard/recipients/recipients.module.css'

const REVEAL_TTL_MS = 30_000

type StatusTab = '' | RecipientStatus
const tabs: { value: StatusTab; label: string }[] = [
  { value: '', label: 'Semua Aktif' },
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'FINAL', label: 'FINAL' },
]
const sortOptions = [
  { value: '-createdAt', label: 'Terbaru dibuat' },
  { value: 'createdAt', label: 'Terlama dibuat' },
  { value: '-updatedAt', label: 'Terbaru diperbarui' },
  { value: 'name', label: 'Nama A-Z' },
  { value: '-name', label: 'Nama Z-A' },
  { value: 'status', label: 'Status A-Z' },
]
const pageSizes = [10, 20, 50, 100]

const softDeleteReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Alasan penghapusan wajib diisi minimal 3 karakter.')
    .max(500, 'Alasan penghapusan maksimal 500 karakter.'),
})

function parseStatus(value: string): StatusTab {
  return value === 'DRAFT' || value === 'FINAL' ? value : ''
}

function badgeClass(status: RecipientStatus): string {
  return status === 'FINAL' ? s.final : s.draft
}

function isNikQuery(value: string): boolean {
  return /^\d{16}$/.test(value.trim())
}

function RecipientsContent() {
  const { can } = useRoleAccess()
  const params = useUrlParams()
  const status = parseStatus(params.get('status'))
  const programId = params.get('programId')
  const notEnrolledIn = params.get('notEnrolledIn')
  const dusun = params.get('dusun')
  const rt = params.get('rt')
  const rw = params.get('rw')
  const rawQ = params.get('q')
  const q = isNikQuery(rawQ) ? '' : rawQ
  const sort = params.get('sort') || '-createdAt'
  const page = params.getPage()
  const limitParam = Number.parseInt(params.get('limit') || '20', 10)
  const limit = pageSizes.includes(limitParam) ? limitParam : 20

  const [searchInput, setSearchInput] = useState(q)
  const [dusunInput, setDusunInput] = useState(dusun)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formState, setFormState] = useState<
    { mode: 'create' } | { mode: 'edit'; recipient: RecipientViewModel } | null
  >(null)
  const [finalizeTarget, setFinalizeTarget] = useState<RecipientViewModel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecipientViewModel | null>(null)
  const [revealedNiks, setRevealedNiks] = useState<Record<string, string>>({})
  const [revealError, setRevealError] = useState<{
    message: string
    retryAfter?: number | null
    requestId?: string | null
  } | null>(null)
  const [nikSearchItems, setNikSearchItems] = useState<RecipientViewModel[] | null>(null)

  const setParamsRef = useRef(params.set)
  useEffect(() => {
    setParamsRef.current = params.set
  })
  const timers = useRef<{ q?: ReturnType<typeof setTimeout>; dusun?: ReturnType<typeof setTimeout> }>({})
  const revealTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const nikSearchMutation = useRecipientSearchMutation()
  const revealNikMutation = useRevealNikMutation()

  useEffect(() => {
    const t = timers.current
    const rtMap = revealTimers.current
    return () => {
      clearTimeout(t.q)
      clearTimeout(t.dusun)
      Object.values(rtMap).forEach((timerId) => clearTimeout(timerId))
    }
  }, [])

  function runNikSearch(nikValue: string) {
    const trimmed = nikValue.trim()
    if (!isNikQuery(trimmed)) return
    // Ensure NIK is never written to URL search params
    if (params.get('q')) {
      setParamsRef.current({ q: '' })
    }
    nikSearchMutation.mutate(
      { nik: trimmed },
      {
        onSuccess: (result) => {
          setNikSearchItems(result.items)
        },
      },
    )
  }

  function debounced(key: 'q' | 'dusun', value: string) {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      const trimmed = value.trim()
      if (key === 'q') {
        if (isNikQuery(trimmed)) {
          runNikSearch(trimmed)
          return
        }
        setNikSearchItems(null)
      }
      setParamsRef.current({ [key]: trimmed })
    }, 300)
  }

  function clearNikSearch() {
    setNikSearchItems(null)
    setSearchInput('')
    setParamsRef.current({ q: '' })
  }

  function handleRevealNik(recipient: RecipientViewModel) {
    setRevealError(null)
    if (revealedNiks[recipient.id]) {
      clearTimeout(revealTimers.current[recipient.id])
      delete revealTimers.current[recipient.id]
      setRevealedNiks((prev) => {
        const next = { ...prev }
        delete next[recipient.id]
        return next
      })
      return
    }

    revealNikMutation.mutate(recipient.id, {
      onSuccess: ({ nik }) => {
        clearTimeout(revealTimers.current[recipient.id])
        setRevealedNiks((prev) => ({ ...prev, [recipient.id]: nik }))
        revealTimers.current[recipient.id] = setTimeout(() => {
          setRevealedNiks((prev) => {
            const next = { ...prev }
            delete next[recipient.id]
            return next
          })
          delete revealTimers.current[recipient.id]
        }, REVEAL_TTL_MS)
      },
      onError: (err) => {
        const formatted = formatApiError(err)
        setRevealError({
          message: formatted.message,
          retryAfter: formatted.retryAfter,
          requestId: formatted.requestId,
        })
      },
    })
  }

  const list = useRecipientsQuery({
    page,
    limit,
    sort,
    q: q || undefined,
    status: status || undefined,
    programId: programId || undefined,
    notEnrolledIn: notEnrolledIn || undefined,
    dusun: dusun || undefined,
    rt: rt || undefined,
    rw: rw || undefined,
  })
  const totalAll = useRecipientsQuery({ page: 1, limit: 1 })
  const totalDraft = useRecipientsQuery({ page: 1, limit: 1, status: 'DRAFT' })
  const totalFinal = useRecipientsQuery({ page: 1, limit: 1, status: 'FINAL' })
  const programsQuery = useProgramsQuery({ page: 1, limit: 100, sort: 'name' })

  const counts: Record<string, number | undefined> = {
    '': totalAll.data?.total,
    DRAFT: totalDraft.data?.total,
    FINAL: totalFinal.data?.total,
  }
  const countLabel = (value: string) => (counts[value] === undefined ? '…' : String(counts[value]))

  const isNikSearchActive = nikSearchItems !== null
  const rows: RecipientViewModel[] = isNikSearchActive ? nikSearchItems : (list.data?.items ?? [])
  const total = isNikSearchActive ? nikSearchItems.length : (list.data?.total ?? 0)
  const from = total ? (isNikSearchActive ? 1 : (page - 1) * limit + 1) : 0
  const to = isNikSearchActive ? total : Math.min(page * limit, total)
  const totalPages = isNikSearchActive ? 1 : (list.data?.totalPages ?? 1)

  return (
    <div className={s.page}>
      <div className={s.stats}>
        {[
          { label: 'Total penerima aktif', value: countLabel(''), icon: Users },
          { label: 'Draft (belum final)', value: countLabel('DRAFT'), icon: FilePenLine },
          { label: 'Final & terkunci', value: countLabel('FINAL'), icon: UserCheck },
        ].map((item) => (
          <section key={item.label}>
            <span>
              <item.icon size={20} />
            </span>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <small>Data penerima Takkalasi</small>
          </section>
        ))}
      </div>
      <section className={s.card}>
        <header className={s.cardHeader}>
          <div>
            <h2>
              Daftar Penerima Bantuan Sosial <span>Kelurahan Takkalasi</span>
            </h2>
            <p>NIK ditampilkan tersamar secara default. Pembukaan NIK dicatat pada log audit.</p>
          </div>
          <div className={s.actions}>
            {can('recipient:create') && (
              <button
                type="button"
                className={s.primary}
                onClick={() => setFormState({ mode: 'create' })}
              >
                <Plus size={18} /> Tambah Penerima
              </button>
            )}
          </div>
        </header>
        {revealError && (
          <div role="alert" className={s.hashPreview}>
            <div>
              <strong>Pembukaan NIK ditolak</strong>
              <p>
                {revealError.message}
                {revealError.retryAfter
                  ? ` Coba lagi dalam ${revealError.retryAfter} detik.`
                  : ''}
              </p>
              {revealError.requestId && <small>ID Permintaan: {revealError.requestId}</small>}
            </div>
            <button
              type="button"
              aria-label="Tutup peringatan NIK"
              onClick={() => setRevealError(null)}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {nikSearchMutation.isError && (
          <div role="alert" className={s.hashPreview}>
            <div>
              <strong>Pencarian NIK gagal</strong>
              <p>{formatApiError(nikSearchMutation.error).message}</p>
              {nikSearchMutation.error.requestId && (
                <small>ID Permintaan: {nikSearchMutation.error.requestId}</small>
              )}
            </div>
          </div>
        )}
        <div className={s.filters}>
          <div className={s.tabs} role="group" aria-label="Filter status">
            {tabs.map((t) => (
              <button
                type="button"
                key={t.value || 'all'}
                aria-pressed={status === t.value}
                onClick={() => params.set({ status: t.value })}
              >
                {t.label} <span>({countLabel(t.value)})</span>
              </button>
            ))}
          </div>
          <div className={s.filterFields}>
            <select
              aria-label="Filter program"
              value={programId}
              onChange={(e) => params.set({ programId: e.target.value })}
            >
              <option value="">Semua Program Bansos</option>
              {(programsQuery.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Urutkan"
              value={sort}
              onChange={(e) => params.set({ sort: e.target.value })}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className={s.search}>
              <Search size={18} />
              <input
                aria-label="Filter dusun"
                placeholder="Filter dusun..."
                maxLength={80}
                value={dusunInput}
                onChange={(e) => {
                  setDusunInput(e.target.value)
                  debounced('dusun', e.target.value)
                }}
              />
            </label>
            <label className={s.search}>
              <Search size={18} />
              <input
                aria-label="Cari penerima"
                placeholder="Cari nama, hash komitmen, atau NIK 16 digit..."
                maxLength={160}
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  debounced('q', e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isNikQuery(searchInput)) {
                    e.preventDefault()
                    clearTimeout(timers.current.q)
                    runNikSearch(searchInput)
                  }
                }}
              />
              {isNikQuery(searchInput) && (
                <button
                  type="button"
                  onClick={() => {
                    clearTimeout(timers.current.q)
                    runNikSearch(searchInput)
                  }}
                >
                  Cari NIK
                </button>
              )}
              {isNikSearchActive && (
                <button type="button" onClick={clearNikSearch} aria-label="Hapus pencarian NIK">
                  Reset NIK
                </button>
              )}
            </label>
          </div>
        </div>
        <div className={s.tableWrap}>
          {list.isPending || nikSearchMutation.isPending ? (
            <TableSkeleton label="Memuat daftar penerima" />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : !rows.length ? (
            <EmptyState>Tidak ada penerima yang sesuai dengan filter.</EmptyState>
          ) : (
            <table>
              <thead>
                <tr>
                  {[
                    'NAMA PENERIMA & DOMISILI',
                    'NIK (TERSAMAR)',
                    'PROGRAM & ENROLLMENT',
                    'SIKLUS STATUS',
                    'KOMITMEN HASH (KECCAK256)',
                    'AKSI & SIKLUS',
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const revealedNik = revealedNiks[r.id]
                  const isRevealingThis =
                    revealNikMutation.isPending && revealNikMutation.variables === r.id
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.name}</strong>
                        <p>{r.regionLabel}</p>
                        <small>{r.addressLabel}</small>
                      </td>
                      <td>
                        <div className={s.nik}>
                          <code aria-live="polite">{revealedNik ?? r.nikMasked}</code>
                          {can('recipient:reveal-nik') && (
                            <button
                              type="button"
                              disabled={isRevealingThis}
                              aria-label={
                                revealedNik ? `Sembunyikan NIK ${r.name}` : `Buka NIK ${r.name}`
                              }
                              onClick={() => handleRevealNik(r)}
                            >
                              {revealedNik ? (
                                <>
                                  <EyeOff size={15} /> Tutup
                                </>
                              ) : (
                                <>
                                  <Eye size={15} /> {isRevealingThis ? 'Membuka…' : 'Buka'}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <small>
                          {revealedNik
                            ? 'Ditampilkan sementara selama 30 detik (diaudit)'
                            : 'Tersamar secara default'}
                        </small>
                      </td>
                      <td>
                        {r.enrollments.length ? (
                          r.enrollments.map((e) => (
                            <p key={`${e.programCode}-${e.status}`}>
                              <span className={s.program}>{e.programCode}</span> · {e.statusLabel}
                            </p>
                          ))
                        ) : (
                          <p className={s.warning}>Belum terdaftar pada program</p>
                        )}
                      </td>
                      <td>
                        <span className={`${s.badge} ${badgeClass(r.status)}`}>
                          {r.statusLabel}
                        </span>
                      </td>
                      <td>
                        {r.commitment ? (
                          <>
                            <div className={s.hash}>
                              <code title={r.commitment}>{r.commitmentShort}</code>
                              <button
                                type="button"
                                aria-label={`Salin komitmen ${r.name}`}
                                onClick={() =>
                                  void navigator.clipboard?.writeText(r.commitment ?? '')
                                }
                              >
                                <Copy size={15} />
                              </button>
                            </div>
                            <small className={s.success}>Komitmen FINAL</small>
                          </>
                        ) : (
                          <>
                            <p>Belum ada komitmen</p>
                            <small>Menunggu status dikunci FINAL</small>
                          </>
                        )}
                      </td>
                      <td>
                        <div className={s.rowActions}>
                          <button type="button" onClick={() => setSelectedId(r.id)}>
                            Detail
                          </button>
                          {can('recipient:update') &&
                            (r.status === 'DRAFT' ? (
                              <>
                                <button
                                  type="button"
                                  className={s.secondary}
                                  onClick={() => setFinalizeTarget(r)}
                                >
                                  Kunci FINAL <ArrowRight size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormState({ mode: 'edit', recipient: r })}
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                                {can('recipient:soft-delete') && (
                                  <button
                                    type="button"
                                    className={s.danger}
                                    onClick={() => setDeleteTarget(r)}
                                  >
                                    <Trash2 size={13} /> Hapus
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className={s.locked}>
                                <LockKeyhole size={13} /> Terkunci Permanen
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <footer className={s.pagination}>
          <span>
            Menampilkan {from} sampai {to} dari {total} data penerima
          </span>
          <label>
            Baris:{' '}
            <select
              aria-label="Jumlah baris"
              value={limit}
              onChange={(e) => params.set({ limit: e.target.value })}
            >
              {pageSizes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <div>
            <button
              type="button"
              aria-label="Halaman sebelumnya"
              disabled={page <= 1 || isNikSearchActive}
              onClick={() => params.set({ page: page - 1 }, false)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{page}</span>
            <button
              type="button"
              aria-label="Halaman berikutnya"
              disabled={page >= totalPages || isNikSearchActive}
              onClick={() => params.set({ page: page + 1 }, false)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>
      {selectedId && (
        <RecipientDetail
          key={selectedId}
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
      {formState && (
        <RecipientForm
          initial={formState.mode === 'edit' ? formState.recipient : undefined}
          onClose={() => setFormState(null)}
        />
      )}
      {finalizeTarget && (
        <FinalizeRecipientDialog
          recipient={finalizeTarget}
          onClose={() => setFinalizeTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteRecipientDialog
          recipient={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function FinalizeRecipientDialog({
  recipient,
  onClose,
}: {
  recipient: RecipientViewModel
  onClose: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmedIrreversible, setConfirmedIrreversible] = useState(false)
  const finalizeMutation = useFinalizeRecipientMutation()

  async function handleFinalize() {
    if (!confirmedIrreversible || finalizeMutation.isPending) return
    await finalizeMutation.mutateAsync(recipient.id)
    onClose()
  }

  return (
    <RecipientDialog
      title="Konfirmasi Kunci Status FINAL"
      subtitle="Tindakan ireversibel: membentuk komitmen identitas keccak256 dan mengunci data penerima secara permanen."
      onClose={() => {
        if (!finalizeMutation.isPending) onClose()
      }}
    >
      <div className={s.formBody}>
        <dl className={s.details}>
          <div>
            <dt>Nama Penerima</dt>
            <dd>{recipient.name}</dd>
          </div>
          <div>
            <dt>NIK (Tersamar)</dt>
            <dd>{recipient.nikMasked}</dd>
          </div>
          <div>
            <dt>Domisili</dt>
            <dd>{recipient.addressLabel}</dd>
          </div>
        </dl>

        {step === 1 ? (
          <div className={s.hashPreview}>
            <strong>Tahap 1 dari 2 · Ringkasan Penguncian</strong>
            <p>
              Pastikan nama, NIK, dan domisili penerima sudah sesuai dengan dokumen KTP. Setelah
              dikunci menjadi FINAL, data tidak dapat diubah lagi maupun dihapus.
            </p>
          </div>
        ) : (
          <div className={s.hashPreview}>
            <strong>Tahap 2 dari 2 · Konfirmasi Akhir</strong>
            <p>
              Data penerima akan dikunci menjadi FINAL dan tidak dapat diubah lagi. Komitmen
              identitas akan dibuat untuk registrasi on-chain.
            </p>
            <label>
              <input
                type="checkbox"
                checked={confirmedIrreversible}
                disabled={finalizeMutation.isPending}
                onChange={(e) => setConfirmedIrreversible(e.target.checked)}
              />{' '}
              Saya memahami bahwa data FINAL tidak dapat diubah lagi secara permanen.
            </label>
          </div>
        )}

        {finalizeMutation.error && (
          <div role="alert">
            <p>{formatApiError(finalizeMutation.error).message}</p>
            {finalizeMutation.error.requestId && (
              <small>ID Permintaan: {finalizeMutation.error.requestId}</small>
            )}
          </div>
        )}

        <footer className={s.dialogFooter}>
          <button
            type="button"
            disabled={finalizeMutation.isPending}
            onClick={step === 2 ? () => setStep(1) : onClose}
          >
            {step === 2 ? 'Kembali' : 'Batal'}
          </button>
          {step === 1 ? (
            <button type="button" className={s.primary} onClick={() => setStep(2)}>
              Lanjut ke Konfirmasi Akhir
            </button>
          ) : (
            <button
              type="button"
              className={s.primary}
              disabled={!confirmedIrreversible || finalizeMutation.isPending}
              onClick={() => void handleFinalize()}
            >
              {finalizeMutation.isPending ? 'Mengunci…' : 'Kunci FINAL Permanen'}
            </button>
          )}
        </footer>
      </div>
    </RecipientDialog>
  )
}

function DeleteRecipientDialog({
  recipient,
  onClose,
}: {
  recipient: RecipientViewModel
  onClose: () => void
}) {
  const deleteMutation = useDeleteRecipientMutation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof softDeleteReasonSchema>>({
    resolver: zodResolver(softDeleteReasonSchema),
    defaultValues: { reason: '' },
  })

  const isPending = isSubmitting || deleteMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    await deleteMutation.mutateAsync({
      id: recipient.id,
      reason: values.reason.trim(),
    })
    onClose()
  })

  return (
    <RecipientDialog
      title="Hapus Penerima DRAFT (Soft Delete)"
      subtitle="Penghapusan hanya tersedia untuk data DRAFT dan dicatat pada log audit."
      onClose={() => {
        if (!isPending) onClose()
      }}
    >
      <form className={s.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        <div className={s.full}>
          <p>
            Anda akan menghapus draf penerima <strong>{recipient.name}</strong> (
            <code>{recipient.nikMasked}</code>).
          </p>
        </div>
        <label className={s.full}>
          Alasan Penghapusan *
          <textarea
            aria-label="Alasan Penghapusan"
            rows={3}
            maxLength={500}
            placeholder="Contoh: Duplikasi entri draf atau kesalahan input data"
            disabled={isPending}
            {...register('reason')}
          />
          {errors.reason && <small role="alert">{errors.reason.message}</small>}
        </label>
        {deleteMutation.error && (
          <div role="alert" className={s.full}>
            <p>{formatApiError(deleteMutation.error).message}</p>
            {deleteMutation.error.requestId && (
              <small>ID Permintaan: {deleteMutation.error.requestId}</small>
            )}
          </div>
        )}
        <footer className={s.full}>
          <button type="button" disabled={isPending} onClick={onClose}>
            Batal
          </button>
          <button type="submit" disabled={isPending} className={s.danger}>
            {isPending ? 'Menghapus…' : 'Konfirmasi Hapus DRAFT'}
          </button>
        </footer>
      </form>
    </RecipientDialog>
  )
}

function RecipientDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [historyPage, setHistoryPage] = useState(1)
  const detail = useRecipientDetailQuery(id, historyPage)
  const r = detail.data
  return (
    <RecipientDialog
      title="Detail Penerima Bantuan"
      subtitle="Identitas, status, dan riwayat penyaluran penerima."
      onClose={onClose}
    >
      <div className={s.formBody}>
        {detail.isPending ? (
          <TableSkeleton label="Memuat detail penerima" rows={6} />
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        ) : r ? (
          <>
            <dl className={s.details}>
              {[
                ['Nama', r.name],
                ['NIK', r.nikMasked],
                ['Wilayah', r.regionLabel],
                ['Alamat', r.addressLabel],
                ['Telepon', r.phone ?? '-'],
                ['Status', r.statusLabel],
                [
                  'Program',
                  r.enrollments.length
                    ? r.enrollments.map((e) => `${e.programCode} (${e.statusLabel})`).join(', ')
                    : 'Belum terdaftar pada program',
                ],
                ['Dibuat', r.createdAtWita],
                ['Diperbarui', r.updatedAtWita],
                ['Dikunci FINAL', r.finalizedAt ? r.finalizedAtWita : '-'],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className={s.hashPreview}>
              <strong>Kelayakan penyaluran</strong>
              <p>
                {r.status === 'FINAL'
                  ? 'Layak salur — data telah dikunci FINAL.'
                  : 'Belum dapat disalurkan — data harus berstatus FINAL.'}
              </p>
              <strong>Komitmen keccak256 FINAL</strong>
              {r.commitment ? (
                <HashLink hash={r.commitment} short={r.commitmentShort} kind="search" />
              ) : (
                <code>Belum dibentuk. Komitmen disimpan saat status dikunci FINAL.</code>
              )}
            </div>
            <h3>Riwayat Bantuan Sosial</h3>
            {r.history.items.length ? (
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Periode</th>
                      <th>Nominal</th>
                      <th>Status</th>
                      <th>Hash transaksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.history.items.map((h) => (
                      <tr key={h.id}>
                        <td>{h.disbursedDate ? h.disbursedDateWita : h.createdAtWita}</td>
                        <td>{h.periodLabel}</td>
                        <td>{h.amountFormatted}</td>
                        <td>{h.statusLabel}</td>
                        <td>
                          <HashLink hash={h.txHash} short={h.txHashShort} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>Belum ada riwayat bantuan yang diterima.</EmptyState>
            )}
            <Pager
              page={r.history.page}
              totalPages={r.history.totalPages}
              total={r.history.total}
              onPage={setHistoryPage}
            />
          </>
        ) : null}
      </div>
    </RecipientDialog>
  )
}

export function Recipients() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <RecipientsContent />
    </Suspense>
  )
}
