'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  CheckCircle2,
  Files,
  FileText,
  Info,
  Network,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { SiteHeader } from '@/components/features/navigation/site-header'
import { TransparencyTransactions } from '@/components/features/transparency/transparency-transactions'
import { useNetworkStatusQuery } from '@/lib/api/hooks/chain'
import { useExplorerValidatorsQuery } from '@/lib/api/hooks/explorer'
import { usePublicProgramsQuery, usePublicSummaryQuery } from '@/lib/api/hooks/public'
import type {
  ExplorerBlockViewModel,
  ExplorerValidatorViewModel,
  NetworkStatusViewModel,
  PaginatedResult,
  PublicProgramViewModel,
  PublicRecentDisbursementsViewModel,
  PublicSummaryViewModel,
} from '@/types'

const panel = 'min-w-0 rounded-control border bg-white p-5 sm:p-6'

export interface TransparencyDashboardProps {
  initialSummary?: PublicSummaryViewModel
  summaryUnavailable?: boolean
  initialPrograms?: PaginatedResult<PublicProgramViewModel>
  programsUnavailable?: boolean
  initialTransactions?: PublicRecentDisbursementsViewModel
  transactionsUnavailable?: boolean
  initialNetwork?: NetworkStatusViewModel
  networkUnavailable?: boolean
  initialValidators?: { items: ExplorerValidatorViewModel[]; count: number | null }
  initialBlocks?: PaginatedResult<ExplorerBlockViewModel>
  blocksUnavailable?: boolean
}

export function TransparencyDashboard({
  initialSummary,
  summaryUnavailable = false,
  initialPrograms,
  programsUnavailable = false,
  initialTransactions,
  transactionsUnavailable = false,
  initialNetwork,
  networkUnavailable = false,
  initialValidators,
  initialBlocks,
  blocksUnavailable = false,
}: TransparencyDashboardProps = {}) {
  const summaryQuery = usePublicSummaryQuery({
    enabled: !initialSummary && !summaryUnavailable,
    initialData: initialSummary,
  })
  const programsQuery = usePublicProgramsQuery({
    page: 1,
    limit: 20,
    enabled: !initialPrograms && !programsUnavailable,
    initialData: initialPrograms,
  })
  const networkQuery = useNetworkStatusQuery({
    enabled: !initialNetwork && !networkUnavailable,
  })
  const validatorsQuery = useExplorerValidatorsQuery(!initialValidators && !networkUnavailable)

  const summary = summaryQuery.data ?? initialSummary
  const programsData = programsQuery.data ?? initialPrograms
  const programs = programsData?.items ?? []
  const isProgramListTruncated = Boolean(
    programsData && (programsData.totalPages > 1 || programsData.total > programs.length),
  )
  const network = networkQuery.data ?? initialNetwork
  const validators = validatorsQuery.data ?? initialValidators

  const isSummaryUnavailable =
    (summaryUnavailable && !summary) || (summaryQuery.isError && !summary)
  const isProgramsUnavailable =
    (programsUnavailable && !programs.length) || (programsQuery.isError && !programs.length)
  const isNetworkChainUnconfigured =
    networkQuery.error?.code === 'CHAIN_NOT_CONFIGURED' ||
    validatorsQuery.error?.code === 'CHAIN_NOT_CONFIGURED'
  const isNetworkUnavailable =
    (networkUnavailable && !network) || (networkQuery.isError && !network)

  const kpiCards = summary
    ? [
        {
          label: 'Program aktif',
          value: summary.programs.toLocaleString('id-ID'),
          unit: 'Program publik',
          note: 'Program dengan status aktif/ditutup',
          icon: Files,
        },
        {
          label: 'Total pagu anggaran',
          value: summary.budgetFormatted,
          unit: 'Rupiah',
          note: 'Alokasi anggaran program publik',
          icon: Wallet,
        },
        {
          label: 'Dana tersalurkan',
          value: summary.amountFormatted,
          unit: 'Rupiah tercatat',
          note: 'Realisasi penyaluran berstatus SUCCESS',
          icon: CheckCircle2,
        },
        {
          label: 'Transaksi tercatat',
          value: summary.transactions.toLocaleString('id-ID'),
          unit: 'Transaksi on-chain',
          note: 'Dapat diverifikasi di Block Explorer',
          icon: FileText,
        },
      ]
    : []

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
                className="inline-flex min-h-11 items-center whitespace-nowrap border-b-2 border-transparent px-5 py-3 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
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
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            href="/program"
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 py-2.5 font-mono text-xs font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Lihat daftar program
          </Link>
          <Link
            href="/cara-verifikasi"
            className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
          >
            Cara memeriksa transaksi
          </Link>
        </div>

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
          </header>

          <div
            data-reveal
            className="my-8 flex flex-col justify-between gap-4 rounded-control border border-primary/20 bg-secondary p-5 sm:flex-row sm:items-center"
          >
            <div className="flex gap-3">
              <Info className="size-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Informasi publik & privasi (UU PDP)</h2>
                <p className="mt-1 max-w-3xl text-xs leading-6 text-muted-foreground">
                  Buku besar publik dan Block Explorer tidak pernah memuat NIK, nama, alamat, atau
                  nomor telepon penerima. Pemeriksaan status mandiri hanya dapat dilakukan melalui
                  halaman Cek Status dengan verifikasi keamanan.
                </p>
              </div>
            </div>
            <Link
              href="/cek-bansos"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-4 py-3 font-mono text-xs text-white hover:bg-primary-hover"
            >
              Cek status bantuan
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <h2 className="mb-5 text-xl font-bold">Ringkasan statistik</h2>
          {isSummaryUnavailable ? (
            <div role="status" className={panel}>
              <p className="font-semibold text-primary">Data sementara tidak tersedia</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ringkasan statistik bantuan sosial belum dapat dimuat saat ini.
              </p>
            </div>
          ) : summaryQuery.isLoading && !summary ? (
            <div
              aria-busy="true"
              className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-control border bg-white p-5" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
              {kpiCards.map(({ label, value, unit, note, icon: Icon }) => (
                <article key={label} className={panel}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
                    <Icon className="size-5 text-primary" />
                  </div>
                  <p className="mt-4 break-words text-2xl font-bold tracking-tight text-primary">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{unit}</p>
                  <p className="mt-5 border-t pt-4 text-[11px] text-muted-foreground">{note}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="program" className="scroll-mt-24">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-primary">02 / PROGRAM BANTUAN</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Daftar program bantuan sosial
              </h2>
            </div>
            <Link
              href="/program"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              Semua program <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </header>
          <div data-reveal className="overflow-hidden rounded-control border bg-white">
            <h3 className="border-b p-5 font-semibold">Program bantuan sosial publik</h3>
            {isProgramsUnavailable ? (
              <div role="status" className="p-6 text-sm text-muted-foreground">
                Data sementara tidak tersedia
              </div>
            ) : programsQuery.isLoading && !programs.length ? (
              <div aria-busy="true" className="space-y-3 p-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-control bg-secondary" />
                ))}
              </div>
            ) : programs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Belum ada program publik yang terdaftar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-secondary text-xs text-muted-foreground">
                    <tr>
                      {[
                        'PROGRAM',
                        'KODE',
                        'JENIS / SUMBER DANA',
                        'PERIODE',
                        'NOMINAL / PENERIMA',
                        'PAGU ANGGARAN',
                        'STATUS',
                      ].map((x) => (
                        <th key={x} className="p-5 font-medium">
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((p) => (
                      <tr key={p.code} className="border-t transition-colors hover:bg-secondary/50">
                        <td className="p-5 font-medium">
                          <Link
                            href={`/program/${encodeURIComponent(p.code)}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="p-5 font-mono text-xs">{p.code}</td>
                        <td className="p-5 text-xs">
                          {p.kindLabel} · {p.fundSource}
                        </td>
                        <td className="p-5 text-xs">{p.periodRangeLabel}</td>
                        <td className="p-5 font-mono text-xs">{p.amountPerRecipientFormatted}</td>
                        <td className="p-5 font-mono text-xs">{p.totalBudgetFormatted}</td>
                        <td className="p-5">
                          <span className="inline-flex items-center gap-1 rounded-label bg-secondary px-3 py-1 text-xs text-primary">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            {p.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <TransparencyTransactions
          programs={programs}
          isProgramListTruncated={isProgramListTruncated}
          programsLoading={programsQuery.isLoading && !programsData}
          programsUnavailable={isProgramsUnavailable}
          initialTransactions={initialTransactions}
          transactionsUnavailable={transactionsUnavailable}
          initialBlocks={initialBlocks}
          unavailable={blocksUnavailable}
        />

        <section id="jaringan" className="scroll-mt-24">
          <header className="mb-6">
            <p className="font-mono text-xs text-primary">04 / JARINGAN BLOCKCHAIN</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Status jaringan & validator konsorsium
            </h2>
          </header>

          {isNetworkChainUnconfigured ? (
            <div role="status" className={panel}>
              <p className="font-semibold text-primary">Jaringan belum tersedia</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Konfigurasi node blockchain belum diaktifkan pada lingkungan ini.
              </p>
            </div>
          ) : isNetworkUnavailable ? (
            <div role="status" className={panel}>
              <p className="font-semibold text-primary">Data sementara tidak tersedia</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Informasi status jaringan belum dapat dimuat saat ini.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <article className={panel}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Status jaringan QBFT</h3>
                  <Network className="size-5 text-primary" />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-control border p-4">
                    <dt className="text-xs text-muted-foreground">Status node</dt>
                    <dd className="mt-1 font-semibold text-primary">
                      {network?.status ?? 'Memuat…'}
                    </dd>
                  </div>
                  <div className="rounded-control border p-4">
                    <dt className="text-xs text-muted-foreground">Blok terakhir</dt>
                    <dd className="mt-1 font-mono font-semibold text-primary">
                      {network ? `#${network.latestBlock}` : '—'}
                    </dd>
                  </div>
                  <div className="rounded-control border p-4">
                    <dt className="text-xs text-muted-foreground">Jumlah validator</dt>
                    <dd className="mt-1 font-mono font-semibold text-primary">
                      {network?.validatorCount != null ? network.validatorCount : '-'}
                    </dd>
                  </div>
                  <div className="rounded-control border p-4">
                    <dt className="text-xs text-muted-foreground">Waktu blok terakhir (WITA)</dt>
                    <dd className="mt-1 font-mono text-xs">{network?.timestampWita ?? '—'}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/explorer"
                    className="inline-flex min-h-11 items-center gap-1 rounded-control bg-primary px-4 py-2.5 font-mono text-xs text-white hover:bg-primary-hover"
                  >
                    Buka Block Explorer <ArrowUpRight size={14} />
                  </Link>
                  <Link
                    href="/explorer/contract"
                    className="inline-flex min-h-11 items-center gap-1 rounded-control border px-4 py-2.5 font-mono text-xs text-primary hover:bg-secondary"
                  >
                    Detail kontrak & ABI
                  </Link>
                </div>
              </article>

              <article className={panel}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Validator konsorsium</h3>
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Node validator resmi yang memvalidasi blok pada jaringan konsorsium QBFT.
                </p>
                {validators?.items.length ? (
                  <ul className="mt-4 divide-y border-t">
                    {validators.items.map((v) => (
                      <li
                        key={v.address}
                        className="flex items-center justify-between gap-3 py-3 text-xs"
                      >
                        <span className="font-medium">{v.institution}</span>
                        <Link
                          href={`/explorer/address/${v.address}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {v.addressShort}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Daftar alamat validator belum diekspos oleh RPC publik ({validators?.count ?? '-'}).
                  </p>
                )}
                <div className="mt-5">
                  <Link
                    href="/explorer/validator"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
                  >
                    Lihat halaman validator <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
