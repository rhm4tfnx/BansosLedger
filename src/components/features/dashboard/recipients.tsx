'use client'
import { useState } from 'react'
import { appendAudit } from './audit-store'
import {
  Users,
  UserCheck,
  FilePenLine,
  LockKeyhole,
  Plus,
  Upload,
  Search,
  Eye,
  EyeOff,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import {
  initialRecipients,
  commitment,
  masked,
  money,
  programs,
  regions,
  type Recipient,
} from './recipient-data'
import { RecipientDialog } from './recipient-dialog'
import { RecipientForm } from './recipient-form'
import { RecipientImport } from './recipient-import'
import s from './recipients.module.css'
const tabs = ['Semua Aktif', 'DRAFT', 'TERVERIFIKASI', 'FINAL', 'Soft Deleted']
export function Recipients({
  role = 'operator',
}: {
  role?: 'operator' | 'kecamatan' | 'dinas-sosial'
}) {
  const [rows, setRows] = useState(initialRecipients)
  const [tab, setTab] = useState('Semua Aktif')
  const [program, setProgram] = useState('')
  const [region, setRegion] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [modal, setModal] = useState<'add' | 'edit' | 'import' | 'detail' | 'confirm' | null>(null)
  const [selected, setSelected] = useState<Recipient>()
  const [action, setAction] = useState('')
  const [revealed, setRevealed] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const active = rows.filter((r) => !r.deleted)
  const count = (t: string) =>
    t === 'Semua Aktif'
      ? active.length
      : t === 'Soft Deleted'
        ? rows.filter((r) => r.deleted).length
        : active.filter((r) => r.status === t).length
  const filtered = rows.filter(
    (r) =>
      (tab === 'Soft Deleted'
        ? r.deleted
        : !r.deleted && (tab === 'Semua Aktif' || r.status === tab)) &&
      (!program || r.program === program) &&
      (!region || r.region === region) &&
      `${r.name} ${r.nik} ${commitment(r.nik)} ${r.region}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  const pages = Math.max(1, Math.ceil(filtered.length / size))
  const current = Math.min(page, pages)
  const visible = filtered.slice((current - 1) * size, current * size)
  const log = (text: string, dataId = selected?.id ?? '—', diff: Record<string, unknown> = {}) =>
    appendAudit({
      action: text.replace(/\b\d{16}\b/g, '[NIK disamarkan]'),
      category: /NIK/i.test(text) ? 'Akses NIK / PII' : 'CRUD & draft',
      role:
        role === 'operator'
          ? 'Operator Kelurahan'
          : role === 'kecamatan'
            ? 'Kecamatan Balusu'
            : 'Dinas Sosial Kab. Barru',
      dataId,
      diff,
      source: 'Halaman penerima · simulasi',
    })
  const select = (r: Recipient, next: typeof modal) => {
    setSelected(r)
    setModal(next)
  }
  function confirm(r: Recipient, a: string) {
    setAction(a)
    select(r, 'confirm')
  }
  function transition() {
    if (!selected || role !== 'operator') return
    setRows((all) =>
      all.map((r) => {
        if (r.id !== selected.id) return r
        if (action === 'Verifikasi' && r.status === 'DRAFT' && !r.deleted)
          return { ...r, status: 'TERVERIFIKASI' }
        if (action === 'Kunci FINAL' && r.status === 'TERVERIFIKASI' && !r.deleted)
          return { ...r, status: 'FINAL', identityHash: commitment(r.nik) }
        if (action === 'Soft Delete' && r.status === 'DRAFT') return { ...r, deleted: true }
        if (action === 'Pulihkan' && r.deleted) return { ...r, deleted: false }
        return r
      }),
    )
    log(`${action}: ${selected.name}`)
    setNotice(`${action} berhasil dalam simulasi. Tidak ada transaksi blockchain yang dikirim.`)
    setModal(null)
  }
  function reveal(r: Recipient) {
    if (role !== 'operator') return
    if (revealed.includes(r.id)) setRevealed((x) => x.filter((id) => id !== r.id))
    else {
      setRevealed((x) => [...x, r.id])
      log(`Akses NIK lengkap: ${r.name}`, r.id)
    }
  }
  return (
    <div className={s.page}>
      <div className={s.stats}>
        {[
          { label: 'Total penerima aktif', value: active.length, icon: Users },
          { label: 'Menunggu verifikasi', value: count('DRAFT'), icon: FilePenLine },
          { label: 'Terverifikasi', value: count('TERVERIFIKASI'), icon: UserCheck },
          { label: 'Final & terkunci', value: count('FINAL'), icon: LockKeyhole },
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
      {notice && (
        <div className={s.notice} role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Tutup pemberitahuan">
            ×
          </button>
        </div>
      )}
      <section className={s.card}>
        <header className={s.cardHeader}>
          <div>
            <h2>
              Daftar Penerima Bantuan Sosial <span>Kelurahan Takkalasi</span>
            </h2>
            <p>
              Klik ikon mata untuk melihat NIK lengkap. Akses operator dicatat pada log aktivitas
              simulasi.
            </p>
          </div>
          <div className={s.actions}>
            <button disabled={role !== 'operator'} onClick={() => setModal('import')}>
              <Upload size={16} /> Impor CSV (P2)
            </button>
            <button
              className={s.primary}
              disabled={role !== 'operator'}
              onClick={() => {
                setSelected(undefined)
                setModal('add')
              }}
            >
              <Plus size={18} /> Tambah Penerima
            </button>
          </div>
        </header>
        <div className={s.filters}>
          <div className={s.tabs} role="group" aria-label="Filter status">
            {tabs.map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => {
                  setTab(t)
                  setPage(1)
                }}
              >
                {t} <span>({count(t)})</span>
              </button>
            ))}
          </div>
          <div className={s.filterFields}>
            <select
              aria-label="Filter program"
              value={program}
              onChange={(e) => {
                setProgram(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Semua Program Bansos</option>
              {programs.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select
              aria-label="Filter wilayah"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Semua RT/RW (Takkalasi)</option>
              {regions.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <label className={s.search}>
              <Search size={18} />
              <input
                aria-label="Cari penerima"
                placeholder="Cari nama, NIK, atau hash..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
              />
            </label>
          </div>
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                {[
                  'NAMA PENERIMA & DOMISILI',
                  'NIK (CONFIDENTIALITY & LOG)',
                  'PROGRAM & KELAYAKAN SALUR',
                  'SIKLUS STATUS',
                  'KOMITMEN HASH ON-CHAIN (KECCAK256)',
                  'AKSI & SIKLUS',
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <p>
                      {r.region} · {r.job}
                    </p>
                    <small>
                      {money(r.income)}/bln · {r.dependents} Tanggungan
                    </small>
                  </td>
                  <td>
                    <div className={s.nik}>
                      <code>{revealed.includes(r.id) ? r.nik : masked(r.nik)}</code>
                      <button
                        disabled={role !== 'operator'}
                        aria-label={`${revealed.includes(r.id) ? 'Sembunyikan' : 'Buka'} NIK ${r.name}`}
                        onClick={() => reveal(r)}
                      >
                        {revealed.includes(r.id) ? <EyeOff size={15} /> : <Eye size={15} />}
                        {revealed.includes(r.id) ? 'Tutup' : 'Buka'}
                      </button>
                    </div>
                    <small>Default Masked (Confidentiality)</small>
                  </td>
                  <td>
                    <span className={s.program}>{r.program}</span>
                    <p className={r.status === 'FINAL' && !r.deleted ? s.success : s.warning}>
                      {r.status === 'FINAL' && !r.deleted
                        ? `Layak Salur (${r.received}x Terima)`
                        : 'Belum Dapat Disalurkan'}
                    </p>
                  </td>
                  <td>
                    <span
                      className={`${s.badge} ${r.deleted ? s.deleted : r.status === 'FINAL' ? s.final : r.status === 'DRAFT' ? s.draft : s.verified}`}
                    >
                      {r.deleted ? 'SOFT DELETED' : r.status}
                    </span>
                  </td>
                  <td>
                    {r.status === 'FINAL' ? (
                      <>
                        <div className={s.hash}>
                          <code>
                            {r.identityHash?.slice(0, 11)}...{r.identityHash?.slice(-8)}
                          </code>
                          <button
                            aria-label={`Salin hash ${r.name}`}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(r.identityHash || '')
                                setNotice('Hash simulasi disalin.')
                              } catch {
                                setNotice(
                                  'Clipboard tidak tersedia. Hash lengkap dapat dilihat melalui Detail.',
                                )
                              }
                            }}
                          >
                            <Copy size={15} />
                          </button>
                        </div>
                        <small className={s.success}>Komitmen FINAL · Simulasi Besu</small>
                      </>
                    ) : (
                      <>
                        <p>Belum Tercatat On-Chain</p>
                        <small>Menunggu status dikunci FINAL</small>
                      </>
                    )}
                  </td>
                  <td>
                    <div className={s.rowActions}>
                      <button onClick={() => select(r, 'detail')}>Detail</button>
                      {role === 'operator' &&
                        (r.deleted ? (
                          <button onClick={() => confirm(r, 'Pulihkan')}>Pulihkan</button>
                        ) : r.status === 'DRAFT' ? (
                          <>
                            <button
                              className={s.secondary}
                              onClick={() => confirm(r, 'Verifikasi')}
                            >
                              Verifikasi <ArrowRight size={13} />
                            </button>
                            <button onClick={() => select(r, 'edit')}>Edit</button>
                            <button className={s.danger} onClick={() => confirm(r, 'Soft Delete')}>
                              Soft Delete
                            </button>
                          </>
                        ) : r.status === 'TERVERIFIKASI' ? (
                          <>
                            <button className={s.green} onClick={() => confirm(r, 'Kunci FINAL')}>
                              <LockKeyhole size={13} /> Kunci FINAL
                            </button>
                            <small>Edit/Hapus Terkunci</small>
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
              {!visible.length && (
                <tr>
                  <td colSpan={6} className={s.empty}>
                    Tidak ada penerima yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className={s.pagination}>
          <span>
            Menampilkan {filtered.length ? (current - 1) * size + 1 : 0} sampai{' '}
            {Math.min(current * size, filtered.length)} dari {filtered.length} data penerima
          </span>
          <label>
            Baris:{' '}
            <select
              aria-label="Jumlah baris"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value))
                setPage(1)
              }}
            >
              {[5, 10, 20, 50].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <div>
            <button
              aria-label="Halaman sebelumnya"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>{current}</span>
            <button
              aria-label="Halaman berikutnya"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {(modal === 'add' || modal === 'edit') && (
        <RecipientForm
          existing={rows}
          editing={modal === 'edit' ? selected : undefined}
          onClose={() => setModal(null)}
          onSave={(r) => {
            if (role !== 'operator') return
            setRows((all) =>
              all.some((x) => x.id === r.id)
                ? all.map((x) => (x.id === r.id && x.status === 'DRAFT' ? r : x))
                : [...all, r],
            )
            log(`Simpan DRAFT: ${r.name}`, r.id, {
              before: rows.find((x) => x.id === r.id)
                ? { ...rows.find((x) => x.id === r.id), nik: '[Disamarkan]' }
                : null,
              after: { ...r, nik: '[Disamarkan]' },
            })
            setNotice('Data penerima berhasil disimpan sementara.')
            setModal(null)
          }}
        />
      )}
      {modal === 'import' && (
        <RecipientImport
          existing={rows}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (role !== 'operator') return
            setRows((all) => [...all, ...data])
            log(`Impor CSV: ${data.length} penerima DRAFT`)
            setNotice(`${data.length} baris valid berhasil diimpor.`)
            setModal(null)
          }}
        />
      )}
      {modal === 'detail' && selected && (
        <RecipientDialog
          title="Detail Penerima Bantuan"
          subtitle="Identitas dan status penerima dalam simulasi."
          onClose={() => setModal(null)}
        >
          <div className={s.formBody}>
            <dl className={s.details}>
              {[
                ['Nama', selected.name],
                ['NIK', revealed.includes(selected.id) ? selected.nik : masked(selected.nik)],
                ['Nomor KK', masked(selected.kk)],
                ['Wilayah', selected.region],
                ['Alamat', selected.address],
                ['Pekerjaan', selected.job],
                ['Penghasilan', money(selected.income)],
                ['Program', selected.program],
                ['Tanggungan', String(selected.dependents)],
                ['Status', selected.deleted ? 'Soft Deleted' : selected.status],
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
                {selected.status === 'FINAL' && !selected.deleted
                  ? 'Layak salur — data telah dikunci FINAL.'
                  : 'Belum dapat disalurkan — data harus aktif dan berstatus FINAL.'}
              </p>
              <strong>Komitmen keccak256 FINAL</strong>
              <code>
                {selected.identityHash ||
                  'Belum dibentuk. Komitmen disimpan saat status dikunci FINAL.'}
              </code>
              <p>
                Referensi on-chain: belum tersedia. Komitmen simulasi ini bukan bukti transaksi
                smart contract.
              </p>
            </div>
            <h3>Riwayat Bantuan Sosial</h3>
            {selected.history?.length ? (
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Program</th>
                      <th>Nominal</th>
                      <th>Referensi simulasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.history.map((entry) => (
                      <tr key={entry.reference}>
                        <td>{new Date(entry.date).toLocaleDateString('id-ID')}</td>
                        <td>{entry.program}</td>
                        <td>{money(entry.amount)}</td>
                        <td>{entry.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Belum ada riwayat bantuan yang diterima.</p>
            )}
          </div>
        </RecipientDialog>
      )}
      {modal === 'confirm' && selected && (
        <RecipientDialog title={`${action} Penerima`} onClose={() => setModal(null)}>
          <div className={s.formBody}>
            <p>
              Anda akan melakukan <strong>{action}</strong> untuk <strong>{selected.name}</strong>.
            </p>
            <p>
              {action === 'Kunci FINAL'
                ? 'Data FINAL tidak dapat diedit atau dihapus dalam simulasi ini. Tidak ada transaksi yang dikirim ke jaringan Besu.'
                : action === 'Soft Delete'
                  ? 'Data akan dipindahkan ke Soft Deleted dan dapat dipulihkan.'
                  : 'Perubahan ini hanya berlaku pada data dummy sesi ini.'}
            </p>
          </div>
          <footer>
            <button onClick={() => setModal(null)}>Batal</button>
            <button className={s.primary} onClick={transition}>
              Konfirmasi {action}
            </button>
          </footer>
        </RecipientDialog>
      )}
    </div>
  )
}
