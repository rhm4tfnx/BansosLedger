'use client'
import { appendAudit } from '@/stores/audit-store'
import { useState } from 'react'
import {
  Download,
  Plus,
  Tags,
  LockKeyhole,
  ShieldCheck,
  Wallet,
  Users,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { keccak256 } from 'js-sha3'
import { ProgramForm } from '@/components/features/dashboard/programs/program-form'
import { ProgramCharts } from '@/components/features/dashboard/programs/program-charts'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import {
  initialPrograms,
  aidTypes,
  type Program,
  type AidType,
  rupiah,
  millions,
} from '@/mocks/program-data'
import s from '@/components/features/dashboard/programs/programs.module.css'
export function Programs({
  role = 'operator',
}: {
  role?: 'operator' | 'kecamatan' | 'dinas-sosial'
}) {
  const operator = role === 'operator'
  const [programs, setPrograms] = useState(initialPrograms)
  const [types, setTypes] = useState(aidTypes)
  const [tab, setTab] = useState('Semua')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [form, setForm] = useState('')
  const [selectedId, setSelectedId] = useState(initialPrograms[0].id)
  const [editing, setEditing] = useState<Program | null | undefined>(undefined)
  const [master, setMaster] = useState(false)
  const [pending, setPending] = useState<{ id: string; action: string } | null>(null)
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState('')
  const [keys, setKeys] = useState<string[]>([])
  const [nik, setNik] = useState('0000000000000001')
  const active = programs.filter((p) => !p.deleted)
  const selected = programs.find((p) => p.id === selectedId)!
  const budget = active.reduce((n, p) => n + p.amount * p.quota, 0)
  const spent = active.reduce((n, p) => n + p.amount * p.used, 0)
  const quota = active.reduce((n, p) => n + p.quota, 0)
  const used = active.reduce((n, p) => n + p.used, 0)
  const count = (status: string) => active.filter((p) => p.status === status).length
  const rows = programs.filter(
    (p) =>
      (tab === 'Soft-Deleted' ? p.deleted : !p.deleted && (tab === 'Semua' || p.status === tab)) &&
      (!type || p.type === type) &&
      (!form || p.form === form) &&
      `${p.name} ${p.id} ${p.criteria}`.toLowerCase().includes(query.toLowerCase()),
  )
  function exportCsv() {
    const cell = (v: string | number) =>
      '"' +
      String(v)
        .replace(/^[=+@\-]/, "'$&")
        .replaceAll('"', '""') +
      '"'
    const csv = [
      [
        'Kode',
        'Nama',
        'Jenis',
        'Bentuk',
        'Periode',
        'Nominal',
        'Kuota',
        'Pagu',
        'Terpakai',
        'Tersalurkan',
        'Sisa Kuota',
        'Sisa Dana',
        'Status',
        'Kriteria',
      ],
      ...rows.map((p) => [
        p.id,
        p.name,
        p.type,
        p.form,
        p.period,
        p.amount,
        p.quota,
        p.amount * p.quota,
        p.used,
        p.used * p.amount,
        p.quota - p.used,
        (p.quota - p.used) * p.amount,
        p.deleted ? 'Soft-Deleted' : p.status,
        p.criteria,
      ]),
    ]
      .map((r) => r.map(cell).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'rekap-program-simulasi.csv'
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Rekap sesuai filter berhasil diekspor.')
  }
  function confirm() {
    if (!pending || !operator) return
    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id !== pending.id) return p
        if (pending.action === 'Aktifkan' && p.status === 'DRAFT' && !p.deleted)
          return { ...p, status: 'AKTIF' }
        if (pending.action === 'Selesaikan' && p.status === 'AKTIF' && !p.deleted)
          return { ...p, status: 'SELESAI' }
        if (pending.action === 'Soft Delete' && p.status === 'DRAFT') return { ...p, deleted: true }
        if (pending.action === 'Pulihkan' && p.deleted && p.status === 'DRAFT')
          return { ...p, deleted: false }
        return p
      }),
    )
    appendAudit({
      action: `${pending.action} program`,
      category: 'CRUD & draft',
      dataId: pending.id,
      diff: { before: programs.find((p) => p.id === pending.id), action: pending.action },
      source: 'Halaman program · simulasi',
    })
    setNotice(`${pending.action} berhasil dalam simulasi.`)
    setPending(null)
    setResult('')
  }
  function simulate(manipulate = false) {
    if (!operator) return
    if (selected.deleted || selected.status !== 'AKTIF') {
      setResult('Ditolak: program harus aktif dan tidak dihapus.')
      return
    }
    if (selected.used >= selected.quota) {
      setResult('Ditolak: kuota program telah habis.')
      return
    }
    if (!/^\d{16}$/.test(nik)) {
      setResult('Ditolak: NIK simulasi wajib 16 digit.')
      return
    }
    if (manipulate) {
      setResult('Ditolak: nominal tidak sesuai acuan program. Tidak ada perubahan realisasi.')
      return
    }
    const key = keccak256(JSON.stringify([keccak256(nik), selected.id, selected.period]))
    if (keys.includes(key)) {
      setResult('Ditolak: duplikasi NIK + program + periode terdeteksi.')
      return
    }
    setKeys([...keys, key])
    setPrograms((prev) => prev.map((p) => (p.id === selected.id ? { ...p, used: p.used + 1 } : p)))
    setResult(
      `Lolos validasi simulasi: ${rupiah(selected.amount)} untuk 1 KPM. Realisasi diperbarui. Kunci keccak256: 0x${key}. Bukan transaksi blockchain.`,
    )
  }
  return (
    <div className={s.page}>
      <div className={s.heading}>
        <div>
          <small>Dashboard Internal / Program Bantuan Sosial</small>
          <h1>Manajemen Program Bantuan Sosial</h1>
          <p>Kelola program, acuan penyaluran, serta pantau realisasi kuota dan pagu anggaran.</p>
        </div>
        <div className={s.actions}>
          <button onClick={exportCsv}>
            <Download size={15} />
            Ekspor Rekap (CSV)
          </button>
          {operator && (
            <>
              <button onClick={() => setMaster(true)}>
                <Tags size={15} />
                Jenis Bantuan Baru
              </button>
              <button className={s.primary} onClick={() => setEditing(null)}>
                <Plus size={16} />
                Tambah Program Bantuan
              </button>
            </>
          )}
        </div>
      </div>
      <div className={s.demo}>
        Mode simulasi · Data dummy, perubahan hilang saat refresh. Tidak terhubung ke smart
        contract.{!operator && ' · Akses hanya baca.'}
      </div>
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      <div className={s.stats}>
        {[
          {
            label: 'Total Program Bantuan',
            value: `${active.length} Program`,
            note: `${count('AKTIF')} Aktif · ${count('DRAFT')} Draft`,
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
            note: `${budget ? ((spent / budget) * 100).toFixed(1) : 0}% · Sisa ${millions(budget - spent)}`,
            Icon: CheckCircle2,
          },
          {
            label: 'Progres Kuota Penerima',
            value: `${used.toLocaleString('id-ID')} / ${quota.toLocaleString('id-ID')}`,
            note: `KPM · Sisa ${quota - used} penerima`,
            Icon: Users,
          },
        ].map(({ label, value, note, Icon }) => (
          <section className={s.card} key={label}>
            <div className={s.statTitle}>
              {label}
              <Icon size={18} />
            </div>
            <strong className={s.statValue}>{value}</strong>
            <small>{note}</small>
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
            Total entitas program terdaftar <strong>{active.length} Program</strong>
          </div>
          <div className={s.two}>
            {[
              {
                label: 'Program AKTIF',
                value: count('AKTIF'),
                note: 'Nominal & periode dikunci di wizard',
              },
              {
                label: 'Program DRAFT (Editable)',
                value: count('DRAFT'),
                note: 'Edit dan soft delete khusus Operator',
              },
              {
                label: 'Program SELESAI (Final)',
                value: count('SELESAI'),
                note: 'Permanen · parameter inti terkunci',
              },
              {
                label: 'Kategori Jenis Bantuan',
                value: `${types.length} Jenis`,
                note: types.map((t) => t.code).join(', '),
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
              <p>Simulasi aturan smart contract · referensi PMK 254/2015</p>
            </div>
            <span className={s.badge}>Simulasi EVM</span>
          </header>
          <div className={s.total}>
            <span>
              <ShieldCheck size={15} /> Status sinkronisasi smart contract
            </span>
            <strong>Belum terhubung</strong>
          </div>
          <div className={s.two}>
            {[
              {
                label: 'Acuan Nominal Penyaluran',
                value: 'Otomatis',
                note: 'Nilai tidak dapat diketik bebas di wizard',
              },
              {
                label: 'Kunci Anti-Duplikasi',
                value: 'NIK + Program + Periode',
                note: 'keccak256 · pemeriksaan sesi simulasi',
              },
              {
                label: 'Sisa Pagu Belum Terserap',
                value: rupiah(budget - spent),
                note: `${budget ? (((budget - spent) / budget) * 100).toFixed(1) : 0}% dari total pagu`,
              },
              {
                label: 'Sisa Kuota Penerima',
                value: `${quota - used} KPM`,
                note: 'Kuota yang belum disalurkan',
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
      <ProgramCharts programs={active} />
      <div className={s.lower}>
        <section className={`${s.card} ${s.list}`}>
          <header>
            <div>
              <h2>Daftar Program Bantuan Sosial</h2>
              <p>Pilih program untuk melihat detail dan menguji aturan penyaluran.</p>
            </div>
          </header>
          <div className={s.tabs}>
            {['Semua', 'AKTIF', 'DRAFT', 'SELESAI', 'Soft-Deleted'].map((t) => (
              <button aria-pressed={tab === t} onClick={() => setTab(t)} key={t}>
                {t} (
                {t === 'Semua'
                  ? active.length
                  : t === 'Soft-Deleted'
                    ? programs.filter((p) => p.deleted).length
                    : count(t)}
                )
              </button>
            ))}
          </div>
          <div className={s.filters}>
            <input
              aria-label="Cari program"
              placeholder="Filter nama, kode, kriteria…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filter jenis bantuan"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Semua Jenis Bantuan ({types.length})</option>
              {types.map((t) => (
                <option key={t.code}>{t.code}</option>
              ))}
            </select>
            <select
              aria-label="Filter bentuk bantuan"
              value={form}
              onChange={(e) => setForm(e.target.value)}
            >
              <option value="">Semua Bentuk</option>
              <option>Tunai</option>
              <option>Barang</option>
            </select>
          </div>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  {[
                    'Program & Kriteria',
                    'Jenis & Bentuk',
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
                  <tr key={p.id} className={selectedId === p.id ? s.selected : ''}>
                    <td>
                      <button
                        className={s.programLink}
                        onClick={() => {
                          setSelectedId(p.id)
                          setResult('')
                        }}
                      >
                        <small>#{p.id}</small>
                        <strong>{p.name}</strong>
                      </button>
                      <p className={s.criteria} title={p.criteria}>
                        Kriteria: {p.criteria}
                      </p>
                    </td>
                    <td>
                      <span className={s.badge}>{p.type}</span>
                      <p>{p.form}</p>
                    </td>
                    <td>{p.period}</td>
                    <td>
                      <strong>{rupiah(p.amount)}</strong>
                      <small className={s.lock}>
                        <LockKeyhole size={11} /> Acuan otomatis wizard
                      </small>
                    </td>
                    <td>
                      <strong>
                        {p.used}/{p.quota} KPM ({Math.round((p.used / p.quota) * 100)}%)
                      </strong>
                      <progress value={p.used} max={p.quota} aria-label={`Realisasi ${p.name}`} />
                      <small>Sisa {p.quota - p.used} KPM</small>
                      <p>
                        Tersalurkan: {millions(p.used * p.amount)}
                        <br />
                        Pagu: {millions(p.quota * p.amount)}
                        <br />
                        Sisa: {millions((p.quota - p.used) * p.amount)}
                      </p>
                    </td>
                    <td>
                      <span
                        className={`${s.badge} ${p.status === 'AKTIF' ? s.green : p.status === 'DRAFT' ? s.amber : ''}`}
                      >
                        {p.deleted ? 'DIHAPUS' : p.status}
                      </span>
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        <button
                          onClick={() => {
                            setSelectedId(p.id)
                            setResult('')
                          }}
                        >
                          {p.status === 'AKTIF' ? 'Uji Validasi' : 'Detail'}
                        </button>
                        {operator &&
                          (p.deleted ? (
                            <button onClick={() => setPending({ id: p.id, action: 'Pulihkan' })}>
                              Pulihkan
                            </button>
                          ) : p.status === 'DRAFT' ? (
                            <>
                              <button onClick={() => setPending({ id: p.id, action: 'Aktifkan' })}>
                                Aktifkan
                              </button>
                              <button onClick={() => setEditing(p)}>Edit</button>
                              <button
                                className={s.danger}
                                onClick={() => setPending({ id: p.id, action: 'Soft Delete' })}
                              >
                                Hapus
                              </button>
                            </>
                          ) : p.status === 'AKTIF' ? (
                            <button onClick={() => setPending({ id: p.id, action: 'Selesaikan' })}>
                              Selesaikan
                            </button>
                          ) : null)}
                        {p.status === 'SELESAI' && (
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
            {!rows.length && <p className={s.empty}>Tidak ada program sesuai filter.</p>}
          </div>
          <p className={s.tableFooter}>
            Menampilkan {rows.length} program · Tidak tersedia hard delete
          </p>
        </section>
        <aside className={s.card}>
          <header>
            <div>
              <small className={s.accent}>UJI SKENARIO VALIDASI</small>
              <h2>{selected.name}</h2>
              <p>
                #{selected.id} · {selected.period}
              </p>
            </div>
            <span className={s.badge}>{selected.deleted ? 'DIHAPUS' : selected.status}</span>
          </header>
          <p>
            <strong>Kriteria:</strong> {selected.criteria}
          </p>
          <div className={s.inset}>
            <h3>Simulasi Input Wizard Penyaluran</h3>
            <label>
              Nominal / Nilai Bantuan per KPM
              <input
                aria-label="Nominal otomatis"
                value={`${rupiah(selected.amount)} / KPM`}
                readOnly
              />
            </label>
            <small>
              <LockKeyhole size={12} /> Terkunci otomatis · {selected.form} (
              {selected.unit || 'Tanpa keterangan'}) · Sisa kuota {selected.quota - selected.used}{' '}
              KPM
            </small>
            {operator && (
              <>
                <label>
                  NIK dummy untuk uji duplikasi
                  <input
                    aria-label="NIK simulasi"
                    inputMode="numeric"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <div className={s.actions}>
                  <button className={s.success} onClick={() => simulate()}>
                    Simulasi Sesuai Aturan
                  </button>
                  <button className={s.danger} onClick={() => simulate(true)}>
                    Uji Manipulasi Nominal
                  </button>
                </div>
                <small>Ulangi NIK yang sama untuk menguji penolakan duplikasi.</small>
              </>
            )}
          </div>
          <ol className={s.steps}>
            <li>
              <strong>Validasi Status & Kuota Program</strong>
              <p>Program harus AKTIF, tidak dihapus, dan memiliki sisa kuota.</p>
            </li>
            <li>
              <strong>Acuan Nominal & Periode Otomatis</strong>
              <p>Parameter diambil dari program. Input nominal bebas ditolak.</p>
            </li>
            <li>
              <strong>Pemeriksaan Anti-Duplikasi (keccak256)</strong>
              <p>Hash NIK + ID program + periode mencegah penyaluran ganda pada sesi ini.</p>
            </li>
          </ol>
          {result && (
            <p role="status" className={s.result}>
              {result}
            </p>
          )}
          <small>
            Validasi frontend saja, bukan verifikasi validator Besu atau bukti kepatuhan regulasi.
          </small>
        </aside>
      </div>
      {editing !== undefined && operator && (
        <ProgramForm
          initial={editing || undefined}
          types={types}
          onClose={() => setEditing(undefined)}
          onSave={(p) => {
            setPrograms((prev) =>
              editing
                ? prev.map((old) =>
                    old.id === p.id && old.status === 'DRAFT' && !old.deleted ? p : old,
                  )
                : [...prev, p],
            )
            setEditing(undefined)
            appendAudit({
              action: editing ? 'Ubah draft program' : 'Tambah program',
              category: 'CRUD & draft',
              dataId: p.id,
              diff: { before: editing ?? null, after: p },
              source: 'Halaman program · simulasi',
            })
            setNotice('Program berhasil disimpan sebagai DRAFT.')
          }}
        />
      )}
      {master && operator && (
        <TypeDialog
          types={types}
          onClose={() => setMaster(false)}
          onAdd={(t) => setTypes([...types, t])}
        />
      )}
      {pending && (
        <RecipientDialog
          title={`${pending.action} Program`}
          subtitle={programs.find((p) => p.id === pending.id)?.name}
          onClose={() => setPending(null)}
        >
          <p>
            {pending.action === 'Aktifkan'
              ? 'Nominal, periode, kuota, dan kriteria akan terkunci. Program tidak dapat diedit atau dihapus setelah aktif.'
              : pending.action === 'Selesaikan'
                ? 'Program akan ditutup dan tidak dapat menerima penyaluran lagi. Sisa pagu tetap dicatat.'
                : pending.action === 'Soft Delete'
                  ? 'Data DRAFT akan dipindahkan ke arsip dan dapat dipulihkan.'
                  : 'Kembalikan program ke daftar DRAFT?'}
          </p>
          <div className={s.actions}>
            <button onClick={() => setPending(null)}>Batal</button>
            <button className={s.primary} onClick={confirm}>
              Konfirmasi {pending.action}
            </button>
          </div>
        </RecipientDialog>
      )}
    </div>
  )
}
function TypeDialog({
  types,
  onClose,
  onAdd,
}: {
  types: AidType[]
  onClose: () => void
  onAdd: (t: AidType) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [form, setForm] = useState<'Tunai' | 'Barang'>('Tunai')
  const [error, setError] = useState('')
  return (
    <RecipientDialog
      title="Master Jenis Bantuan Sosial Dinamis"
      subtitle="Tambahkan jenis baru tanpa mengubah struktur sistem utama. ISO/IEC 25010 · Adaptability."
      onClose={onClose}
    >
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          const c = code.trim().toUpperCase()
          if (!/^[A-Z0-9-]{2,20}$/.test(c) || !name.trim()) {
            setError('Kode 2–20 karakter: huruf, angka, atau tanda hubung. Nama wajib diisi.')
            return
          }
          if (types.some((t) => t.code === c)) {
            setError('Kode jenis bantuan sudah terdaftar.')
            return
          }
          onAdd({ code: c, name: name.trim(), form })
          setCode('')
          setName('')
          setError('Jenis bantuan berhasil ditambahkan.')
        }}
      >
        <label>
          Kode Jenis
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Contoh: BST"
          />
        </label>
        <label>
          Kepanjangan / Nama Jenis
          <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Bentuk Default
          <select value={form} onChange={(e) => setForm(e.target.value as 'Tunai' | 'Barang')}>
            <option>Tunai</option>
            <option>Barang</option>
          </select>
        </label>
        <button className={s.primary}>+ Tambah Jenis</button>
        {error && (
          <p role="status" className={s.full}>
            {error}
          </p>
        )}
      </form>
      <div className={s.typeList}>
        {types.map((t) => (
          <div key={t.code}>
            <strong>{t.code}</strong>
            <span>{t.name}</span>
            <small className={s.badge}>{t.form}</small>
          </div>
        ))}
      </div>
      <div className={s.actions}>
        <button onClick={onClose}>Tutup</button>
      </div>
    </RecipientDialog>
  )
}
