'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import {
  Users,
  UserCheck,
  FilePenLine,
  Plus,
  Upload,
  Search,
  Eye,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  LockKeyhole,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useUrlParams } from '@/hooks/use-url-params'
import { useProgramsQuery } from '@/lib/api/hooks/programs'
import { useRecipientDetailQuery, useRecipientsQuery } from '@/lib/api/hooks/recipients'
import type { RecipientStatus } from '@/lib/api-contract'
import type { RecipientViewModel } from '@/types'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import {
  COMING_SOON_TITLE,
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import s from '@/components/features/dashboard/recipients/recipients.module.css'

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

function parseStatus(value: string): StatusTab {
  return value === 'DRAFT' || value === 'FINAL' ? value : ''
}

function badgeClass(status: RecipientStatus): string {
  return status === 'FINAL' ? s.final : s.draft
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
  const q = params.get('q')
  const sort = params.get('sort') || '-createdAt'
  const page = params.getPage()
  const limitParam = Number.parseInt(params.get('limit') || '20', 10)
  const limit = pageSizes.includes(limitParam) ? limitParam : 20

  const [searchInput, setSearchInput] = useState(q)
  const [dusunInput, setDusunInput] = useState(dusun)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const setParamsRef = useRef(params.set)
  useEffect(() => {
    setParamsRef.current = params.set
  })
  const timers = useRef<{ q?: ReturnType<typeof setTimeout>; dusun?: ReturnType<typeof setTimeout> }>({})
  useEffect(() => {
    const t = timers.current
    return () => {
      clearTimeout(t.q)
      clearTimeout(t.dusun)
    }
  }, [])
  function debounced(key: 'q' | 'dusun', value: string) {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => setParamsRef.current({ [key]: value.trim() }), 300)
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
  const readOnlyAction = (permission: Parameters<typeof can>[0]) => ({
    disabled: true,
    title: can(permission) ? COMING_SOON_TITLE : undefined,
  })

  const rows: RecipientViewModel[] = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const from = total ? (page - 1) * limit + 1 : 0
  const to = Math.min(page * limit, total)
  const totalPages = list.data?.totalPages ?? 1

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
              <>
                <button type="button" disabled title={COMING_SOON_TITLE}>
                  <Upload size={16} /> Impor CSV
                </button>
                <button type="button" className={s.primary} disabled title={COMING_SOON_TITLE}>
                  <Plus size={18} /> Tambah Penerima
                </button>
              </>
            )}
          </div>
        </header>
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
                placeholder="Cari nama atau hash komitmen..."
                maxLength={160}
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  debounced('q', e.target.value)
                }}
              />
            </label>
          </div>
        </div>
        <div className={s.tableWrap}>
          {list.isPending ? (
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
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <p>{r.regionLabel}</p>
                      <small>{r.addressLabel}</small>
                    </td>
                    <td>
                      <div className={s.nik}>
                        <code>{r.nikMasked}</code>
                        {can('recipient:reveal-nik') && (
                          <button
                            type="button"
                            disabled
                            title={COMING_SOON_TITLE}
                            aria-label={`Buka NIK ${r.name}`}
                          >
                            <Eye size={15} /> Buka
                          </button>
                        )}
                      </div>
                      <small>Tersamar secara default</small>
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
                      <span className={`${s.badge} ${badgeClass(r.status)}`}>{r.statusLabel}</span>
                    </td>
                    <td>
                      {r.commitment ? (
                        <>
                          <div className={s.hash}>
                            <code title={r.commitment}>{r.commitmentShort}</code>
                            <button
                              type="button"
                              aria-label={`Salin komitmen ${r.name}`}
                              onClick={() => void navigator.clipboard?.writeText(r.commitment ?? '')}
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
                              <button type="button" className={s.secondary} {...readOnlyAction('recipient:update')}>
                                Kunci FINAL <ArrowRight size={13} />
                              </button>
                              <button type="button" {...readOnlyAction('recipient:update')}>
                                <Pencil size={13} /> Edit
                              </button>
                              {can('recipient:soft-delete') && (
                                <button type="button" className={s.danger} {...readOnlyAction('recipient:soft-delete')}>
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
                ))}
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
              disabled={page <= 1}
              onClick={() => params.set({ page: page - 1 }, false)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{page}</span>
            <button
              type="button"
              aria-label="Halaman berikutnya"
              disabled={page >= totalPages}
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
    </div>
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
                <HashLink hash={r.commitment} short={r.commitmentShort} />
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
