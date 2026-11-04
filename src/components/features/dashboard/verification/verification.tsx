'use client'
import { useRef, useState } from 'react'
import { formatPeriod } from '@/lib/utils'
import {
  Search,
  ShieldCheck,
  RotateCw,
  X,
  FileCheck2,
  FlaskConical,
  ArrowUpRight,
} from 'lucide-react'
import { VerificationSecurity } from '@/components/features/dashboard/verification/verification-security'
import { testRecords, money, statusOf, type VerificationRecord } from '@/mocks/verification-data'
import s from '@/components/features/dashboard/verification/verification.module.css'
import { appendAudit } from '@/stores/audit-store'
export function Verification() {
  const [records, setRecords] = useState<VerificationRecord[]>([])
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState('Semua')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<VerificationRecord | null>(null)
  const [notice, setNotice] = useState('')
  const detailDialog = useRef<HTMLDialogElement>(null)
  const demo = records.length > 0
  function log(action: string, status = 'INFO', id = '—') {
    appendAudit({
      action,
      status,
      dataId: id,
      category: 'Rekonsiliasi',
      source: 'Halaman verifikasi · simulasi',
    })
  }
  function simulate(index: number, issue: VerificationRecord['issue']) {
    setRecords((prev) => prev.map((r, i) => (i === index ? { ...r, issue } : r)))
    log(`Simulasi ${issue}: ketidaksesuaian terdeteksi`, 'ANOMALI', testRecords[index].id)
    setNotice('Skenario diterapkan pada data uji, bukan database atau blockchain.')
  }
  function inspect(record: VerificationRecord) {
    setSelected(record)
    detailDialog.current?.showModal()
    log('Inspeksi perbandingan tujuh atribut', 'INFO', record.id)
  }
  const valid = records.filter((r) => !r.issue).length
  const missing = records.filter((r) => r.issue === 'hilang').length
  const mismatch = records.length - valid - missing
  const rows = records.filter(
    (r) =>
      (filter === 'Semua' || statusOf(r) === filter) &&
      `${r.id} ${r.name} ${r.program} ${r.hash} ${r.cid}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  return (
    <>
      <div className={s.page}>
        <div className={s.breadcrumb}>
          Dashboard <span>/</span> Verifikasi integritas
        </div>
        <header className={s.hero}>
          <div>
            <span className={s.eyebrow}>
              <ShieldCheck size={15} /> INTEGRITAS & REKONSILIASI
            </span>
            <h1>Verifikasi integritas dua arah</h1>
            <p>Riwayat transaksi MongoDB ↔ Hyperledger Besu & keaslian bukti IPFS.</p>
          </div>
        </header>
        <div className={s.toolbar}>
          <label className={s.search}>
            <Search size={17} />
            <input
              aria-label="Cari transaksi"
              placeholder="Cari Data_ID, nama, program, hash, atau CID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className={s.badge}>Wallet belum terhubung</span>
          <button
            className={s.primary}
            onClick={() => {
              if (!demo) {
                setRecords(testRecords)
                log('Data uji dimuat')
                setNotice('Mode simulasi aktif. Data akan direset saat halaman dimuat ulang.')
              } else {
                log('Rekonsiliasi data uji selesai', mismatch || missing ? 'ANOMALI' : 'VALID')
                setNotice(
                  `Hasil simulasi: ${valid} cocok, ${mismatch} tidak cocok, ${missing} hilang.`,
                )
              }
            }}
          >
            <RotateCw size={15} />
            {demo ? 'Rekonsiliasi ulang' : 'Aktifkan data uji'}
          </button>
        </div>
        <aside className={s.disclaimer}>
          <FlaskConical size={18} />
          <div>
            <strong>
              {demo ? 'Mode simulasi · Bukan bukti audit produksi' : 'Sumber data belum terhubung'}
            </strong>
            <p>
              MongoDB, Besu, Pinata/IPFS, dan autentikasi belum terhubung. Tidak ada pemeriksaan
              jaringan atau perubahan data produksi. NIK asli tidak ditampilkan.
            </p>
          </div>
        </aside>
        <nav className={s.tabs} aria-label="Bagian verifikasi">
          {[
            'Tabel rekonsiliasi (7 atribut)',
            'Verifikasi CID & gateway IPFS',
            'Bukti skenario & ISO 25010',
          ].map((text, i) => (
            <button key={text} aria-pressed={tab === i} onClick={() => setTab(i)}>
              <span>0{i + 1}</span>
              {text}
            </button>
          ))}
        </nav>
        <div className={s.columns}>
          <section className={s.card}>
            <div className={s.heading}>
              <div>
                <span className={s.eyebrow}>OFF-CHAIN ↔ ON-CHAIN</span>
                <h2>Status rekonsiliasi dua arah</h2>
              </div>
              <span className={s.badge}>{demo ? 'Data uji' : 'Belum tersambung'}</span>
            </div>
            <p>Komitmen identitas dan kesesuaian atribut transaksional.</p>
            <div className={s.stats}>
              {[
                ['Cocok (Valid / Otentik)', valid, 'Transaksi utuh', 'good'],
                ['Tidak cocok (Manipulasi)', mismatch, 'Indikasi perbedaan', 'bad'],
                ['Off-chain hilang / terhapus', missing, 'Dokumen tidak ditemukan', 'warn'],
                ['Ketersediaan CID di IPFS', '—', 'Belum diperiksa melalui gateway', 'neutral'],
              ].map(([title, count, description, tone]) => (
                <article key={title} className={`${s.stat} ${s[tone]}`}>
                  <strong>{title}</strong>
                  <div className={s.number}>
                    {demo || tone === 'neutral' ? count : '—'}
                    <FileCheck2 size={21} />
                  </div>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>
          <section className={s.card}>
            <div className={s.heading}>
              <span className={s.eyebrow}>LABORATORIUM · SKENARIO 5</span>
              <button
                disabled={!demo}
                onClick={() => {
                  setRecords(testRecords)
                  log('Seluruh skenario direset', 'VALID')
                  setNotice('Data uji dipulihkan. Ini bukan pemulihan dokumen MongoDB.')
                }}
              >
                Reset simulasi
              </button>
            </div>
            <h2>Ubah atau hapus riwayat transaksi</h2>
            <p>
              Simulasikan perubahan off-chain untuk melihat perbedaannya terhadap referensi data
              uji.
            </p>
            <div className={s.stats}>
              {[
                ['Ubah nominal', 'PKH: Rp750.000 → Rp450.000', 1, 'nominal'],
                ['Ubah NIK / nama', 'Komitmen identitas berbeda', 2, 'identitas'],
                ['Tukar berkas / CID IPFS', 'CID tidak sesuai referensi', 3, 'cid'],
                ['Hapus dokumen off-chain', 'Transaksi masih ada pada referensi', 0, 'hilang'],
              ].map(([title, text, index, issue]) => (
                <button
                  className={s.scenario}
                  key={title}
                  disabled={!demo}
                  onClick={() => simulate(Number(index), issue as VerificationRecord['issue'])}
                >
                  <strong>{title}</strong>
                  <small>{text}</small>
                  <code>PEN-2026-00{Number(index) + 1}</code>
                </button>
              ))}
            </div>
            <p className={s.formula}>
              Target komitmen:{' '}
              <code>{'recipientHash = HMAC-SHA256(kunci server, "bansos:recipient:v1|" + nik); duplicationKey = keccak256(abi.encode(recipientHash, programId, periodId))'}</code><p>Kunci rahasia hanya disimpan server. Nama, wilayah, nominal, dan CID tidak dimasukkan dalam hash.</p>
            </p>
            <small>Hash pada simulator merupakan label uji, bukan hasil kalkulasi keccak256.</small>
          </section>
        </div>
        {notice && (
          <p role="status" className={s.notice}>
            {notice}
          </p>
        )}
        {tab === 0 && (
          <section className={s.card}>
            <div className={s.heading}>
              <div className={s.filters}>
                {['Semua', 'Cocok (Valid)', 'Tidak cocok', 'Off-chain hilang'].map((f) => (
                  <button aria-pressed={filter === f} key={f} onClick={() => setFilter(f)}>
                    {f} (
                    {f === 'Semua'
                      ? records.length
                      : records.filter((r) => statusOf(r) === f).length}
                    )
                  </button>
                ))}
              </div>
              <small>Inspeksi tujuh atribut untuk melihat perbandingan.</small>
            </div>
            <div className={s.scroll}>
              <table className={s.transactions}>
                <thead>
                  <tr>
                    {[
                      'Bukti kriptografis & blok',
                      'Hash penerima',
                      'Atribut transaksional',
                      'Keaslian CID IPFS',
                      'Status integritas',
                      'Aksi verifikasi',
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.id}</strong>
                        <span className={s.badge}>Blok #{r.block} · uji</span>
                        <code>TxHash: belum diverifikasi</code>
                        <small>21 Okt 2026 · 09:14 WITA · contoh</small>
                      </td>
                      <td>
                        <strong>{r.name}</strong>
                        <small>NIK: ****************</small>
                        <code className={r.issue === 'identitas' ? s.error : ''}>
                          {r.issue === 'identitas' ? 'HASH-DIUBAH' : r.hash}
                        </code>
                        <small>Referensi: {r.hash}</small>
                        <button
                          onClick={() => {
                            log(
                              'Pembukaan PII ditolak: autentikasi belum tersedia',
                              'DITOLAK',
                              r.id,
                            )
                            setNotice(
                              'NIK tidak dibuka. Diperlukan otorisasi server dan audit permanen.',
                            )
                          }}
                        >
                          Buka NIK
                        </button>
                      </td>
                      <td>
                        <span className={s.badge}>{r.program}</span>
                        <p>{formatPeriod(202601)}</p>
                        <code>
                          Off-chain:{' '}
                          {r.issue === 'hilang'
                            ? 'Tidak ditemukan'
                            : money(r.issue === 'nominal' ? 450000 : r.amount)}
                        </code>
                        <code>Referensi: {money(r.amount)}</code>
                      </td>
                      <td>
                        <span className={s.badge}>
                          {r.issue === 'cid' ? 'CID berbeda' : 'CID uji identik'}
                        </span>
                        <code>{r.issue === 'cid' ? 'CID-DIUBAH' : r.cid}</code>
                        <small>Gateway belum diperiksa</small>
                      </td>
                      <td>
                        <span className={`${s.status} ${r.issue ? s.error : s.success}`}>
                          {statusOf(r)}
                        </span>
                        <p>{r.issue ? 'Perlu pemeriksaan' : '7/7 atribut uji sesuai'}</p>
                      </td>
                      <td>
                        <button onClick={() => inspect(r)}>
                          <ShieldCheck size={14} /> Inspeksi 7 atribut <ArrowUpRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <div className={s.empty}>
                  <ShieldCheck size={30} />
                  <h3>
                    {demo
                      ? 'Tidak ada transaksi sesuai filter'
                      : 'Belum ada transaksi untuk diverifikasi'}
                  </h3>
                  <p>
                    {demo
                      ? 'Coba kata kunci atau status lainnya.'
                      : 'Hubungkan sumber data atau aktifkan data uji untuk menjelajahi skenario.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
        {tab === 1 && (
          <section className={s.card}>
            <div className={s.heading}>
              <div>
                <span className={s.eyebrow}>VERIFIKASI INTEGRITAS · IPFS</span>
                <h2>Keaslian CID & ketersediaan berkas</h2>
                <p>Kesamaan CID tidak membuktikan ketersediaan berkas fisik.</p>
              </div>
              <button
                onClick={() => {
                  setNotice(
                    'Pemeriksaan gateway belum tersedia. Hubungkan Pinata/IPFS terlebih dahulu.',
                  )
                  log('Pemeriksaan gateway tidak dijalankan: belum terhubung', 'DITOLAK')
                }}
              >
                Cek semua CID
              </button>
            </div>
            <div className={s.cidGrid}>
              {rows.map((r) => (
                <article className={s.inset} key={r.id}>
                  <div className={s.heading}>
                    <strong>
                      {r.id} · #{r.block}
                    </strong>
                    <span className={s.badge}>
                      {r.issue === 'cid' ? 'Berbeda' : 'CID uji identik'}
                    </span>
                  </div>
                  <p>
                    BA_Penyaluran_{r.program}_{r.id}.pdf · contoh
                  </p>
                  <div className={s.codeBox}>
                    <code>
                      Off-chain:{' '}
                      {r.issue === 'hilang' ? 'Hilang' : r.issue === 'cid' ? 'CID-DIUBAH' : r.cid}
                    </code>
                    <code>Referensi: {r.cid}</code>
                  </div>
                  <div className={s.heading}>
                    <small>Gateway: belum diperiksa</small>
                    <button onClick={() => inspect(r)}>Pratinjau & verifikasi</button>
                  </div>
                </article>
              ))}
            </div>
            {!rows.length && (
              <p className={s.empty}>
                Belum ada CID. Aktifkan data uji atau hubungkan sumber data.
              </p>
            )}
          </section>
        )}
        {tab === 2 && <VerificationSecurity />}
        <footer className={s.footer}>
          BansosLedger · Verifikasi integritas <span>Privasi terlindungi · NIK dimasking</span>
        </footer>
        <dialog className={s.dialog} ref={detailDialog} aria-labelledby="inspection-title">
          <div className={s.heading}>
            <div>
              <span className={s.eyebrow}>BUKTI PERBANDINGAN · SIMULASI</span>
              <h2 id="inspection-title">Inspeksi 7 atribut & hash</h2>
            </div>
            <button aria-label="Tutup inspeksi" onClick={() => detailDialog.current?.close()}>
              <X size={18} />
            </button>
          </div>
          <p>{selected?.id} · Perbandingan ini tidak melakukan pembacaan smart contract.</p>
          {selected && (
            <div className={s.scroll}>
              <table>
                <thead>
                  <tr>
                    <th>Atribut</th>
                    <th>Off-chain (uji)</th>
                    <th>Referensi (uji)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Data_ID', selected.id, selected.id],
                    [
                      'Hash penerima',
                      selected.issue === 'identitas' ? 'HASH-DIUBAH' : selected.hash,
                      selected.hash,
                    ],
                    ['Program', selected.program, selected.program],
                    [
                      'Nominal',
                      money(selected.issue === 'nominal' ? 450000 : selected.amount),
                      money(selected.amount),
                    ],
                    ['Periode', formatPeriod(202601), formatPeriod(202601)],
                    ['Wallet signer', 'SIGNER-CONTOH', 'SIGNER-CONTOH'],
                    ['CID', selected.issue === 'cid' ? 'CID-DIUBAH' : selected.cid, selected.cid],
                  ].map(([label, a, b]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td className={a !== b || selected.issue === 'hilang' ? s.error : ''}>
                        {selected.issue === 'hilang' ? 'Tidak ditemukan' : a}
                      </td>
                      <td>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            TxHash, previous block hash, signer, dan berkas asli belum diverifikasi. Pemulihan PII
            tidak dapat dilakukan hanya dari hash on-chain.
          </p>
        </dialog>
      </div>
    </>
  )
}
