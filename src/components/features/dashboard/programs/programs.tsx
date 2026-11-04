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
} from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useUrlParams } from '@/hooks/use-url-params'
import {
  useProgramDetailQuery,
  useProgramEnrollmentsQuery,
  useProgramsQuery,
} from '@/lib/api/hooks/programs'
import type { EnrollmentStatus, ProgramStatus } from '@/lib/api-contract'
import type { ProgramViewModel } from '@/types'
import { ProgramCharts } from '@/components/features/dashboard/programs/program-charts'
import {
  COMING_SOON_TITLE,
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import s from '@/components/features/dashboard/programs/programs.module.css'

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
  const setParamsRef = useRef(params.set)
  useEffect(() => {
    setParamsRef.current = params.set
  })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
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
  const writeAction = (permission: Parameters<typeof can>[0]) => ({
    disabled: true,
    title: can(permission) ? COMING_SOON_TITLE : undefined,
  })

  function selectProgram(id: string) {
    setSelectedId(id)
    params.set({ enrollPage: null, enrollStatus: null }, false)
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
            <button type="button" className={s.primary} disabled title={COMING_SOON_TITLE}>
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
              <h2>Siklus Status Program & Proteksi Data Final</h2>
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
                note: 'Edit dan soft delete khusus Operator',
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
              <h2>Acuan Validasi & Sisa Anggaran</h2>
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
      <ProgramCharts programs={overviewItems.filter((p) => p.status !== 'DRAFT' || p.enrolledCount > 0)} />
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
                          onClick={() => selectProgram(p.id)}
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
                          <button type="button" onClick={() => selectProgram(p.id)}>
                            Detail
                          </button>
                          {can('program:update') && p.status === 'DRAFT' && (
                            <>
                              <button type="button" {...writeAction('program:update')}>
                                Aktivasi (createProgram)
                              </button>
                              <button type="button" {...writeAction('program:update')}>
                                Edit
                              </button>
                              {can('program:soft-delete') && (
                                <button
                                  type="button"
                                  className={s.danger}
                                  {...writeAction('program:soft-delete')}
                                >
                                  Hapus
                                </button>
                              )}
                            </>
                          )}
                          {can('program:update') && p.status === 'ACTIVE' && (
                            <>
                              <button type="button" {...writeAction('program:update')}>
                                Edit
                              </button>
                              <button type="button" {...writeAction('program:update')}>
                                Tutup program
                              </button>
                            </>
                          )}
                          {can('program:update') && p.status !== 'CLOSED' && (
                            <>
                              <button type="button" {...writeAction('program:update')}>
                                Daftarkan penerima
                              </button>
                              <button type="button" {...writeAction('program:update')}>
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
          {list.data && (
            <Pager
              page={list.data.page}
              totalPages={list.data.totalPages}
              total={list.data.total}
              onPage={(next) => params.set({ page: next }, false)}
            />
          )}
          <p className={s.tableFooter}>Tidak tersedia hard delete</p>
        </section>
        <aside className={s.card}>
          {!effectiveId ? (
            <EmptyState>Pilih program untuk melihat detail.</EmptyState>
          ) : detail.isPending ? (
            <TableSkeleton label="Memuat detail program" rows={6} />
          ) : detail.isError ? (
            <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
          ) : selected ? (
            <>
              <header>
                <div>
                  <small className={s.accent}>DETAIL PROGRAM</small>
                  <h2>{selected.name}</h2>
                  <p>
                    #{selected.programIdShort} · {selected.periodRangeLabel}
                  </p>
                </div>
                <span className={s.badge}>{selected.statusLabel}</span>
              </header>
              {selected.description && (
                <p>
                  <strong>Deskripsi:</strong> {selected.description}
                </p>
              )}
              {selected.createTxHash && (
                <p className={s.criteria}>
                  Transaksi aktivasi:{' '}
                  <HashLink hash={selected.createTxHash} short={selected.createTxHashShort} />
                </p>
              )}
              <p>
                Sumber dana: {selected.fundSource} · Kode: {selected.code}
              </p>
              <div className={s.inset}>
                <h3>Ringkasan Realisasi</h3>
                <small>
                  <LockKeyhole size={12} /> Nominal {selected.amountPerRecipientFormatted} / KPM
                  terkunci otomatis · {selected.kindLabel}
                </small>
                <dl>
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
              <h3>Penerima Terdaftar</h3>
              <div className={s.tabs} role="group" aria-label="Filter status pendaftaran">
                {enrollmentTabs.map((t) => (
                  <button
                    type="button"
                    key={t.value || 'all'}
                    aria-pressed={enrollStatus === t.value}
                    onClick={() => params.set({ enrollStatus: t.value, enrollPage: null }, false)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {enrollments.isPending ? (
                <TableSkeleton label="Memuat penerima terdaftar" rows={4} />
              ) : enrollments.isError ? (
                <ErrorState error={enrollments.error} onRetry={() => void enrollments.refetch()} />
              ) : !enrollments.data.items.length ? (
                <EmptyState>Belum ada penerima terdaftar pada program ini.</EmptyState>
              ) : (
                <div className={s.tableWrap}>
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
                          <td>{e.recipientName}</td>
                          <td>
                            <code>{e.recipientNikMasked}</code>
                          </td>
                          <td>{e.statusLabel}</td>
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
            </>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

export function Programs() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ProgramsContent />
    </Suspense>
  )
}
