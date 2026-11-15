'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import {
  Download,
  Plus,
  LockKeyhole,
  ShieldCheck,
  Wallet,
  Users,
  Layers,
  CheckCircle2,
  RotateCw,
} from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useUrlParams } from '@/hooks/use-url-params'
import { formatApiError } from '@/lib/api/errors'
import {
  useActivateProgramIntentMutation,
  useCloseProgramIntentMutation,
  useConfirmProgramChainMutation,
  useEnrollRecipientsMutation,
  useProgramDetailQuery,
  useProgramEnrollmentsQuery,
  useProgramsQuery,
  useRegisterRecipientsIntentMutation,
} from '@/lib/api/hooks/programs'
import { useRecipientsQuery } from '@/lib/api/hooks/recipients'
import { shortenHash } from '@/lib/format'
import { useWallet } from '@/lib/wallet'
import type { EnrollmentStatus, ProgramStatus } from '@/lib/api-contract'
import type { ProgramViewModel } from '@/types'
import { ProgramCharts } from '@/components/features/dashboard/programs/program-charts'
import { ProgramForm } from '@/components/features/dashboard/programs/program-form'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import {
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import { WalletGate } from '@/components/shared/wallet-gate'
import s from '@/components/features/dashboard/programs/programs.module.css'

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS = 60_000
const BATCH_SIZE = 100

type StatusTab = '' | ProgramStatus
const tabs: { value: StatusTab; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'CLOSED', label: 'CLOSED' },
]
const sortOptions = [
  { value: '-createdAt', label: 'Terbaru dibuat' },
  { value: 'createdAt', label: 'Terlama dibuat' },
  { value: '-updatedAt', label: 'Terbaru diperbarui' },
  { value: 'code', label: 'Kode A-Z' },
  { value: 'name', label: 'Nama A-Z' },
  { value: '-name', label: 'Nama Z-A' },
]
const enrollmentTabs: { value: '' | EnrollmentStatus; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'ENROLLED', label: 'Terdaftar' },
  { value: 'REGISTERED_ONCHAIN', label: 'Teregistrasi on-chain' },
]

function parseStatus(value: string): StatusTab {
  return value === 'ACTIVE' || value === 'DRAFT' || value === 'CLOSED' ? value : ''
}
function parseEnrollmentStatus(value: string): '' | EnrollmentStatus {
  return value === 'ENROLLED' || value === 'REGISTERED_ONCHAIN' ? value : ''
}
function rupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString('id-ID')}`
}
function millions(value: number): string {
  return `Rp ${(value / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
}
function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

function ProgramsContent() {
  const { can } = useRoleAccess()
  const operator = can('program:create')
  const params = useUrlParams()
  const status = parseStatus(params.get('status'))
  const q = params.get('search')
  const sort = params.get('sort') || '-createdAt'
  const page = params.getPage()
  const enrollStatus = parseEnrollmentStatus(params.get('enrollStatus'))
  const enrollPageRaw = Number.parseInt(params.get('enrollPage') || '1', 10)
  const enrollPage = Number.isFinite(enrollPageRaw) && enrollPageRaw >= 1 ? enrollPageRaw : 1
  const limit = 10

  const [searchInput, setSearchInput] = useState(q)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formState, setFormState] = useState<
    { mode: 'create' } | { mode: 'edit'; program: ProgramViewModel } | null
  >(null)
  const [enrollDialogProgram, setEnrollDialogProgram] = useState<ProgramViewModel | null>(null)
  const [chainAction, setChainAction] = useState<{
    kind: 'create' | 'register' | 'close'
    program: ProgramViewModel
  } | null>(null)

  const setParamsRef = useRef(params.set)
  useEffect(() => {
    setParamsRef.current = params.set
  })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const detailSectionRef = useRef<HTMLElement>(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const list = useProgramsQuery({
    page,
    limit,
    sort,
    status: status || undefined,
    search: q || undefined,
  })
  const overview = useProgramsQuery({ page: 1, limit: 100, sort: 'name' })
  const overviewItems: ProgramViewModel[] = overview.data?.items ?? []
  const rows: ProgramViewModel[] = list.data?.items ?? []
  const effectiveId = selectedId ?? rows[0]?.id ?? null
  const detail = useProgramDetailQuery(effectiveId)
  const enrollments = useProgramEnrollmentsQuery(effectiveId, {
    page: enrollPage,
    limit: 10,
    status: enrollStatus || undefined,
  })

  const count = (value: ProgramStatus) => overviewItems.filter((p) => p.status === value).length
  const budget = overviewItems.reduce((n, p) => n + p.totalBudget, 0)
  const spent = overviewItems.reduce((n, p) => n + p.disbursedAmount, 0)
  const remaining = overviewItems.reduce((n, p) => n + p.remainingBudget, 0)
  const quota = overviewItems.reduce((n, p) => n + p.enrolledCount, 0)
  const used = overviewItems.reduce((n, p) => n + p.disbursedCount, 0)
  const onChain = overviewItems.filter((p) => p.programId).length
  const tabCount = (value: StatusTab) =>
    overview.isSuccess ? String(value ? count(value) : overviewItems.length) : '…'

  function selectProgram(id: string, scrollToDetail = false) {
    setSelectedId(id)
    params.set({ enrollPage: null, enrollStatus: null }, false)
    if (scrollToDetail && typeof detailSectionRef.current?.scrollIntoView === 'function') {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function exportCsv() {
    const cell = (v: string | number) =>
      '"' +
      String(v)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"'
    const csv = [
      [
        'Kode',
        'Nama',
        'Bentuk',
        'Periode',
        'Nominal',
        'Target penerima',
        'Pagu',
        'Tersalurkan (KPM)',
        'Tersalurkan (Rp)',
        'Sisa target',
        'Sisa Dana',
        'Status',
        'Deskripsi',
      ],
      ...rows.map((p) => [
        p.code,
        p.name,
        p.kindLabel,
        p.periodRangeLabel,
        p.amountPerRecipient,
        p.enrolledCount,
        p.totalBudget,
        p.disbursedCount,
        p.disbursedAmount,
        Math.max(p.enrolledCount - p.disbursedCount, 0),
        p.remainingBudget,
        p.statusLabel,
        p.description ?? '',
      ]),
    ]
      .map((r) => r.map(cell).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'rekap-program.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selected = detail.data
  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <small>Dashboard Internal / Program Bantuan Sosial</small>
          <h1>Manajemen Program Bantuan Sosial</h1>
          <p>Kelola program, acuan penyaluran, serta pantau realisasi target dan pagu anggaran.</p>
        </div>
        <div className={s.actions}>
          <button type="button" onClick={exportCsv} disabled={!rows.length}>
            <Download size={15} />
            Ekspor Rekap (CSV)
          </button>
          {operator && (
            <button
              type="button"
              className={s.primary}
              onClick={() => setFormState({ mode: 'create' })}
            >
              <Plus size={16} />
              Tambah Program Bantuan
            </button>
          )}
        </div>
      </div>
      {!operator && <div className={s.demo}>Akses hanya baca.</div>}
      {overview.isError && (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      )}
      <div className={s.stats}>
        {[
          {
            label: 'Total Program Bantuan',
            value: `${overviewItems.length} Program`,
            note: `${count('ACTIVE')} Aktif · ${count('DRAFT')} Draft`,
            Icon: Layers,
          },
          {
            label: 'Total Pagu Anggaran',
            value: millions(budget),
            note: 'Tunai & Barang',
            Icon: Wallet,
          },
          {
            label: 'Realisasi Dana Tersalurkan',
            value: millions(spent),
            note: `${percent(spent, budget)}% · Sisa ${millions(remaining)}`,
            Icon: CheckCircle2,
          },
          {
            label: 'Progres target penerima',
            value: `${used.toLocaleString('id-ID')} / ${quota.toLocaleString('id-ID')}`,
            note: `KPM · ${percent(used, quota)}% · Sisa ${Math.max(quota - used, 0)} penerima`,
            Icon: Users,
          },
        ].map(({ label, value, note, Icon }) => (
          <section className={s.card} key={label}>
            <div className={s.statTitle}>
              {label}
              <Icon size={18} />
            </div>
            <strong className={s.statValue}>{overview.isPending ? '…' : value}</strong>
            <small>{overview.isPending ? 'Memuat data' : note}</small>
          </section>
        ))}
      </div>
      <div className={s.two}>
        <section className={s.card}>
          <header>
            <div>
              <h2>Siklus Status Program &amp; Proteksi Data Final</h2>
              <p>Hak kelola DRAFT dan penguncian parameter final</p>
            </div>
            <span className={s.badge}>No Hard Delete</span>
          </header>
          <div className={s.total}>
            Total entitas program terdaftar <strong>{overviewItems.length} Program</strong>
          </div>
          <div className={s.two}>
            {[
              {
                label: 'Program AKTIF',
                value: count('ACTIVE'),
                note: 'Nominal & periode dikunci',
              },
              {
                label: 'Program DRAFT (Editable)',
                value: count('DRAFT'),
                note: 'Edit parameter khusus Operator',
              },
              {
                label: 'Program SELESAI (Final)',
                value: count('CLOSED'),
                note: 'Permanen · parameter inti terkunci',
              },
              {
                label: 'Bentuk Bantuan',
                value: `${overviewItems.filter((p) => p.kind === 'TUNAI').length} Tunai`,
                note: `${overviewItems.filter((p) => p.kind !== 'TUNAI').length} Barang`,
              },
            ].map((item) => (
              <div className={s.inset} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </div>
            ))}
          </div>
        </section>
        <section className={s.card}>
          <header>
            <div>
              <h2>Acuan Validasi &amp; Sisa Anggaran</h2>
              <p>Aturan penyaluran diverifikasi server dan smart contract</p>
            </div>
            <span className={s.badge}>On-chain</span>
          </header>
          <div className={s.total}>
            <span>
              <ShieldCheck size={15} /> Program tercatat di smart contract
            </span>
            <strong>
              {onChain} dari {overviewItems.length} program
            </strong>
          </div>
          <div className={s.two}>
            {[
              {
                label: 'Acuan Nominal Penyaluran',
                value: 'Otomatis',
                note: 'Nominal disalin dari program oleh server',
              },
              {
                label: 'Kunci Anti-Duplikasi',
                value: 'NIK + Program + Periode',
                note: 'keccak256 · diperiksa server dan smart contract',
              },
              {
                label: 'Sisa Pagu Belum Terserap',
                value: rupiah(remaining),
                note: `${percent(remaining, budget)}% dari total pagu`,
              },
              {
                label: 'Sisa target Penerima',
                value: `${Math.max(quota - used, 0)} KPM`,
                note: 'Target penerima yang belum terealisasi',
              },
            ].map((item) => (
              <div className={s.inset} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <ProgramCharts
        programs={overviewItems.filter((p) => p.status !== 'DRAFT' || p.enrolledCount > 0)}
      />
      <div className={s.lower}>
        <section className={`${s.card} ${s.list}`}>
          <header>
            <div>
              <h2>Daftar Program Bantuan Sosial</h2>
              <p>Pilih program untuk melihat detail dan penerima yang terdaftar.</p>
            </div>
          </header>
          <div className={s.tabs}>
            {tabs.map((t) => (
              <button
                type="button"
                aria-pressed={status === t.value}
                onClick={() => params.set({ status: t.value })}
                key={t.value || 'all'}
              >
                {t.label} ({tabCount(t.value)})
              </button>
            ))}
          </div>
          <div className={s.filters}>
            <input
              aria-label="Cari program"
              placeholder="Filter nama atau kode…"
              maxLength={160}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                clearTimeout(timer.current)
                const value = e.target.value.trim()
                timer.current = setTimeout(() => setParamsRef.current({ search: value }), 300)
              }}
            />
            <select
              aria-label="Urutkan program"
              value={sort}
              onChange={(e) => params.set({ sort: e.target.value })}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={s.tableWrap}>
            {list.isPending ? (
              <TableSkeleton label="Memuat daftar program" />
            ) : list.isError ? (
              <ErrorState error={list.error} onRetry={() => void list.refetch()} />
            ) : !rows.length ? (
              <EmptyState>Tidak ada program sesuai filter.</EmptyState>
            ) : (
              <table>
                <thead>
                  <tr>
                    {[
                      'Program & Deskripsi',
                      'Bentuk',
                      'Periode',
                      'Nominal / KPM',
                      'Progres Realisasi',
                      'Status',
                      'Aksi',
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className={effectiveId === p.id ? s.selected : ''}>
                      <td>
                        <button
                          type="button"
                          className={s.programLink}
                          onClick={() => selectProgram(p.id, true)}
                        >
                          <small>
                            {p.code} · #{p.programIdShort}
                          </small>
                          <strong>{p.name}</strong>
                        </button>
                        {p.description && (
                          <p className={s.criteria} title={p.description}>
                            Deskripsi: {p.description}
                          </p>
                        )}
                      </td>
                      <td>
                        <span className={s.badge}>{p.kindLabel}</span>
                      </td>
                      <td>{p.periodRangeLabel}</td>
                      <td>
                        <strong>{p.amountPerRecipientFormatted}</strong>
                        <small className={s.lock}>
                          <LockKeyhole size={11} /> Acuan otomatis program
                        </small>
                      </td>
                      <td>
                        <strong>
                          {p.disbursedCount}/{p.enrolledCount} KPM (
                          {percent(p.disbursedCount, p.enrolledCount)}%)
                        </strong>
                        <progress
                          value={p.disbursedCount}
                          max={Math.max(p.enrolledCount, 1)}
                          aria-label={`Realisasi ${p.name}`}
                        />
                        <small>Sisa {Math.max(p.enrolledCount - p.disbursedCount, 0)} KPM</small>
                        <p>
                          Tersalurkan: {p.disbursedAmountFormatted}
                          <br />
                          Pagu: {p.totalBudgetFormatted}
                          <br />
                          Sisa: {p.remainingBudgetFormatted}
                        </p>
                      </td>
                      <td>
                        <span
                          className={`${s.badge} ${p.status === 'ACTIVE' ? s.green : p.status === 'DRAFT' ? s.amber : ''}`}
                        >
                          {p.statusLabel}
                        </span>
                      </td>
                      <td>
                        <div className={s.rowActions}>
                          <button
                            type="button"
                            className={
                              !can('program:update') || p.status === 'CLOSED'
                                ? s.actionFull
                                : undefined
                            }
                            onClick={() => selectProgram(p.id, true)}
                          >
                            Detail
                          </button>
                          {can('program:update') && p.status === 'DRAFT' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setFormState({ mode: 'edit', program: p })}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={s.actionFull}
                                onClick={() => setChainAction({ kind: 'create', program: p })}
                              >
                                Aktivasi (createProgram)
                              </button>
                            </>
                          )}
                          {can('program:update') && p.status === 'ACTIVE' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setFormState({ mode: 'edit', program: p })}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className={s.actionFull}
                                onClick={() => setChainAction({ kind: 'close', program: p })}
                              >
                                Tutup program
                              </button>
                            </>
                          )}
                          {can('program:update') && p.status !== 'CLOSED' && (
                            <>
                              <button
                                type="button"
                                className={s.actionFull}
                                onClick={() => setEnrollDialogProgram(p)}
                              >
                                Daftarkan penerima
                              </button>
                              <button
                                type="button"
                                className={s.actionFull}
                                disabled={p.status !== 'ACTIVE'}
                                title={
                                  p.status !== 'ACTIVE'
                                    ? 'Aktifkan program terlebih dahulu untuk registrasi on-chain'
                                    : undefined
                                }
                                onClick={() => setChainAction({ kind: 'register', program: p })}
                              >
                                Registrasi on-chain
                              </button>
                            </>
                          )}
                          {p.status === 'CLOSED' && (
                            <small>
                              <LockKeyhole size={11} /> Final · Terkunci
                            </small>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <footer className={s.listFooter}>
            {list.data && (
              <Pager
                page={list.data.page}
                totalPages={list.data.totalPages}
                total={list.data.total}
                onPage={(next) => params.set({ page: next }, false)}
              />
            )}
            <p className={s.tableFooter}>Tidak tersedia hard delete</p>
          </footer>
        </section>
        <section
          ref={detailSectionRef}
          id="detail-program"
          aria-label="Detail program"
          className={`${s.card} ${s.detailSection}`}
        >
          {!effectiveId ? (
            <EmptyState>Pilih program untuk melihat detail.</EmptyState>
          ) : detail.isPending ? (
            <TableSkeleton label="Memuat detail program" rows={6} />
          ) : detail.isError ? (
            <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
          ) : selected ? (
            <>
              <header className={s.detailHeader}>
                <div>
                  <small className={s.accent}>DETAIL PROGRAM</small>
                  <h2>{selected.name}</h2>
                  <p>
                    #{selected.programIdShort} · {selected.periodRangeLabel}
                  </p>
                </div>
                <span
                  className={`${s.badge} ${selected.status === 'ACTIVE' ? s.green : selected.status === 'DRAFT' ? s.amber : ''}`}
                >
                  {selected.statusLabel}
                </span>
              </header>
              <div className={s.detailGrid}>
                <div className={s.detailMeta}>
                  {selected.description && (
                    <p>
                      <strong>Deskripsi:</strong> {selected.description}
                    </p>
                  )}
                  {selected.createTxHash && (
                    <p className={s.detailTxRow}>
                      Transaksi aktivasi:{' '}
                      <HashLink hash={selected.createTxHash} short={selected.createTxHashShort} />
                    </p>
                  )}
                  <p>
                    Sumber dana: {selected.fundSource} · Kode: {selected.code}
                  </p>
                </div>
                <div className={`${s.inset} ${s.detailSummary}`}>
                  <h3>Ringkasan Realisasi</h3>
                  <small className={s.lock}>
                    <LockKeyhole size={12} /> Nominal {selected.amountPerRecipientFormatted} / KPM
                    terkunci otomatis · {selected.kindLabel}
                  </small>
                  <dl className={s.summaryGrid}>
                    {[
                      ['Pagu', selected.summary.paguFormatted],
                      [
                        'Realisasi',
                        `${selected.summary.realisasiFormatted} (${selected.summary.realisasiCount} KPM)`,
                      ],
                      ['Sisa pagu', selected.summary.sisaFormatted],
                      ['Target penerima', `${selected.summary.target} KPM`],
                      ['Persentase', `${selected.summary.percentage}%`],
                      ['Teregistrasi on-chain', `${selected.registeredCount} KPM`],
                    ].map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              <div className={s.detailEnrollments}>
                <div className={s.detailEnrollmentsHeader}>
                  <h3>Penerima Terdaftar</h3>
                  <div className={s.tabs} role="group" aria-label="Filter status pendaftaran">
                    {enrollmentTabs.map((t) => (
                      <button
                        type="button"
                        key={t.value || 'all'}
                        aria-pressed={enrollStatus === t.value}
                        onClick={() =>
                          params.set({ enrollStatus: t.value, enrollPage: null }, false)
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {enrollments.isPending ? (
                  <TableSkeleton label="Memuat penerima terdaftar" rows={4} />
                ) : enrollments.isError ? (
                  <ErrorState
                    error={enrollments.error}
                    onRetry={() => void enrollments.refetch()}
                  />
                ) : !enrollments.data.items.length ? (
                  <EmptyState>Belum ada penerima terdaftar pada program ini.</EmptyState>
                ) : (
                  <div className={`${s.tableWrap} ${s.enrollmentTableWrap}`}>
                    <table>
                      <thead>
                        <tr>
                          <th>Penerima</th>
                          <th>NIK</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.data.items.map((e) => (
                          <tr key={e.id}>
                            <td>
                              <strong>{e.recipientName}</strong>
                            </td>
                            <td>
                              <code>{e.recipientNikMasked}</code>
                            </td>
                            <td>
                              <span
                                className={`${s.badge} ${e.status === 'REGISTERED_ONCHAIN' ? s.green : ''}`}
                              >
                                {e.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {enrollments.data && (
                  <Pager
                    page={enrollments.data.page}
                    totalPages={enrollments.data.totalPages}
                    total={enrollments.data.total}
                    onPage={(next) => params.set({ enrollPage: next }, false)}
                  />
                )}
              </div>
            </>
          ) : null}
        </section>
      </div>
      {formState && (
        <ProgramForm
          initial={formState.mode === 'edit' ? formState.program : undefined}
          onClose={() => setFormState(null)}
        />
      )}
      {enrollDialogProgram && (
        <EnrollRecipientsDialog
          program={enrollDialogProgram}
          onClose={() => setEnrollDialogProgram(null)}
        />
      )}
      {chainAction && (
        <ProgramChainActionDialog
          kind={chainAction.kind}
          program={chainAction.program}
          onClose={() => setChainAction(null)}
        />
      )}
    </div>
  )
}

function EnrollRecipientsDialog({
  program,
  onClose,
}: {
  program: ProgramViewModel
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const candidatesQuery = useRecipientsQuery({
    page: 1,
    limit: 100,
    status: 'FINAL',
    notEnrolledIn: program.id,
    q: search.trim() || undefined,
  })
  const enrollMutation = useEnrollRecipientsMutation()

  const candidates = candidatesQuery.data?.items ?? []

  function toggleRecipient(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : prev.length < 100
          ? [...prev, id]
          : prev,
    )
  }

  function toggleAll() {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(candidates.slice(0, 100).map((c) => c.id))
    }
  }

  async function handleEnroll() {
    if (!selectedIds.length || enrollMutation.isPending) return
    await enrollMutation.mutateAsync({
      programId: program.id,
      recipientIds: selectedIds,
    })
    onClose()
  }

  const formattedError = enrollMutation.error ? formatApiError(enrollMutation.error) : null

  return (
    <RecipientDialog
      title={`Daftarkan Penerima · ${program.code}`}
      subtitle="Menampilkan penerima berstatus FINAL yang belum terdaftar pada program ini (maksimal 100 per pendaftaran)."
      onClose={() => {
        if (!enrollMutation.isPending) onClose()
      }}
    >
      <div className={s.form}>
        <label className={s.full}>
          Cari penerima FINAL
          <input
            aria-label="Cari kandidat penerima"
            placeholder="Cari nama atau hash komitmen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className={s.full}>
          {candidatesQuery.isPending ? (
            <TableSkeleton rows={5} label="Memuat penerima FINAL" />
          ) : candidatesQuery.isError ? (
            <ErrorState
              error={candidatesQuery.error}
              onRetry={() => void candidatesQuery.refetch()}
            />
          ) : !candidates.length ? (
            <EmptyState>
              Tidak ada penerima berstatus FINAL yang belum terdaftar pada program ini.
            </EmptyState>
          ) : (
            <>
              <div className={s.actions}>
                <button type="button" onClick={toggleAll}>
                  {selectedIds.length === candidates.length
                    ? 'Batalkan Semua Pilihan'
                    : 'Pilih Semua di Halaman Ini'}
                </button>
                <small>{selectedIds.length} dipilih (maks. 100)</small>
              </div>
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Pilih</th>
                      <th>Nama Penerima</th>
                      <th>NIK (Tersamar)</th>
                      <th>Domisili</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Pilih ${c.name}`}
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleRecipient(c.id)}
                          />
                        </td>
                        <td>{c.name}</td>
                        <td>
                          <code>{c.nikMasked}</code>
                        </td>
                        <td>{c.addressLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        {formattedError && (
          <div role="alert" className={s.full}>
            <p>{formattedError.message}</p>
            {formattedError.requestId && <small>ID Permintaan: {formattedError.requestId}</small>}
          </div>
        )}
        <footer className={s.full}>
          <button type="button" disabled={enrollMutation.isPending} onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className={s.primary}
            disabled={!selectedIds.length || enrollMutation.isPending}
            onClick={() => void handleEnroll()}
          >
            {enrollMutation.isPending
              ? 'Mendaftarkan…'
              : `Daftarkan ${selectedIds.length} Penerima`}
          </button>
        </footer>
      </div>
    </RecipientDialog>
  )
}

function ProgramChainActionDialog({
  kind,
  program,
  onClose,
}: {
  kind: 'create' | 'register' | 'close'
  program: ProgramViewModel
  onClose: () => void
}) {
  const wallet = useWallet()
  const activateIntent = useActivateProgramIntentMutation()
  const registerIntent = useRegisterRecipientsIntentMutation()
  const closeIntent = useCloseProgramIntentMutation()
  const confirmMutation = useConfirmProgramChainMutation()

  const enrolledQuery = useProgramEnrollmentsQuery(program.id, {
    page: 1,
    limit: 100,
    status: 'ENROLLED',
    enabled: kind === 'register',
  })

  const [closeConfirmed, setCloseConfirmed] = useState(false)
  const [phase, setPhase] = useState<'summary' | 'waiting-block' | 'timeout' | 'confirmed'>(
    'summary',
  )
  const [txHash, setTxHash] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  )
  const [errorMsg, setErrorMsg] = useState<{ message: string; requestId?: string | null } | null>(
    null,
  )

  const programPollQuery = useProgramDetailQuery(program.id, {
    enabled: phase === 'waiting-block',
    refetchInterval: phase === 'waiting-block' ? POLL_INTERVAL_MS : false,
  })

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      wallet.clearPendingTx()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'waiting-block' || !programPollQuery.data) return
    if (kind === 'create' && programPollQuery.data.status === 'ACTIVE') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setPhase('confirmed')
    } else if (kind === 'close' && programPollQuery.data.status === 'CLOSED') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setPhase('confirmed')
    }
  }, [kind, phase, programPollQuery.data])

  async function pollConfirmOnce(hash: string): Promise<boolean> {
    const res = await confirmMutation.mutateAsync({
      programId: program.id,
      kind,
      txHash: hash,
    })
    if (res.status === 'CONFIRMED') {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      wallet.clearPendingTx()
      setPhase('confirmed')
      return true
    }
    return false
  }

  function startConfirmationPolling(hash: string) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    pollTimerRef.current = setInterval(() => {
      void pollConfirmOnce(hash).catch((err) => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        const formatted = formatApiError(err)
        setErrorMsg({ message: formatted.message, requestId: formatted.requestId })
        setPhase('summary')
      })
    }, POLL_INTERVAL_MS)

    timeoutRef.current = setTimeout(() => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      setPhase('timeout')
    }, POLL_TIMEOUT_MS)
  }

  async function handleExecute() {
    setErrorMsg(null)
    try {
      if (kind === 'create') {
        const intent = await activateIntent.mutateAsync(program.id)
        const hash = await wallet.sendIntent({
          to: intent.to,
          data: intent.data,
          label: `Aktivasi program ${program.code}`,
        })
        setTxHash(hash)
        setPhase('waiting-block')
        const confirmedImmediately = await pollConfirmOnce(hash)
        if (!confirmedImmediately) {
          startConfirmationPolling(hash)
        }
        return
      }

      if (kind === 'close') {
        if (!closeConfirmed) return
        const intent = await closeIntent.mutateAsync(program.id)
        const hash = await wallet.sendIntent({
          to: intent.to,
          data: intent.data,
          label: `Tutup program ${program.code}`,
        })
        setTxHash(hash)
        setPhase('waiting-block')
        const confirmedImmediately = await pollConfirmOnce(hash)
        if (!confirmedImmediately) {
          startConfirmationPolling(hash)
        }
        return
      }

      // kind === 'register': execute in batches of at most 100
      const enrolledItems = enrolledQuery.data?.items ?? []
      const allIds = enrolledItems.map((item) => item.recipientId)
      if (!allIds.length) {
        setErrorMsg({ message: 'Tidak ada penerima ENROLLED yang perlu diregistrasikan on-chain.' })
        return
      }

      const batches: string[][] = []
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        batches.push(allIds.slice(i, i + BATCH_SIZE))
      }

      for (let b = 0; b < batches.length; b++) {
        setBatchProgress({ current: b + 1, total: batches.length })
        const intent = await registerIntent.mutateAsync({
          programId: program.id,
          recipientIds: batches[b],
        })
        const hash = await wallet.sendIntent({
          to: intent.to,
          data: intent.data,
          label: `Registrasi on-chain ${program.code} (Batch ${b + 1}/${batches.length})`,
        })
        setTxHash(hash)
        setPhase('waiting-block')
        const confirmedImmediately = await pollConfirmOnce(hash)
        if (!confirmedImmediately && b === batches.length - 1) {
          startConfirmationPolling(hash)
          return
        }
      }
    } catch (err) {
      const formatted = formatApiError(err)
      setErrorMsg({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  async function handleManualRecheck() {
    if (!txHash) return
    setErrorMsg(null)
    setPhase('waiting-block')
    try {
      const done = await pollConfirmOnce(txHash)
      if (!done) {
        startConfirmationPolling(txHash)
      }
    } catch (err) {
      const formatted = formatApiError(err)
      setErrorMsg({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  const titleMap = {
    create: `Aktivasi Program On-Chain (createProgram) · ${program.code}`,
    register: `Registrasi Penerima On-Chain · ${program.code}`,
    close: `Tutup Program On-Chain (closeProgram) · ${program.code}`,
  }

  const isBusy =
    activateIntent.isPending ||
    registerIntent.isPending ||
    closeIntent.isPending ||
    confirmMutation.isPending ||
    phase === 'waiting-block'

  const enrolledCountToRegister = enrolledQuery.data?.items.length ?? 0

  return (
    <RecipientDialog
      title={titleMap[kind]}
      subtitle="Transaksi ditandatangani oleh wallet Kelurahan dan diverifikasi oleh server dari receipt blok Hyperledger Besu."
      onClose={() => {
        if (!isBusy) onClose()
      }}
    >
      <div className={s.form}>
        <div className={`${s.inset} ${s.full}`}>
          <h3>Ringkasan Konfirmasi On-Chain</h3>
          <dl>
            <div>
              <dt>Program</dt>
              <dd>
                {program.name} ({program.code})
              </dd>
            </div>
            <div>
              <dt>Nominal / KPM</dt>
              <dd>{program.amountPerRecipientFormatted}</dd>
            </div>
            <div>
              <dt>Periode</dt>
              <dd>{program.periodRangeLabel}</dd>
            </div>
            {kind === 'register' && (
              <div>
                <dt>Kandidat ENROLLED siap registrasi</dt>
                <dd>{enrolledQuery.isPending ? 'Memuat…' : `${enrolledCountToRegister} KPM`}</dd>
              </div>
            )}
          </dl>
        </div>

        {kind === 'close' && phase === 'summary' && (
          <div className={`${s.inset} ${s.full}`}>
            <strong>Konfirmasi Ganda Penutupan Program</strong>
            <p>
              Penutupan program bersifat permanen di smart contract. Setelah ditutup, program tidak
              dapat diaktifkan kembali dan tidak dapat menerima penyaluran baru.
            </p>
            <label>
              <input
                type="checkbox"
                checked={closeConfirmed}
                onChange={(e) => setCloseConfirmed(e.target.checked)}
              />{' '}
              Saya memahami bahwa penutupan program tidak dapat diubah lagi.
            </label>
          </div>
        )}

        {batchProgress && (
          <div className={s.full} aria-live="polite">
            <small>
              Progres batch registrasi: {batchProgress.current} dari {batchProgress.total} (maks.{' '}
              {BATCH_SIZE} penerima per transaksi)
            </small>
          </div>
        )}

        {phase === 'waiting-block' && (
          <div role="status" aria-live="polite" className={`${s.inset} ${s.full}`}>
            <strong>Menunggu blok…</strong>
            <p>
              Transaksi telah dikirim ke jaringan Hyperledger Besu. Menunggu konfirmasi receipt
              blok oleh server.
            </p>
            {txHash && <HashLink hash={txHash} short={shortenHash(txHash)} />}
            <div>
              <button
                type="button"
                disabled={confirmMutation.isPending}
                onClick={() => void handleManualRecheck()}
              >
                <RotateCw size={14} /> Periksa ulang
              </button>
            </div>
          </div>
        )}

        {phase === 'timeout' && (
          <div role="alert" aria-live="polite" className={`${s.inset} ${s.full}`}>
            <strong>Waktu tunggu konfirmasi blok habis</strong>
            <p>
              Receipt blok belum terkonfirmasi dalam batas waktu pantau otomatis. Anda dapat
              memeriksa ulang secara manual.
            </p>
            {txHash && <HashLink hash={txHash} short={shortenHash(txHash)} />}
            <div>
              <button
                type="button"
                className={s.primary}
                disabled={confirmMutation.isPending}
                onClick={() => void handleManualRecheck()}
              >
                <RotateCw size={14} /> Periksa ulang
              </button>
            </div>
          </div>
        )}

        {phase === 'confirmed' && (
          <div role="status" aria-live="polite" className={`${s.inset} ${s.full}`}>
            <strong>✓ Transaksi On-Chain Terkonfirmasi</strong>
            <p>Status program dan data on-chain telah berhasil diperbarui oleh server.</p>
            {txHash && <HashLink hash={txHash} short={shortenHash(txHash)} />}
          </div>
        )}

        {errorMsg && (
          <div role="alert" className={s.full}>
            <p>{errorMsg.message}</p>
            {errorMsg.requestId && <small>ID Permintaan: {errorMsg.requestId}</small>}
          </div>
        )}

        {phase === 'summary' && (
          <div className={s.full}>
            <WalletGate>
              <button
                type="button"
                className={s.primary}
                disabled={
                  isBusy ||
                  (kind === 'close' && !closeConfirmed) ||
                  (kind === 'register' && (enrolledQuery.isPending || enrolledCountToRegister === 0))
                }
                onClick={() => void handleExecute()}
              >
                {kind === 'create'
                  ? 'Tanda Tangani & Aktivasi Program'
                  : kind === 'register'
                    ? `Tanda Tangani Registrasi (${enrolledCountToRegister} KPM)`
                    : 'Tanda Tangani & Tutup Program'}
              </button>
            </WalletGate>
          </div>
        )}

        <footer className={s.full}>
          <button type="button" disabled={isBusy} onClick={onClose}>
            {phase === 'confirmed' ? 'Selesai & Tutup' : 'Tutup'}
          </button>
        </footer>
      </div>
    </RecipientDialog>
  )
}

export function Programs() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ProgramsContent />
    </Suspense>
  )
}
