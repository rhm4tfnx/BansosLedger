'use client'

import Link from 'next/link'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ArrowUpRight, ShieldCheck, Users, Wallet, Files, Network, Info } from 'lucide-react'
import { SiteHeader } from '@/components/features/navigation/site-header'
import { CountUp } from '@/components/ui/count-up'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  TransparencyTransactions,
  rupiah,
} from '@/components/features/transparency/transparency-transactions'

const programs = [
  {
    name: 'BLT-K (Bantuan Tunai)',
    target: '1.200 jiwa',
    sent: '1.020 jiwa',
    amount: 100000,
    progress: 85,
    status: 'Terverifikasi',
  },
  {
    name: 'PKH (Keluarga Harapan)',
    target: '180 KK',
    sent: '165 KK',
    amount: 500000,
    progress: 92,
    status: 'Terverifikasi',
  },
  {
    name: 'Sembako / BPNT',
    target: '300 KK',
    sent: '210 KK',
    amount: 150000,
    progress: 70,
    status: 'Verifikasi parsial',
  },
  {
    name: 'Bantuan Lansia',
    target: '45 jiwa',
    sent: '45 jiwa',
    amount: 200000,
    progress: 100,
    status: 'Terverifikasi',
  },
  {
    name: 'Bantuan Disabilitas',
    target: '27 jiwa',
    sent: '16 jiwa',
    amount: 250000,
    progress: 60,
    status: 'Dalam verifikasi',
  },
]
const trend = [142, 156, 128, 171, 165, 182, 195].map((transactions, index) => ({
  day: `${index + 4} Okt`,
  transactions,
}))
const panel = 'min-w-0 rounded-control border bg-white p-5 sm:p-6'

export function TransparencyDashboard() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only">
        Lewati ke konten
      </a>
      <div className="sticky top-0 z-40">
        <SiteHeader />
        <nav aria-label="Bagian transparansi" className="border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl overflow-x-auto px-5 sm:px-8">
            {['Ringkasan', 'Program', 'Transaksi', 'Jaringan'].map((label, i) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="whitespace-nowrap border-b-2 border-transparent px-5 py-4 text-xs font-mono text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span className="mr-2 text-primary">0{i + 1}</span>
                {label}
              </a>
            ))}
          </div>
        </nav>
      </div>
      <main
        id="main"
        data-transparency
        className="mx-auto flex max-w-7xl flex-col gap-12 px-5 py-10 sm:px-8 sm:py-12 [&>section[id]]:scroll-mt-44"
      >
        <Link href="/program" className="text-sm text-primary underline">Lihat daftar program</Link>
        <section id="ringkasan" className="scroll-mt-24">
          <header>
            <p className="font-mono text-xs text-primary">
              TERBUKA. TERLACAK. DAPAT DIPERTANGGUNGJAWABKAN.
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Portal Transparansi
              <br />
              <span className="text-primary">Bantuan Sosial.</span>
            </h1>
            <p className="mt-4 text-sm text-body-copy">
              Kelurahan Takkalasi, Kecamatan Balusu, Kabupaten Barru
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Periode Oktober 2026 • Pratinjau data publik
            </p>
          </header>
          <div
            data-reveal
            className="my-8 flex flex-col justify-between gap-4 rounded-control border border-primary/20 bg-secondary p-5 sm:flex-row sm:items-center"
          >
            <div className="flex gap-3">
              <Info className="size-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Informasi publik & privasi</h2>
                <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">
                  Data pada halaman ini merupakan ilustrasi dari referensi, belum terhubung ke
                  blockchain. Buku besar publik tidak memuat NIK, nama, alamat, atau telepon penerima.
                </p>
              </div>
            </div>
            <Link
              href="/cek-bansos"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-4 py-3 font-mono text-xs text-white hover:bg-primary-hover"
            >
              Cek status bantuan
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <h2 className="mb-5 text-xl font-bold">Ringkasan statistik</h2>
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Total penerima',
                value: 1452,
                suffix: '',
                unit: 'Jiwa',
                note: 'Periode ini: +127 jiwa',
                icon: Users,
              },
              {
                label: 'Total anggaran',
                value: 245800000,
                suffix: '',
                unit: 'Rupiah',
                note: 'Sudah disalurkan: Rp228,3 juta',
                icon: Wallet,
              },
              {
                label: 'Program aktif',
                value: 5,
                suffix: '',
                unit: 'Program',
                note: 'Periode Oktober 2026',
                icon: Files,
              },
              {
                label: 'Verifikasi blockchain',
                value: 100,
                suffix: '%',
                unit: 'Ilustrasi tercatat',
                note: 'Simulasi verifikasi QBFT',
                icon: ShieldCheck,
              },
            ].map(({ label, value, suffix, unit, note, icon: Icon }) => (
              <article key={label} className={panel}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                  <Icon className="size-5 text-primary" />
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-primary">
                  <CountUp value={value} />
                  {suffix}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{unit}</p>
                <p className="mt-5 border-t pt-4 text-[11px] text-muted-foreground">{note}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className={panel}>
              <h3 className="font-semibold">Status program berjalan</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Persentase penyaluran per program • ilustrasi
              </p>
              <div className="mt-7 flex flex-col gap-6">
                {programs.map((p) => (
                  <div key={p.name}>
                    <div className="mb-2 flex justify-between gap-3 text-xs">
                      <span>{p.name}</span>
                      <span className="font-mono text-primary">{p.progress}%</span>
                    </div>
                    <progress
                      aria-label={`Penyaluran ${p.name}`}
                      value={p.progress}
                      max={100}
                      className="block h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-secondary [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
                    />
                  </div>
                ))}
              </div>
            </article>
            <article className={panel}>
              <h3 className="font-semibold">Tren penyaluran 7 hari terakhir</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Jumlah transaksi per hari ��� data ilustrasi
              </p>
              <ChartContainer
                config={{ transactions: { label: 'Transaksi', color: 'var(--primary)' } }}
                className="mt-7 h-64 w-full"
              >
                <AreaChart accessibilityLayer data={trend} margin={{ left: -20, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="transactions"
                    stroke="var(--color-transactions)"
                    fill="var(--color-transactions)"
                    fillOpacity={0.09}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
              <p className="mt-4 font-mono text-[10px] text-muted-foreground">
                4–10 Oktober 2026 • Bukan pembaruan real-time
              </p>
            </article>
          </div>
        </section>
        <section id="program" className="scroll-mt-24">
          <header className="mb-6">
            <p className="font-mono text-xs text-primary">02 / PROGRAM BANTUAN</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Detail program & penyaluran</h2>
          </header>
          <div data-reveal className="overflow-hidden rounded-control border bg-white">
            <h3 className="border-b p-5 font-semibold">Program bantuan sosial aktif</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    {['PROGRAM', 'TARGET', 'TERSALUR', 'NOMINAL / UNIT', 'STATUS ILUSTRASI'].map(
                      (x) => (
                        <th key={x} className="p-5 font-medium">
                          {x}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.name} className="border-t hover:bg-secondary/50">
                      <td className="p-5">{p.name}</td>
                      <td className="p-5 text-muted-foreground">{p.target}</td>
                      <td className="p-5 font-medium text-primary">{p.sent}</td>
                      <td className="p-5 font-mono text-xs">{rupiah(p.amount)}</td>
                      <td className="p-5">
                        <span className="rounded-label bg-secondary px-3 py-1 text-[11px] text-primary">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <TransparencyTransactions />
        <section id="jaringan" className="scroll-mt-24">
          <header className="mb-6">
            <p className="font-mono text-xs text-primary">04 / INFRASTRUKTUR KEPERCAYAAN</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Status jaringan & validator</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Rancangan jaringan berdasarkan referensi. Status operasional belum tersedia.
            </p>
          </header>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className={panel}>
              <h3 className="mb-5 font-semibold">4 validator institusional</h3>
              <div className="flex flex-col gap-3">
                {[
                  'Kelurahan Takkalasi',
                  'Kecamatan Balusu',
                  'Dinas Sosial Kabupaten Barru',
                  'Auditor / Pihak Pengawas',
                ].map((name, i) => (
                  <div key={name} className="flex items-center gap-4 rounded-control border p-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-secondary text-primary">
                      <Network size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono text-muted-foreground">
                        VALIDATOR 0{i + 1}
                      </p>
                      <h4 className="mt-1 text-sm font-medium">{name}</h4>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Belum terhubung</span>
                  </div>
                ))}
              </div>
            </article>
            <article className={panel}>
              <h3 className="mb-4 font-semibold">Informasi jaringan blockchain</h3>
              <dl>
                {[
                  ['Nama jaringan', 'Barru QBFT Consortium'],
                  ['Chain ID (referensi)', '13579'],
                  ['Protokol konsensus', 'QBFT / Proof of Authority'],
                  ['Jumlah validator', '4 institusional'],
                  ['Blok terbaru', 'Belum tersedia'],
                  ['Gas limit (referensi)', '30.000.000'],
                  ['Waktu blok (target)', '3–4 detik'],
                  ['Status jaringan', 'Belum terhubung'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-6 border-b py-4 text-xs last:border-0"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          </div>
          <article className={`${panel} mt-6`}>
            <h3 className="mb-5 font-semibold">Mekanisme konsensus QBFT</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Kuorum', '3 dari 4', 'Persetujuan minimal'],
                ['Finalitas', '1 blok', 'Final setelah konsensus'],
                ['Toleransi kegagalan', '1 validator', 'Batas node bermasalah'],
                ['Pengusul blok', 'Rotasi', 'Bergantian per putaran'],
              ].map(([label, value, note]) => (
                <div key={label} className="rounded-control border bg-secondary/50 p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-primary">{value}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
        <section data-reveal className="rounded-control border border-primary/20 bg-secondary p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck size={20} className="text-primary" />
            Transparansi tanpa mengorbankan privasi
          </h2>
          <div className="mt-4 grid gap-4 text-xs leading-6 text-muted-foreground sm:grid-cols-2">
            <p>
              <strong className="text-foreground">Identitas terlindungi.</strong> Buku besar publik tidak memuat NIK maupun nama penerima. Portal publik tidak menampilkan dokumen pribadi penerima.
            </p>
            <p>
              <strong className="text-foreground">Bukti dapat ditelusuri.</strong> Integrasi
              blockchain dan IPFS diperlukan sebelum hash transaksi dan dokumen audit dapat
              diverifikasi.
            </p>
            <p>
              <strong className="text-foreground">Akses sesuai peran.</strong> Pengelolaan data
              internal harus dibatasi untuk operator dan institusi yang berwenang.
            </p>
            <p>
              <strong className="text-foreground">Data ilustrasi.</strong> Angka, batch, dan status
              pada pratinjau ini bukan laporan resmi atau bukti penyaluran.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
