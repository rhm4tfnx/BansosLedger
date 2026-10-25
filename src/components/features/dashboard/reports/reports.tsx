'use client'
import { appendAudit } from '@/stores/audit-store'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  RotateCw,
  Eye,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Users,
  Building2,
  Coins,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ReportCharts } from '@/components/features/dashboard/reports/report-charts'
import {
  recap,
  recipients,
  deposits,
  programs,
  rupiah,
  percent,
  downloadCSV,
  documentHTML,
} from '@/mocks/report-data'
import s from '@/components/features/dashboard/reports/reports.module.css'

function Tag({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={`${s.tag} ${tone === 'green' ? s.green : tone === 'amber' ? s.amber : tone === 'red' ? s.red : ''}`}
    >
      {children}
    </span>
  )
}
function Heading({
  number,
  title,
  description,
  action,
}: {
  number: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className={s.heading}>
      <div>
        <span className={s.eyebrow}>BAGIAN {number}</span>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}
function Deadline() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = now === null ? 0 : new Date('2026-11-02T23:59:59+08:00').getTime() - now
  const seconds = Math.max(0, Math.floor(diff / 1000))
  const late = now !== null && diff < 0
  return (
    <div className={s.inset}>
      <div className={s.spread}>
        <div>
          <small>Tenggat 30 hari kalender</small>
          <h3>02 November 2026, 23:59 WITA</h3>
        </div>
        <Tag tone={late ? 'red' : diff < 7 * 864e5 ? 'amber' : 'green'}>
          {now === null
            ? 'Menghitung…'
            : late
              ? 'Terlambat'
              : diff < 7 * 864e5
                ? 'Mendekati tenggat'
                : 'Tepat waktu'}
        </Tag>
      </div>
      <div className={s.countdown}>
        {[
          Math.floor(seconds / 86400),
          Math.floor(seconds / 3600) % 24,
          Math.floor(seconds / 60) % 60,
          seconds % 60,
        ].map((v, i) => (
          <div key={i}>
            <strong>{now === null ? '—' : String(v).padStart(2, '0')}</strong>
            <small>{['HARI', 'JAM', 'MENIT', 'DETIK'][i]}</small>
          </div>
        ))}
      </div>
      <p>
        Contoh periode: penyaluran berakhir 3 Oktober 2026. Pelaporan paling lambat 30 hari
        kalender, mengacu Pasal 25 & 37.
      </p>
    </div>
  )
}

export function Reports() {
  const [program, setProgram] = useState('Semua')
  const [period, setPeriod] = useState('Semua')
  const [area, setArea] = useState('Semua')
  const [status, setStatus] = useState('Semua')
  const [masked, setMasked] = useState(true)
  const [anomaly, setAnomaly] = useState(false)
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<'deposit' | 'document' | 'proof' | null>(null)
  const [proof, setProof] = useState(recipients[0])
  const [document, setDocument] = useState('')
  const frame = useRef<HTMLIFrameElement>(null)
  const matches = (r: { program: string; period: string; area: string }) =>
    (program === 'Semua' || program === r.program) &&
    (period === 'Semua' || period === r.period) &&
    (area === 'Semua' || area === r.area)
  const rows = recap.filter(matches)
  const details = recipients.filter(
    (r) => matches(r) && (status === 'Semua' || status === r.status),
  )
  const returns = deposits.filter(matches)
  const budget = rows.reduce((t, r) => t + r.budget, 0)
  const realized = rows.reduce((t, r) => t + r.realized, 0)
  const people = rows.reduce((t, r) => t + r.recipients, 0)
  const quota = rows.reduce((t, r) => t + r.quota, 0)
  const returned = returns.reduce((t, r) => t + r.amount, 0)
  const rate = budget ? (realized / budget) * 100 : 0
  const components = [
    ['Rekap pagu anggaran', budget],
    ['Realisasi penyaluran', realized],
    ['Sisa dana', budget - realized],
    ['Setoran kembali kas negara/daerah', returned],
  ] as const
  const recapHeaders = [
    'Program',
    'Periode',
    'RT/RW',
    'Penerima',
    'Pagu',
    'Realisasi',
    'Persentase',
  ]
  const recapRows = rows.map((r) => [
    r.program,
    r.period,
    r.area,
    r.recipients,
    rupiah(r.budget),
    rupiah(r.realized),
    percent((r.realized / r.budget) * 100),
  ])
  const detailHeaders = [
    'Penerima',
    'NIK tersamar',
    'Program',
    'Periode',
    'Wilayah',
    'Nominal',
    'Status',
    'TxHash contoh',
    'CID contoh',
  ]
  const detailRows = details.map((r) => [
    r.name,
    r.nik.slice(0, 6) + '******' + r.nik.slice(-4),
    r.program,
    r.period,
    r.area,
    rupiah(r.amount),
    r.status,
    r.hash,
    r.cid,
  ])
  const exportCSV = (detail = false) => {
    appendAudit({
      action: detail ? 'Ekspor rincian KPM CSV' : 'Ekspor rekap LPJ CSV',
      category: 'LPJ',
      source: 'Halaman LPJ · simulasi',
    })
    downloadCSV(detail ? 'rincian-kpm-contoh' : 'rekap-lpj-contoh', [
      detail ? detailHeaders : recapHeaders,
      ...(detail ? detailRows : recapRows),
    ])
    setNotice(
      'CSV berhasil diunduh dengan metadata WITA dan referensi blok contoh. NIK ekspor selalu disamarkan.',
    )
  }
  const preview = (kind: 'official' | 'recap' | 'detail') => {
    appendAudit({
      action: `Pratinjau dokumen LPJ ${kind}`,
      category: 'LPJ',
      source: 'Halaman LPJ · simulasi',
    })
    setDocument(
      documentHTML(
        kind === 'official'
          ? 'SURAT LAPORAN PERTANGGUNGJAWABAN PENYALURAN BANTUAN SOSIAL'
          : kind === 'detail'
            ? 'RINCIAN PENYALURAN PER KPM'
            : 'REKAP REALISASI PENYALURAN',
        kind === 'official'
          ? ['No', 'Komponen wajib LPJ', 'Nilai / nominal']
          : kind === 'detail'
            ? detailHeaders
            : recapHeaders,
        kind === 'official'
          ? components.map(([name, value], i) => [i + 1, name, rupiah(value)])
          : kind === 'detail'
            ? detailRows
            : recapRows,
        kind === 'official',
      ),
    )
    setModal('document')
  }
  return (
    <>
      <div className={s.page}>
        <header className={s.hero}>
          <div>
            <div className={s.titleIcon}>
              <FileText size={20} />
              <span>LAPORAN & PERTANGGUNGJAWABAN</span>
            </div>
            <h1>Laporan & LPJ</h1>
            <p>Rekap penyaluran yang transparan. Pertanggungjawaban yang terukur.</p>
            <div className={s.actions}>
              <Tag>PMK No. 254/PMK.05/2015</Tag>
              <Tag tone="green">Kelurahan Takkalasi</Tag>
            </div>
          </div>
          <div className={s.actions}>
            <button onClick={() => exportCSV()}>
              <Download size={15} />
              Ekspor CSV
            </button>
            <button onClick={() => preview('recap')}>
              <FileText size={15} />
              Ekspor PDF
            </button>
            <button className={s.primary} onClick={() => preview('official')}>
              <Printer size={15} />
              Cetak surat LPJ
            </button>
          </div>
        </header>
        <div className={s.context}>
          <ShieldCheck size={18} />
          <span>
            <strong>Workspace operator bansos</strong> · Data contoh untuk pratinjau frontend.
            MongoDB, Besu, IPFS, autentikasi dan penyimpanan belum terhubung.
          </span>
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
          <Heading
            number="01 · PELAPORAN BERJENJANG"
            title="Satu laporan, tiga jenjang pertanggungjawaban"
            action={<Tag>Kelurahan → Kecamatan → Dinas</Tag>}
          />
          <div className={s.roles}>
            {[
              {
                icon: Building2,
                name: 'Operator Bansos',
                place: 'Kelurahan Takkalasi',
                note: 'Menyusun LPJ, mencatat setoran, mengekspor dan mencetak laporan.',
                badge: 'Workspace aktif',
              },
              {
                icon: Eye,
                name: 'Kecamatan Balusu',
                place: 'Monitoring',
                note: 'Memantau laporan dan kelengkapan LPJ kelurahan secara read-only.',
                badge: 'Monitoring',
              },
              {
                icon: ShieldCheck,
                name: 'Dinas Sosial Kab. Barru',
                place: 'Verifikasi',
                note: 'Memberikan status verifikasi dan catatan korektif sesuai Pasal 26 ayat 3.',
                badge: 'Verifikator',
              },
            ].map((r, i) => (
              <div className={i === 0 ? s.activeRole : s.role} key={r.name}>
                <div className={s.spread}>
                  <span className={s.icon}>
                    <r.icon size={20} />
                  </span>
                  <Tag tone={i === 0 ? 'green' : ''}>{r.badge}</Tag>
                </div>
                <h3>{r.name}</h3>
                <small>{r.place}</small>
                <p>{r.note}</p>
              </div>
            ))}
          </div>
        </section>
        <section className={s.card}>
          <Heading
            number="02 · REKAP OPERASIONAL"
            title="Realisasi penyaluran bantuan"
            description="Pantau penerima, penyerapan pagu, dan realisasi berdasarkan cakupan laporan."
          />
          <div className={s.filters}>
            {[
              ['Program bansos', program, setProgram, programs],
              ['Periode penyaluran', period, setPeriod, [...new Set(recap.map((r) => r.period))]],
              ['Wilayah RT / RW', area, setArea, [...new Set(recap.map((r) => r.area))]],
            ].map(([label, value, setter, options]) => (
              <label key={label as string}>
                {label as string}
                <select
                  value={value as string}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                >
                  <option value="Semua">
                    Semua{' '}
                    {label === 'Program bansos'
                      ? 'program'
                      : label === 'Periode penyaluran'
                        ? 'periode (2026)'
                        : 'wilayah RT/RW'}
                  </option>
                  {(options as string[]).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ))}
            <button
              onClick={() => {
                setProgram('Semua')
                setPeriod('Semua')
                setArea('Semua')
                setStatus('Semua')
              }}
            >
              <RotateCw size={14} />
              Reset filter
            </button>
          </div>
          <div className={s.stats}>
            {[
              {
                icon: Users,
                label: 'Jumlah penerima',
                value: `${people} KPM`,
                note: `Dari target kuota ${quota} KPM`,
              },
              {
                icon: Wallet,
                label: 'Total pagu anggaran',
                value: rupiah(budget),
                note: 'Alokasi DIPA / APBD',
              },
              {
                icon: Coins,
                label: 'Dana tersalurkan',
                value: rupiah(realized),
                note: 'Rekap nominal berstatus SUCCESS',
              },
              {
                icon: ArrowUpRight,
                label: 'Persentase realisasi',
                value: percent(rate),
                note: `Sisa ${percent(budget ? 100 - rate : 0)} dari pagu`,
              },
            ].map((r, i) => (
              <div className={s.stat} key={r.label}>
                <div className={s.spread}>
                  <span>{r.label}</span>
                  <r.icon size={17} />
                </div>
                <strong className={i === 2 ? s.blueText : i === 3 ? s.greenText : ''}>
                  {r.value}
                </strong>
                {i === 3 && <progress max={100} value={rate} aria-label="Persentase realisasi" />}
                <small>{r.note}</small>
              </div>
            ))}
          </div>
          <ReportCharts rows={rows} />
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  {recapHeaders.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <Tag>{r.program}</Tag>
                    </td>
                    <td>{r.period}</td>
                    <td className={s.mono}>{r.area}</td>
                    <td>
                      <strong>{r.recipients} KPM</strong>
                      <small>Kuota: {r.quota} KPM</small>
                    </td>
                    <td className={s.money}>{rupiah(r.budget)}</td>
                    <td className={s.money}>{rupiah(r.realized)}</td>
                    <td>
                      <div className={s.progressCell}>
                        <progress
                          max={r.budget}
                          value={r.realized}
                          aria-label={`Realisasi ${r.program}`}
                        />
                        <span>{percent((r.realized / r.budget) * 100)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className={s.empty}>Tidak ada rekap untuk kombinasi filter ini.</p>}
          </div>
        </section>
        <div className={s.twoColumns}>
          <section className={s.card}>
            <Heading
              number="03 · KOMPONEN WAJIB LPJ"
              title="Ringkasan pertanggungjawaban"
              description="PMK 254/PMK.05/2015 · Pasal 32 ayat 2"
              action={
                <button className={s.primary} onClick={() => setModal('deposit')}>
                  <Plus size={15} />
                  Catat setoran
                </button>
              }
            />
            <div className={s.scope}>
              Cakupan:{' '}
              <strong>
                {program === 'Semua' ? 'Semua program' : program} ·{' '}
                {period === 'Semua' ? 'Semua periode' : period} ·{' '}
                {area === 'Semua' ? 'Semua RT/RW' : area}
              </strong>
            </div>
            <div className={s.components}>
              {components.map(([name, value], i) => (
                <div className={s.inset} key={name}>
                  <small>
                    {i + 1}. {name}
                  </small>
                  <strong className={s.amount}>{rupiah(value)}</strong>
                  <p>
                    {
                      [
                        'Pagu per program dan periode',
                        'Nominal SUCCESS pada data contoh',
                        'Wajib disetor atau dijelaskan',
                        `${returns.length} bukti STS/NTPN · Sisa kas ${rupiah(budget - realized - returned)}`,
                      ][i]
                    }
                  </p>
                </div>
              ))}
            </div>
            <h3 className={s.subheading}>
              Daftar setoran kembali <Tag>{returns.length} bukti</Tag>
            </h3>
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Nomor STS / NTPN</th>
                    <th>Program</th>
                    <th>Nominal</th>
                    <th>Bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r.sts}>
                      <td className={s.mono}>
                        {r.sts}
                        <small>{r.ntpn}</small>
                      </td>
                      <td>
                        <Tag>{r.program}</Tag>
                      </td>
                      <td className={s.money}>{rupiah(r.amount)}</td>
                      <td>
                        <Tag tone="amber">Contoh · belum on-chain</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!returns.length && <p className={s.empty}>Belum ada setoran dalam cakupan ini.</p>}
            </div>
          </section>
          <section className={s.card}>
            <Heading
              number="05 · SLA & VERIFIKASI"
              title="Tenggat & alur verifikasi"
              description="Pelaporan 30 hari dan catatan korektif berjenjang."
            />
            <Deadline />
            <h3 className={s.subheading}>
              Riwayat verifikasi <Tag tone="amber">Contoh alur</Tag>
            </h3>
            <ol className={s.timeline}>
              {[
                {
                  title: 'Operator Bansos · Kelurahan Takkalasi',
                  date: '20 Okt 2026 · 14:20 WITA',
                  text: 'LPJ dan 2 bukti STS/NTPN telah disusun untuk pemeriksaan.',
                  icon: CheckCircle2,
                },
                {
                  title: 'Kecamatan Balusu · Monitoring',
                  date: '21 Okt 2026 · 09:15 WITA',
                  text: 'Lampiran RT/RW diperiksa. Diteruskan kepada Dinas Sosial Kab. Barru.',
                  icon: Eye,
                },
                {
                  title: 'Dinas Sosial Kab. Barru · Verifikasi',
                  date: '21 Okt 2026 · 16:40 WITA',
                  text: 'Catatan korektif: lengkapi STS pelunasan sisa kas sebesar Rp 13.500.000 sebelum tenggat.',
                  icon: AlertTriangle,
                },
              ].map((r) => (
                <li key={r.title}>
                  <r.icon size={20} />
                  <div>
                    <h3>{r.title}</h3>
                    <small>{r.date}</small>
                    <p>{r.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className={s.disabledPanel}>
              <h3>Panel verifikasi & catatan korektif</h3>
              <p>
                Hanya Dinas Sosial yang dapat mengubah hasil verifikasi. Workspace operator bersifat
                read-only untuk bagian ini.
              </p>
              <select disabled aria-label="Status verifikasi">
                <option>Perlu koreksi / catatan korektif</option>
              </select>
              <textarea
                disabled
                aria-label="Catatan korektif"
                placeholder="Catatan verifikator Dinas Sosial"
              />
              <button disabled>Simpan status verifikasi</button>
            </div>
          </section>
        </div>
        <section className={s.card} id="rekonsiliasi">
          <Heading
            number="04 · AUDIT KRIPTOGRAFIS"
            title="Rekonsiliasi off-chain & on-chain"
            description="Perbandingan koleksi MongoDB dengan state Smart Contract Hyperledger Besu QBFT."
            action={
              <div className={s.actions}>
                <button
                  onClick={() => {
                    setAnomaly(false)
                    setNotice(
                      'Perbandingan data contoh direset. Ini bukan verifikasi jaringan Besu.',
                    )
                  }}
                >
                  <RotateCw size={15} />
                  Verifikasi ulang contoh
                </button>
                <button
                  className={s.danger}
                  onClick={() => {
                    setAnomaly(true)
                    appendAudit({
                      action: 'Skenario 5: Manipulasi riwayat LPJ',
                      category: 'Keamanan',
                      status: 'SECURITY_ALERT',
                      diff: { before: 6700000, after: 6800000 },
                    })
                  }}
                >
                  <AlertTriangle size={15} />
                  Uji skenario 5
                </button>
              </div>
            }
          />
          <div className={s.auditGrid}>
            <div className={s.inset}>
              <h3>Database off-chain</h3>
              <small>MongoDB · tx_penyaluran · contoh</small>
              <dl>
                <div>
                  <dt>Record tersimpan</dt>
                  <dd>8 baris KPM</dd>
                </div>
                <div>
                  <dt>Total nominal</dt>
                  <dd>{rupiah(anomaly ? 6800000 : 6700000)}</dd>
                </div>
                <div>
                  <dt>Digest koleksi</dt>
                  <dd>{anomaly ? 'hash-contoh-berubah' : 'hash-contoh-sama'}</dd>
                </div>
              </dl>
            </div>
            <div className={s.inset}>
              <h3>Ledger on-chain</h3>
              <small>Hyperledger Besu QBFT · contoh</small>
              <dl>
                <div>
                  <dt>Event smart contract</dt>
                  <dd>8 baris KPM</dd>
                </div>
                <div>
                  <dt>Total nominal</dt>
                  <dd>{rupiah(6700000)}</dd>
                </div>
                <div>
                  <dt>Referensi blok</dt>
                  <dd>#4892104 (contoh)</dd>
                </div>
              </dl>
            </div>
            <div className={`${s.inset} ${anomaly ? s.auditError : s.auditSuccess}`}>
              <Tag tone={anomaly ? 'red' : 'green'}>
                {anomaly ? '7 / 8 transaksi cocok' : '8 / 8 transaksi cocok'}
              </Tag>
              <h3>{anomaly ? '1 anomali terdeteksi' : 'Data contoh konsisten'}</h3>
              <p>
                {anomaly
                  ? 'Nominal baris St. Aminah Masse berubah +Rp 100.000 pada salinan off-chain. Perbedaan ditandai di rincian KPM.'
                  : 'Nilai salinan contoh identik. Belum ada pemeriksaan hash kriptografis atau koneksi blockchain nyata.'}
              </p>
            </div>
          </div>
        </section>
        <section className={s.card}>
          <Heading
            number="06 · KETERLACAKAN & BUKTI"
            title="Rincian penerima & bukti realisasi"
            description="Sampel 8 KPM, bukan keseluruhan populasi rekap. Identitas contoh dan hash ilustratif."
            action={
              <div className={s.actions}>
                <select
                  aria-label="Filter status transaksi"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {['Semua', 'SUCCESS', 'PENDING', 'FAILED'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
                <button
                  aria-pressed={masked}
                  onClick={() => {
                    if (masked)
                      details.forEach((r) =>
                        appendAudit({
                          action: 'Buka NIK contoh pada rincian LPJ',
                          category: 'Akses NIK / PII',
                          dataId: r.name,
                          source: 'Halaman LPJ · simulasi',
                        }),
                      )
                    setMasked(!masked)
                  }}
                >
                  <Eye size={15} />
                  Masking NIK: {masked ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            }
          />
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  {[
                    'Penerima',
                    'Program & nominal',
                    'TxHash contoh',
                    'Bukti IPFS',
                    'Rekonsiliasi',
                    'Status',
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {details.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <small>{r.area}</small>
                      <small className={s.mono}>
                        NIK: {masked ? r.nik.slice(0, 6) + '******' + r.nik.slice(-4) : r.nik}
                      </small>
                    </td>
                    <td>
                      <Tag>{r.program}</Tag>
                      <small>{r.period}</small>
                      <strong className={s.money}>{rupiah(r.amount)}</strong>
                    </td>
                    <td>
                      <div className={s.actions}>
                        <Link href={`/explorer/tx/${r.hash}`} className={s.hash}>
                          {r.hash.slice(0, 10)}…{r.hash.slice(-6)}
                          <ArrowUpRight size={12} />
                        </Link>
                        <button
                          aria-label={`Salin hash ${r.name}`}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(r.hash)
                              setNotice('Hash contoh berhasil disalin.')
                            } catch {
                              setNotice(
                                'Clipboard tidak tersedia. Silakan salin hash dari tautan transaksi.',
                              )
                            }
                          }}
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                      <small>Referensi blok #{r.block}</small>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setProof(r)
                          setModal('proof')
                        }}
                      >
                        <Eye size={14} />
                        Lihat bukti
                      </button>
                    </td>
                    <td>
                      <Tag tone={anomaly && r.id === 1 ? 'red' : 'green'}>
                        {anomaly && r.id === 1 ? 'Nominal berbeda' : 'Cocok (contoh)'}
                      </Tag>
                    </td>
                    <td>
                      <Tag
                        tone={
                          r.status === 'SUCCESS' ? 'green' : r.status === 'FAILED' ? 'red' : 'amber'
                        }
                      >
                        {r.status}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!details.length && <p className={s.empty}>Tidak ada KPM yang sesuai filter.</p>}
          </div>
          <div className={s.tableFooter}>
            <span>Menampilkan {details.length} dari 8 sampel KPM</span>
            <span>Ekspor NIK selalu disamarkan</span>
          </div>
        </section>
        <div className={s.bottomGrid}>
          <section className={s.card}>
            <Heading
              number="07 · DOKUMEN & METADATA"
              title="Ekspor & cetak LPJ"
              description="Setiap dokumen menyertakan cap waktu WITA dan referensi blok contoh saat dibuat."
            />
            <div className={s.inset}>
              <div className={s.spread}>
                <h3>Metadata integritas</h3>
                <Tag>Tersisip otomatis</Tag>
              </div>
              <dl>
                <div>
                  <dt>Cap waktu</dt>
                  <dd>Saat ekspor (WITA)</dd>
                </div>
                <div>
                  <dt>Blok Besu terakhir</dt>
                  <dd>#4892104 · contoh</dd>
                </div>
                <div>
                  <dt>Otoritas dokumen</dt>
                  <dd>Kelurahan Takkalasi</dd>
                </div>
                <div>
                  <dt>Status dokumen</dt>
                  <dd>Contoh / belum terverifikasi</dd>
                </div>
              </dl>
            </div>
            <div className={s.exportGrid}>
              <button onClick={() => exportCSV()}>
                <Download size={15} />
                CSV rekap realisasi
              </button>
              <button onClick={() => exportCSV(true)}>
                <Download size={15} />
                CSV rincian KPM
              </button>
              <button onClick={() => preview('recap')}>PDF rekap</button>
              <button onClick={() => preview('detail')}>PDF rincian KPM</button>
              <button className={s.primary} onClick={() => preview('official')}>
                <Printer size={15} />
                Cetak surat LPJ resmi
              </button>
            </div>
            <p className={s.footnote}>
              PDF menggunakan dialog cetak browser → Simpan sebagai PDF. Nama pejabat dan tanda
              tangan harus dilengkapi setelah verifikasi resmi.
            </p>
          </section>
          <section className={s.card}>
            <Heading
              number="08 · PEMETAAN KEAMANAN"
              title="Kontrol keamanan & pengujian"
              description="Pemetaan kebutuhan, bukan sertifikasi ISO/IEC 27001 atau klaim kepatuhan hukum."
            />
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Aspek</th>
                    <th>Penerapan</th>
                    <th>Kesiapan</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      'Integrity',
                      'Rekonsiliasi MongoDB / Besu dan referensi blok pada dokumen.',
                      'UI tersedia',
                    ],
                    [
                      'Non-repudiation',
                      'TxHash dan CID bukti pada KPM serta STS/NTPN.',
                      'Backend diperlukan',
                    ],
                    [
                      'Accountability',
                      'Pelaporan tiga jenjang dan riwayat catatan korektif.',
                      'RBAC diperlukan',
                    ],
                    [
                      'Skenario 5',
                      'Perubahan nominal off-chain ditandai pada ringkasan dan transaksi.',
                      'Simulasi lokal',
                    ],
                  ].map(([name, text, state]) => (
                    <tr key={name}>
                      <td>
                        <strong>{name}</strong>
                      </td>
                      <td>{text}</td>
                      <td>
                        <Tag>{state}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => {
                setAnomaly(true)
                window.document
                  .getElementById('rekonsiliasi')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Jalankan skenario 5 <ArrowUpRight size={14} />
            </button>
          </section>
        </div>
        <Dialog
          open={modal !== null}
          onOpenChange={(open) => {
            if (!open) setModal(null)
          }}
        >
          <DialogContent
            className={
              modal === 'document' ? 'sm:max-w-5xl max-h-[90vh] overflow-y-auto' : 'sm:max-w-lg'
            }
          >
            <DialogHeader>
              <DialogTitle>
                {modal === 'deposit'
                  ? 'Catat setoran kembali'
                  : modal === 'proof'
                    ? 'Pratinjau bukti penyerahan'
                    : 'Pratinjau dokumen LPJ'}
              </DialogTitle>
              <DialogDescription>
                {modal === 'deposit'
                  ? 'Komponen 4 LPJ · Nomor STS/NTPN · Pasal 32 ayat 2'
                  : 'Dokumen contoh — bukan bukti terverifikasi on-chain.'}
              </DialogDescription>
            </DialogHeader>
            {modal === 'deposit' && (
              <form
                className={s.form}
                onSubmit={(e) => {
                  e.preventDefault()
                  const form = new FormData(e.currentTarget)
                  appendAudit({
                    action: 'Validasi format setoran kembali; belum disimpan',
                    category: 'LPJ',
                    status: 'INFO',
                    dataId: String(form.get('sts')),
                    diff: { sts: form.get('sts'), ntpn: form.get('ntpn') },
                    source: 'Halaman LPJ · simulasi',
                  })
                  setNotice(
                    'Format setoran valid. Penyimpanan dan anchor Besu belum tersedia; data tidak disimpan.',
                  )
                  setModal(null)
                }}
              >
                <label>
                  Nomor STS
                  <input required name="sts" maxLength={80} placeholder="STS-7311/BLT/X/2026/003" />
                </label>
                <label>
                  Nomor NTPN
                  <input
                    required
                    name="ntpn"
                    pattern="[A-Za-z0-9]{16}"
                    title="NTPN terdiri dari 16 karakter alfanumerik"
                    maxLength={16}
                    placeholder="9841205573110924"
                  />
                </label>
                <label>
                  Program bansos
                  <select name="program">
                    {programs.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nominal setoran (Rp)
                  <input
                    name="amount"
                    type="number"
                    min={1}
                    max={65500000}
                    step={1}
                    required
                    placeholder="13500000"
                  />
                </label>
                <p>
                  Pencatatan permanen dan anchor ke Besu belum terhubung. Formulir ini hanya
                  memvalidasi isian.
                </p>
                <button type="submit">Validasi setoran</button>
                <button type="button" disabled>
                  Simpan & anchor ke Besu — belum terhubung
                </button>
              </form>
            )}
            {modal === 'proof' && (
              <div className={s.form}>
                <h3>{proof.name}</h3>
                <p>
                  {proof.program} · {proof.period} · {rupiah(proof.amount)}
                </p>
                <div className={s.proof}>
                  <FileText size={40} />
                  <strong>Berkas IPFS belum tersedia</strong>
                  <p>{proof.cid}</p>
                  <p>
                    Tidak ada dokumen yang diunggah pada data contoh ini. Pratinjau berkas asli
                    memerlukan koneksi IPFS.
                  </p>
                </div>
                <small>Referensi blok contoh #{proof.block}</small>
              </div>
            )}
            {modal === 'document' && (
              <>
                <div className={s.actions}>
                  <button
                    className={s.printButton}
                    onClick={() => {
                      frame.current?.contentWindow?.focus()
                      appendAudit({
                        action: 'Permintaan cetak LPJ / PDF',
                        category: 'LPJ',
                        source: 'Halaman LPJ · simulasi',
                      })
                      frame.current?.contentWindow?.print()
                    }}
                  >
                    <Printer size={15} />
                    Cetak / simpan PDF
                  </button>
                  <button onClick={() => setModal(null)}>Tutup</button>
                </div>
                <iframe
                  ref={frame}
                  title="Dokumen laporan LPJ"
                  srcDoc={document}
                  className={s.document}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
