import { Blocks, FileCheck2, FolderOpen, ShieldCheck, Users, Wallet } from 'lucide-react'

const programs = [
  { name: 'BLT-K (Bantuan Tunai)', progress: 85 },
  { name: 'PKH (Keluarga Harapan)', progress: 92 },
  { name: 'Sembako / BPNT', progress: 70 },
  { name: 'Bantuan Lansia', progress: 100 },
  { name: 'Bantuan Disabilitas', progress: 60 },
]

const transactions = [
  {
    time: '14:20:05',
    hash: '0x7a3f…b91c',
    program: 'BLT-K Kelurahan',
    amount: 'Rp600.000',
    evidence: 'DOC-001',
  },
  {
    time: '12:15:30',
    hash: '0x4c21…e582',
    program: 'PKH Tahap II',
    amount: 'Rp750.000',
    evidence: 'DOC-002',
  },
  {
    time: '09:45:12',
    hash: '0xd811…f221',
    program: 'Sembako / BPNT',
    amount: 'Rp200.000',
    evidence: 'DOC-003',
  },
  {
    time: '08:02:44',
    hash: '0x12f9…a311',
    program: 'Bantuan Lansia',
    amount: 'Rp300.000',
    evidence: 'DOC-004',
  },
]

const network = [
  ['Jaringan', 'Besu · privat'],
  ['Konsensus', 'QBFT'],
  ['Blok terakhir', '#84.129'],
  ['Sinkronisasi terakhir', '06 Okt 2026 · 14:20 WIB'],
] as const

const metricValues = ['1.452', 'Rp245,8 jt', '5', '100%']

const metrics = [
  { title: 'Penerima terverifikasi', unit: 'Jiwa', icon: Users },
  { title: 'Dana tersalurkan', unit: 'Rupiah · on-chain', icon: Wallet },
  { title: 'Program bansos aktif', unit: 'Program', icon: FolderOpen },
  { title: 'Integritas bukti', unit: 'Bukti terverifikasi', icon: FileCheck2 },
] as const

export function PublicInformation() {
  return (
    <section
      id="informasi-publik"
      aria-labelledby="public-information-title"
      className="mx-auto mt-12 w-[calc(100%-40px)] max-w-7xl border min-[641px]:mt-16 min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:mt-20 min-[1025px]:w-[calc(100%-112px)]"
    >
      <header className="flex flex-col justify-between gap-6 border-b p-6 min-[641px]:p-8 min-[1025px]:flex-row min-[1025px]:items-end min-[1025px]:p-10">
        <div>
          <p className="mb-5 font-mono text-xs text-primary-hover">04 / Terbuka untuk masyarakat</p>
          <h2
            id="public-information-title"
            className="font-sans text-3xl leading-tight tracking-tight min-[641px]:text-4xl min-[1025px]:text-5xl"
          >
            Informasi publik<span className="text-primary-hover">/</span>
          </h2>
        </div>
        <p className="max-w-sm font-mono text-xs leading-6 text-body-copy">
          Ringkasan program, penyaluran, dan jejak pencatatan bantuan dalam satu tampilan.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-px border-b bg-border min-[641px]:grid-cols-2 min-[1025px]:grid-cols-4">
        {metrics.map(({ title, unit, icon: Icon }, index) => (
          <div key={title} className="bg-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-mono text-[11px] leading-5 text-body-copy">{title}</h3>
              <Icon aria-hidden="true" className="size-4 shrink-0 text-primary-hover" />
            </div>
            <p className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-3xl text-primary-hover">{metricValues[index]}</span>
              <span className="font-mono text-[10px] text-body-copy">{unit}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="border-b px-6 py-3 font-mono text-[10px] leading-5 text-body-copy">
        Mode demo — seluruh angka, progres, transaksi, bukti, dan informasi jaringan di bawah adalah
        data dummy untuk pratinjau, bukan data penyaluran nyata.
      </p>
      <div className="grid min-[1025px]:grid-cols-[1fr_2fr]">
        <aside
          aria-label="Program dan jaringan"
          className="min-w-0 border-b min-[1025px]:border-r min-[1025px]:border-b-0"
        >
          <div className="bg-surface p-6 min-[641px]:p-8">
            <h3 className="font-sans text-lg font-medium tracking-tight">Program berjalan</h3>
            <ul className="mt-6 space-y-6">
              {programs.map(({ name, progress }) => (
                <li key={name}>
                  <div className="mb-3 flex justify-between gap-3 font-mono text-xs">
                    <span>{name}</span>
                    <span className="text-primary-hover">{progress}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Progres demo ${name}`}
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 overflow-hidden bg-secondary"
                  >
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t p-6 min-[641px]:p-8">
            <h3 className="flex items-center gap-2 font-sans text-lg font-medium tracking-tight">
              <Blocks aria-hidden="true" className="size-5 text-primary-hover" />
              Informasi jaringan
            </h3>
            <dl className="mt-5 divide-y font-mono text-[10px]">
              {network.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-4">
                  <dt className="text-body-copy">{label}</dt>
                  <dd className="text-right text-primary-hover">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
        <div className="min-w-0 bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6 min-[641px]:p-8">
            <div>
              <h3 className="font-sans text-lg font-medium tracking-tight">
                Jejak penyaluran terakhir
              </h3>
              <p className="mt-2 font-mono text-[10px] leading-5 text-body-copy">
                Catatan transaksi dan status verifikasi penyaluran.
              </p>
            </div>
            <span className="rounded-label bg-secondary px-3 py-2 font-mono text-[10px]">
              Simulasi · 06 Okt 2026
            </span>
          </div>
          <div className="overflow-x-auto" role="region" aria-label="Tabel penyaluran" tabIndex={0}>
            <table className="w-full min-w-[580px] text-left">
              <caption className="sr-only">Riwayat penyaluran bantuan publik</caption>
              <thead className="border-b bg-background font-mono text-[10px] text-body-copy">
                <tr>
                  {['Waktu & hash', 'Program', 'Nominal', 'Bukti', 'Status'].map((title) => (
                    <th key={title} scope="col" className="px-5 py-5 font-medium">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-xs">
                {transactions.map((transaction) => (
                  <tr key={transaction.hash}>
                    <td className="px-5 py-6">
                      <span className="block">{transaction.time} WIB</span>
                      <span className="mt-2 block text-[10px] text-primary-hover">
                        {transaction.hash}
                      </span>
                    </td>
                    <td className="px-5 py-6">{transaction.program}</td>
                    <td className="whitespace-nowrap px-5 py-6">{transaction.amount}</td>
                    <td className="px-5 py-6">
                      <span className="text-[10px] text-body-copy">
                        {transaction.evidence}
                        <span className="mt-1 block">Contoh</span>
                      </span>
                    </td>
                    <td className="px-5 py-6">
                      <span className="inline-block whitespace-nowrap rounded-label bg-primary/10 px-2 py-1.5 text-[10px] text-primary-hover">
                        Tercatat · demo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="flex items-start gap-3 border-t p-6 font-mono text-[10px] leading-5 text-body-copy">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary-hover" />
            Informasi publik tidak menampilkan NIK, alamat lengkap, atau data pribadi penerima.
          </p>
        </div>
      </div>
    </section>
  )
}
