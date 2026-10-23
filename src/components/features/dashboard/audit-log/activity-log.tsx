'use client'
import { useRef, useState } from 'react'
import { Download, Printer, ShieldCheck, Search, X, LockKeyhole, Plus } from 'lucide-react'
import { Dashboard } from '@/components/features/dashboard/overview/dashboard'
import { AuditPanels } from '@/components/features/dashboard/audit-log/audit-panels'
import {
  appendAudit,
  useAudit,
  categories,
  roles,
  wita,
  localDate,
  downloadAudit,
  type AuditEntry,
} from '@/stores/audit-store'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
const scenarios = [
  'Duplikasi penyaluran',
  'Ketidaksesuaian nominal',
  'Wallet tidak berwenang',
  'KPM tidak valid',
  'Manipulasi riwayat',
]
export function ActivityLog() {
  const logs = useAudit()
  const [role, setRole] = useState(roles[0])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [status, setStatus] = useState('')
  const [authorization, setAuthorization] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const [notice, setNotice] = useState('')
  const [printed, setPrinted] = useState('')
  const detail = useRef<HTMLDialogElement>(null)
  const print = useRef<HTMLDialogElement>(null)
  const rows = logs.filter(
    (l) =>
      (!category || l.category === category) &&
      (!roleFilter || l.role === roleFilter) &&
      (!status || l.status === status) &&
      (!authorization || l.authorization === authorization) &&
      (!from || localDate(l.time) >= from) &&
      (!to || localDate(l.time) <= to) &&
      JSON.stringify(l).toLowerCase().includes(query.toLowerCase()),
  )
  const add = (
    action: string,
    category: string,
    status = 'SUCCESS',
    extra: Partial<AuditEntry> = {},
  ) => {
    appendAudit({ action, category, status, role, ...extra })
    setNotice('Aktivitas simulasi ditambahkan ke log sesi. Tidak ada perubahan data produksi.')
  }
  function transaction() {
    const dataId = 'SIM-DATA-' + crypto.randomUUID().slice(0, 8)
    add('Fase 1: simpan data awal', 'Transaksi', 'PENDING', { dataId })
    add('Fase 2: unggah bukti contoh', 'IPFS', 'SUCCESS', { dataId, cid: 'SIM-CID-' + dataId })
    add('Fase 3: konfirmasi transaksi contoh', 'Transaksi', 'SUCCESS', {
      dataId,
      cid: 'SIM-CID-' + dataId,
      txHash: 'SIM-TX-' + dataId,
      block: 'SIM-18432',
      wallet: 'SIM-WALLET-KELURAHAN',
      authorization: 'Simulasi authorized',
    })
  }
  return (
    <Dashboard section="Log aktivitas">
      <div className={s.page}>
        <div className={s.breadcrumb}>Dashboard / Monitoring / Log aktivitas</div>
        <section className={s.card}>
          <div className={s.heading}>
            <div>
              <div className={s.labels}>
                <span className={s.badge}>/dashboard/log-aktivitas</span>
                <span className={s.badge}>
                  <LockKeyhole size={12} /> Tanpa edit / hapus UI
                </span>
              </div>
              <h1>Log aktivitas & jejak audit keamanan</h1>
              <p>Pusat pencatatan operasional, siklus transaksi, dan pemeriksaan integritas.</p>
            </div>
            <div className={s.actions}>
              <button onClick={() => downloadAudit(rows)}>
                <Download size={15} /> Ekspor CSV
              </button>
              <button
                className={s.primary}
                onClick={() => {
                  setPrinted(wita(new Date().toISOString()))
                  print.current?.showModal()
                }}
              >
                <Printer size={15} /> Cetak / PDF
              </button>
            </div>
          </div>
          <aside className={s.warning}>
            <ShieldCheck size={18} />
            <div>
              <b>Mode simulasi sesi · Backend tidak terhubung</b>
              <p>
                Log dibagikan antarhalaman saat navigasi internal, tetapi hilang ketika dimuat
                ulang. Tidak ada jaminan append-only database, RBAC server, atau validasi
                blockchain. Jangan gunakan sebagai bukti audit resmi.
              </p>
            </div>
          </aside>
          <div className={s.simulator}>
            <span className={s.eyebrow}>SIMULATOR JEJAK AUDIT</span>
            <div className={s.actions}>
              {[
                ['Lihat NIK penuh', 'Akses NIK / PII'],
                ['Soft delete draft', 'CRUD & draft'],
                ['Login / koneksi wallet', 'Autentikasi'],
                ['Logout', 'Autentikasi'],
                ['Tambah / ubah program', 'CRUD & draft'],
                ['Verifikasi LPJ / STS-NTPN', 'LPJ'],
              ].map(([action, cat]) => (
                <button
                  key={action}
                  disabled={role !== roles[0]}
                  onClick={() =>
                    add(action, cat, 'SUCCESS', {
                      dataId: 'SIM-KPM-001',
                      diff:
                        cat === 'CRUD & draft'
                          ? { before: 'Draft lama', after: 'Draft diperbarui' }
                          : {},
                    })
                  }
                >
                  <Plus size={12} />
                  {action}
                </button>
              ))}
              <button disabled={role !== roles[0]} className={s.primary} onClick={transaction}>
                Kirim transaksi 3 fase
              </button>
              {scenarios.map((name, i) => (
                <button
                  disabled={role !== roles[0]}
                  key={name}
                  onClick={() =>
                    add(
                      `Skenario ${i + 1}: ${name}`,
                      'Keamanan',
                      i === 4 ? 'SECURITY_ALERT' : 'REJECTED',
                      {
                        dataId: 'SIM-KPM-001',
                        diff: i === 1 ? { before: 750000, after: 450000 } : {},
                        authorization: i === 2 ? 'Simulasi unauthorized' : 'Belum diverifikasi',
                      },
                    )
                  }
                >
                  Uji skenario {i + 1}
                </button>
              ))}
              <button
                disabled={role !== roles[0]}
                onClick={() => add('Hard delete data FINAL ditolak', 'Keamanan', 'REJECTED')}
              >
                Uji hard delete final
              </button>
              <button
                disabled={role !== roles[0]}
                onClick={() =>
                  add('RPC / kuorum terganggu: fail-safe terkunci', 'Keamanan', 'FAILSAFE_LOCKED')
                }
              >
                Uji fail-safe
              </button>
            </div>
          </div>
        </section>
        <div aria-live="polite">{notice}</div>
        <div className={s.metrics}>
          {[
            ['Total entri log', logs.length, 'Sesi sementara'],
            [
              'Audit akses NIK',
              logs.filter((l) => l.category === 'Akses NIK / PII').length,
              'Confidentiality',
            ],
            [
              'Transaksi & IPFS',
              logs.filter((l) => ['Transaksi', 'IPFS'].includes(l.category)).length,
              'Referensi tiga lapisan',
            ],
            [
              'Penolakan & keamanan',
              logs.filter((l) =>
                ['REJECTED', 'REVERTED', 'SECURITY_ALERT', 'FAILSAFE_LOCKED'].includes(l.status),
              ).length,
              'Security & Safety',
            ],
          ].map(([label, value, desc]) => (
            <section className={s.card} key={label}>
              <small>{label}</small>
              <strong className={s.number}>{value}</strong>
              <span className={s.badge}>{desc}</span>
            </section>
          ))}
        </div>
        <section className={s.card}>
          <div className={s.heading}>
            <div>
              <span className={s.eyebrow}>MATRIKS RBAC · PRATINJAU PERAN</span>
              <h2>Hak akses & perlindungan append-only</h2>
            </div>
            <div className={s.actions}>
              {roles.map((r) => (
                <button aria-pressed={role === r} key={r} onClick={() => setRole(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className={s.columns}>
            <article className={s.inset}>
              <b>{role}</b>
              <p>
                {role === roles[0]
                  ? 'Operasional & ekspor audit. Tidak ada aksi edit atau hapus log.'
                  : 'Monitoring read-only & ekspor audit. Kontrol simulator dinonaktifkan.'}
              </p>
              <small>Pemilih ini hanya pratinjau tampilan, bukan login atau otorisasi.</small>
            </article>
            <article className={s.inset}>
              <b>Proteksi koleksi MongoDB · Belum diterapkan</b>
              <p>Target: INSERT oleh sistem; UPDATE dan DELETE ditolak untuk semua peran.</p>
              <button
                onClick={() =>
                  add('Simulasi percobaan edit / hapus log ditolak', 'Keamanan', 'REJECTED')
                }
              >
                Uji penolakan manipulasi log
              </button>
            </article>
          </div>
        </section>
        <AuditPanels logs={logs} select={setCategory} />
        <section className={s.card}>
          <span className={s.eyebrow}>PUSAT JEJAK SESI · TANPA NIK PENUH</span>
          <h2>Daftar rincian log aktivitas & jejak audit</h2>
          <div className={s.filters}>
            <label className={s.search}>
              <Search size={15} />
              <input
                aria-label="Cari log"
                placeholder="Cari pengguna, aksi, Data_ID, CID, TxHash…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {[
              [roleFilter, setRoleFilter, roles, 'Semua peran'],
              [category, setCategory, categories, 'Semua kategori'],
              [
                status,
                setStatus,
                [
                  'SUCCESS',
                  'PENDING',
                  'FAILED',
                  'REVERTED',
                  'REJECTED',
                  'SECURITY_ALERT',
                  'FAILSAFE_LOCKED',
                  'INFO',
                  'VALID',
                  'ANOMALI',
                  'DITOLAK',
                ],
                'Semua status',
              ],
              [
                authorization,
                setAuthorization,
                ['Belum diverifikasi', 'Simulasi authorized', 'Simulasi unauthorized'],
                'Semua wallet',
              ],
            ].map(([value, set, options, label]) => (
              <select
                key={label as string}
                aria-label={label as string}
                value={value as string}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
              >
                <option value="">{label as string}</option>
                {(options as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ))}
            <label>
              Dari (WITA)
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Sampai (WITA)
              <input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button
              onClick={() => {
                setQuery('')
                setRoleFilter('')
                setCategory('')
                setStatus('')
                setAuthorization('')
                setFrom('')
                setTo('')
              }}
            >
              Reset filter
            </button>
          </div>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  {[
                    'ID log & waktu WITA',
                    'Pengguna, peran & IP',
                    'Aktivitas & rincian',
                    'Wallet & otorisasi',
                    'Data_ID · CID · TxHash',
                    'Status',
                    'Payload',
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code>{l.id.slice(0, 18)}</code>
                      <small>{wita(l.time)}</small>
                    </td>
                    <td>
                      <b>{l.user}</b>
                      <small>{l.role}</small>
                      <small>IP: {l.ip}</small>
                    </td>
                    <td>
                      <span className={s.badge}>{l.category}</span>
                      <p>{l.action}</p>
                    </td>
                    <td>
                      <code>{l.wallet}</code>
                      <small>{l.authorization}</small>
                    </td>
                    <td>
                      <code>DB: {l.dataId}</code>
                      <code>CID: {l.cid}</code>
                      <code>Tx: {l.txHash}</code>
                    </td>
                    <td>
                      <span className={s.badge}>{l.status}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelected(l)
                          detail.current?.showModal()
                        }}
                      >
                        Payload JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className={s.empty}>
                <LockKeyhole size={24} />
                <h3>Belum ada log yang sesuai</h3>
                <p>
                  Jalankan simulasi di atas atau aktivitas pada halaman penerima, penyaluran, dan
                  verifikasi.
                </p>
              </div>
            )}
          </div>
          <p>
            {rows.length} dari {logs.length} entri sesi · Tidak ada catatan yang dapat diedit atau
            dihapus dari UI.
          </p>
        </section>
        <dialog ref={detail} className={s.dialog} aria-labelledby="payload-title">
          <div className={s.heading}>
            <h2 id="payload-title">Detail jejak audit & payload JSON</h2>
            <button aria-label="Tutup payload" onClick={() => detail.current?.close()}>
              <X size={18} />
            </button>
          </div>
          <p>
            Metadata simulasi, bukan bukti kriptografis terverifikasi. NIK penuh tidak disertakan.
          </p>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </dialog>
        <dialog
          ref={print}
          className={`${s.dialog} ${s.printDialog}`}
          aria-labelledby="print-title"
        >
          <div className={s.heading}>
            <h2 id="print-title">Pratinjau cetak laporan log aktivitas</h2>
            <div className={s.actions}>
              <button onClick={() => window.print()}>
                <Printer size={15} /> Cetak / simpan PDF
              </button>
              <button onClick={() => print.current?.close()}>Tutup</button>
            </div>
          </div>
          <section className={s.paper}>
            <header>
              <b>PEMERINTAH KABUPATEN BARRU · KECAMATAN BALUSU</b>
              <h2>KANTOR KELURAHAN TAKKALASI — BANSOSLEDGER</h2>
              <p>Laporan simulasi jejak audit · Bukan dokumen audit resmi</p>
            </header>
            <p>
              Cap cetak: {printed} · Jumlah: {rows.length} log · Blok Besu terakhir: belum terhubung
            </p>
            <p>
              Filter: {category || 'Semua kategori'} / {roleFilter || 'Semua peran'} /{' '}
              {status || 'Semua status'} · {from || 'Awal'} — {to || 'Sekarang'}
            </p>
            <table>
              <thead>
                <tr>
                  <th>ID & waktu</th>
                  <th>User & peran</th>
                  <th>Aktivitas</th>
                  <th>Wallet & IP</th>
                  <th>Referensi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.id}
                      <br />
                      {wita(l.time)}
                    </td>
                    <td>
                      {l.user}
                      <br />
                      {l.role}
                    </td>
                    <td>{l.action}</td>
                    <td>
                      {l.wallet}
                      <br />
                      {l.ip}
                    </td>
                    <td>
                      {l.dataId}
                      <br />
                      {l.cid}
                      <br />
                      {l.txHash}
                    </td>
                    <td>{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </dialog>
      </div>
    </Dashboard>
  )
}
