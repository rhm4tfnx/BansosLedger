'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ArrowUpRight, Box, Network, Search, ShieldCheck } from 'lucide-react'
import { SmartBackLink } from '@/components/shared/smart-back-link'
import { formatApiError } from '@/lib/api/errors'
import { useNetworkStatusQuery } from '@/lib/api/hooks/chain'
import {
  useExplorerBlocksQuery,
  useExplorerSearchQuery,
  useExplorerValidatorsQuery,
} from '@/lib/api/hooks/explorer'
import { ensureWitaSuffix } from '@/lib/format'

export function BlockExplorer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = searchParams.get('q') ?? ''
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const [blockPage, setBlockPage] = useState(1)

  const blocksQuery = useExplorerBlocksQuery(blockPage, 10, {
    refetchInterval: 10_000,
  })
  const networkQuery = useNetworkStatusQuery({
    refetchInterval: 10_000,
  })
  const validatorsQuery = useExplorerValidatorsQuery()
  const searchQuery = useExplorerSearchQuery(submittedQuery, Boolean(submittedQuery))

  function executeSearch(input: string) {
    const raw = input.trim().replace(/^#/, '')
    if (!raw) return

    if (/^\d{16}$/.test(raw)) {
      setSubmittedQuery('')
      setSearchError(
        'NIK tidak pernah ditampilkan atau dicari di Block Explorer. Gunakan halaman Cek Status.',
      )
      return
    }

    const isBlockNum = /^\d+$/.test(raw)
    const isAddress = /^0x[0-9a-fA-F]{40}$/.test(raw)
    const isBytes32 = /^0x[0-9a-fA-F]{64}$/.test(raw)

    if (!isBlockNum && !isAddress && !isBytes32) {
      setSubmittedQuery('')
      setSearchError(
        'Format pencarian tidak valid. Gunakan TxHash (0x..64), nomor blok, alamat (0x..40), refId (0x..64), atau commitment (0x..64).',
      )
      return
    }

    setSearchError('')
    setSubmittedQuery(raw)
  }

  useEffect(() => {
    const trimmed = qParam.trim()
    if (!trimmed) return
    setQuery(trimmed)
    executeSearch(trimmed)
  }, [qParam])

  useEffect(() => {
    const result = searchQuery.data
    if (!result || !submittedQuery) return
    if (result.kind === 'block') {
      router.push(`/explorer/block/${result.block.number}`)
    } else if (result.kind === 'tx') {
      router.push(`/explorer/tx/${result.tx.txHash}`)
    } else if (result.kind === 'address') {
      router.push(`/explorer/address/${result.address.address}`)
    } else if (result.kind === 'events' && result.events.length === 1 && result.events[0]?.txHash) {
      router.push(`/explorer/tx/${result.events[0].txHash}`)
    }
  }, [router, searchQuery.data, submittedQuery])

  const isChainNotConfigured =
    blocksQuery.error?.code === 'CHAIN_NOT_CONFIGURED' ||
    networkQuery.error?.code === 'CHAIN_NOT_CONFIGURED' ||
    validatorsQuery.error?.code === 'CHAIN_NOT_CONFIGURED' ||
    searchQuery.error?.code === 'CHAIN_NOT_CONFIGURED'

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    executeSearch(query)
  }

  const blocks = blocksQuery.data?.items ?? []
  const validators = validatorsQuery.data?.items ?? []
  const validatorCount =
    networkQuery.data?.validatorCount ?? validatorsQuery.data?.count ?? null
  const latestBlock = networkQuery.data?.latestBlock ?? blocks[0]?.number ?? null

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <span
              className="relative block w-28 shrink-0 overflow-hidden mix-blend-multiply min-[400px]:w-32 sm:w-36 min-[1025px]:w-40"
              style={{ aspectRatio: '1590 / 325' }}
            >
              <img
                src="/images/bansosledger-logo.png"
                alt="BansosLedger"
                width={2145}
                height={733}
                fetchPriority="high"
                className="absolute h-auto max-w-none"
                style={{ width: '134.91%', left: '-17.61%', top: '-58.46%' }}
              />
            </span>
            <span className="hidden border-l pl-3 font-mono text-xs font-normal text-muted-foreground sm:block">
              BLOCK EXPLORER
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/transparansi"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-primary transition-colors hover:bg-secondary sm:px-3.5 sm:py-2 sm:text-xs"
            >
              Ringkasan publik
            </Link>
            <SmartBackLink
              fallbackHref="/"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-primary transition-colors hover:bg-secondary sm:px-3.5 sm:py-2 sm:text-xs"
            >
              <ArrowLeft size={14} />
              Home
            </SmartBackLink>
          </div>
        </div>
      </header>
      <main data-transparency id="main">
        <section className="border-b bg-secondary">
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-12">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-primary">
              <span>BARRU QBFT CONSORTIUM</span>
              <span className="rounded-label border border-primary/20 px-2 py-1">
                PERMISSIONED LEDGER
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              BansosLedger <span className="text-primary">Block Explorer.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Telusuri jejak digital bantuan sosial: blok, transaksi, alamat, kontrak, dan validator.
            </p>
            <form
              onSubmit={handleSearchSubmit}
              className="mt-7 flex max-w-4xl flex-wrap gap-2 rounded-control border bg-white p-2 sm:flex-nowrap"
            >
              <label htmlFor="explorer-search" className="sr-only">
                Cari TxHash, nomor blok, alamat, refId, atau commitment
              </label>
              <input
                id="explorer-search"
                required
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (searchError) setSearchError('')
                }}
                placeholder="TxHash / nomor blok / alamat / refId / commitment"
                className="min-h-11 min-w-0 flex-1 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                aria-label="Cari di explorer"
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 py-2.5 text-white hover:bg-primary-hover"
              >
                <Search size={20} />
              </button>
            </form>
            {searchError && (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {searchError}
              </p>
            )}
            <nav
              aria-label="Tautan cepat explorer"
              className="mt-3 flex flex-wrap items-center gap-2.5 text-xs text-primary sm:gap-3"
            >
              <Link
                href="/cara-verifikasi"
                className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary/60"
              >
                Cara memeriksa transaksi
              </Link>
              <Link
                href="/explorer/contract"
                className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary/60"
              >
                Kontrak
              </Link>
              <Link
                href="/explorer/validator"
                className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary/60"
              >
                Validator
              </Link>
              <Link
                href="/transparansi"
                className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary/60"
              >
                Ringkasan publik
              </Link>
            </nav>
          </div>
        </section>

        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-14 sm:px-8">
          <div className="-mt-6 flex flex-wrap items-center justify-between gap-3 rounded-control border bg-white p-4 text-xs shadow-sm">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <strong>Proof of Authority · QBFT</strong>
              <span className="hidden text-muted-foreground sm:inline">
                {networkQuery.data?.status ?? 'Memeriksa jaringan…'}
              </span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              TANPA IDENTITAS PRIBADI (UU PDP)
            </span>
          </div>

          {isChainNotConfigured && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-control border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
              <div>
                <p className="font-semibold">Jaringan belum tersedia</p>
                <p className="text-xs">
                  Konfigurasi RPC blockchain belum diaktifkan pada lingkungan ini.
                </p>
              </div>
            </div>
          )}

          {submittedQuery && (
            <section className="rounded-control border bg-white p-5" aria-live="polite">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">Hasil pencarian</h2>
                <button
                  type="button"
                  className="min-h-11 text-xs text-primary hover:underline"
                  onClick={() => setSubmittedQuery('')}
                >
                  Tutup hasil
                </button>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                Kueri: {submittedQuery}
              </p>

              {searchQuery.isLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">Mencari di jaringan…</p>
              ) : searchQuery.isError ? (
                <div role="alert" className="mt-4 text-sm text-destructive">
                  <p>{formatApiError(searchQuery.error).message}</p>
                  {searchQuery.error.requestId && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      ID permintaan: {searchQuery.error.requestId}
                    </p>
                  )}
                </div>
              ) : searchQuery.data?.kind === 'block' ? (
                <div className="mt-4">
                  <Link
                    href={`/explorer/block/${searchQuery.data.block.number}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline"
                  >
                    Blok #{searchQuery.data.block.number} ({searchQuery.data.block.hashShort})
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ) : searchQuery.data?.kind === 'tx' ? (
                <div className="mt-4">
                  <Link
                    href={`/explorer/tx/${searchQuery.data.tx.txHash}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline"
                  >
                    Transaksi {searchQuery.data.tx.txHashShort} ({searchQuery.data.tx.statusLabel})
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ) : searchQuery.data?.kind === 'address' ? (
                <div className="mt-4">
                  <Link
                    href={`/explorer/address/${searchQuery.data.address.address}`}
                    className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline"
                  >
                    Alamat {searchQuery.data.address.address}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ) : searchQuery.data?.kind === 'events' ? (
                <div className="mt-4 flex flex-col gap-3">
                  {searchQuery.data.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Tidak ditemukan event penyaluran untuk pencarian ini.
                    </p>
                  ) : (
                    searchQuery.data.events.map((ev, idx) => (
                      <div
                        key={`${ev.txHash ?? ev.refId}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-control border p-3 text-xs"
                      >
                        <div>
                          <p className="font-mono font-medium text-primary">
                            {ev.txHashShort ?? ev.refId}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            Periode {ev.periodLabel} · {ev.amountFormatted} ·{' '}
                            {ensureWitaSuffix(ev.wita)}
                          </p>
                        </div>
                        {ev.txHash && (
                          <Link
                            href={`/explorer/tx/${ev.txHash}`}
                            className="inline-flex min-h-11 items-center gap-1 font-mono text-primary underline"
                          >
                            Detail transaksi <ArrowUpRight size={14} />
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </section>
          )}

          <section
            data-reveal
            className="grid min-w-0 gap-6 rounded-control border bg-white p-6 sm:grid-cols-3"
          >
            <div>
              <p className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <Network size={15} />
                VALIDATOR NODES
              </p>
              <p className="mt-2 text-xl font-semibold text-primary">
                {validatorCount != null ? `${validatorCount} validator` : '-'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Konsensus QBFT</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground">STATUS JARINGAN</p>
              <p className="mt-2 text-xl font-semibold text-primary">
                {networkQuery.data?.status ?? (isChainNotConfigured ? 'Belum tersedia' : '—')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {networkQuery.data?.timestampWita
                  ? `Sinkron: ${ensureWitaSuffix(networkQuery.data.timestampWita)}`
                  : 'Pembaruan otomatis tiap 10 detik'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground">BLOK TERAKHIR</p>
              {latestBlock != null ? (
                <Link
                  href={`/explorer/block/${latestBlock}`}
                  className="mt-2 inline-flex items-center gap-1 text-xl font-semibold text-primary hover:underline"
                >
                  #{latestBlock} <ArrowUpRight className="inline size-4" />
                </Link>
              ) : (
                <p className="mt-2 text-xl font-semibold text-primary">—</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">Finalitas instan QBFT</p>
            </div>
          </section>

          {validators.length > 0 && (
            <section className="rounded-control border bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">Validator konsorsium</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Klik alamat validator untuk melihat riwayat aktivitas on-chain
                  </p>
                </div>
                <Link
                  href="/explorer/validator"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border bg-white px-3.5 py-2 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
                >
                  Detail validator <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {validators.map((v) => (
                  <Link
                    key={v.address}
                    href={`/explorer/address/${v.address}`}
                    className="min-w-0 rounded-control border p-4 transition-colors hover:bg-secondary/40"
                  >
                    <p className="text-xs font-medium text-primary">{v.institution}</p>
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                      {v.addressShort}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="min-w-0 overflow-hidden rounded-control border bg-white">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="font-semibold">Blok terbaru</h2>
              <span className="font-mono text-[10px] text-muted-foreground">
                POLLING 10 DETIK SAAT TAB AKTIF
              </span>
            </div>

            {blocksQuery.isLoading && !blocks.length ? (
              <div aria-busy="true" className="space-y-3 p-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-control bg-secondary" />
                ))}
              </div>
            ) : blocksQuery.isError && !blocks.length ? (
              <div role="alert" className="p-6 text-sm text-muted-foreground">
                <p>
                  {isChainNotConfigured
                    ? 'Jaringan belum tersedia'
                    : formatApiError(blocksQuery.error).message}
                </p>
                {blocksQuery.error?.requestId && (
                  <p className="mt-1 font-mono text-[10px]">
                    ID permintaan: {blocksQuery.error.requestId}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void blocksQuery.refetch()}
                  className="mt-3 min-h-11 rounded-control border px-4 py-2 text-xs text-primary hover:bg-secondary"
                >
                  Coba lagi
                </button>
              </div>
            ) : blocks.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Belum ada blok yang tercatat pada jaringan.
              </div>
            ) : (
              <>
                {blocks.map((b) => (
                  <div className="flex items-center gap-3 border-b p-5" key={b.number}>
                    <span className="rounded-control bg-secondary p-3 text-primary">
                      <Box size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/explorer/block/${b.number}`}
                        className="font-mono text-xs font-semibold text-primary hover:underline"
                      >
                        #{b.number}
                      </Link>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {ensureWitaSuffix(b.timestampWita)}
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <Link
                        href={`/explorer/address/${b.proposer}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {b.proposerShort}
                      </Link>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {b.transactionCount} transaksi
                      </p>
                    </div>
                  </div>
                ))}

                {blocksQuery.data && blocksQuery.data.totalPages > 1 && (
                  <div className="flex items-center justify-between bg-secondary/40 px-5 py-3 text-xs">
                    <span className="font-mono text-muted-foreground">
                      Halaman {blocksQuery.data.page} dari {blocksQuery.data.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={blockPage <= 1}
                        onClick={() => setBlockPage((p) => Math.max(1, p - 1))}
                        className="min-h-11 rounded-control border bg-white px-4 py-2 font-mono text-primary disabled:opacity-50"
                      >
                        Sebelumnya
                      </button>
                      <button
                        type="button"
                        disabled={blockPage >= blocksQuery.data.totalPages}
                        onClick={() => setBlockPage((p) => p + 1)}
                        className="min-h-11 rounded-control border bg-white px-4 py-2 font-mono text-primary disabled:opacity-50"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
