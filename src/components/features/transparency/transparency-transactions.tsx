'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Box, CheckCircle2 } from 'lucide-react'
import { useExplorerBlocksQuery } from '@/lib/api/hooks/explorer'
import { usePublicRecentDisbursementsQuery } from '@/lib/api/hooks/public'
import { formatRupiah } from '@/lib/format'
import type {
  ExplorerBlockViewModel,
  PaginatedResult,
  PublicProgramViewModel,
  PublicRecentDisbursementsViewModel,
} from '@/types'

export const rupiah = formatRupiah

const TX_PAGE_SIZE = 6

export interface TransparencyTransactionsProps {
  programs?: readonly PublicProgramViewModel[]
  isProgramListTruncated?: boolean
  programsLoading?: boolean
  programsUnavailable?: boolean
  initialTransactions?: PublicRecentDisbursementsViewModel
  transactionsUnavailable?: boolean
  initialBlocks?: PaginatedResult<ExplorerBlockViewModel>
  unavailable?: boolean
}

export function TransparencyTransactions({
  programs = [],
  isProgramListTruncated = false,
  programsLoading = false,
  programsUnavailable = false,
  initialTransactions,
  transactionsUnavailable = false,
  initialBlocks,
  unavailable = false,
}: TransparencyTransactionsProps = {}) {
  const [txPage, setTxPage] = useState(1)

  const txQuery = usePublicRecentDisbursementsQuery({
    programs,
    isProgramListTruncated,
    perProgramLimit: 20,
    maxPrograms: 10,
    enabled: !programsUnavailable && !transactionsUnavailable && !programsLoading,
    initialData: initialTransactions,
  })

  const blocksQuery = useExplorerBlocksQuery(1, 6, {
    enabled: !unavailable,
    initialData: initialBlocks,
    refetchInterval: 10_000,
  })

  const txData = txQuery.data ?? initialTransactions
  const allTxItems = txData?.items ?? []
  const totalTxPages = Math.max(1, Math.ceil(allTxItems.length / TX_PAGE_SIZE))
  const safeTxPage = Math.min(txPage, totalTxPages)
  const pagedTxItems = allTxItems.slice(
    (safeTxPage - 1) * TX_PAGE_SIZE,
    safeTxPage * TX_PAGE_SIZE,
  )

  const isTxLoading =
    (programsLoading || txQuery.isLoading) && !txData && !programsUnavailable && !transactionsUnavailable
  const isTxUnavailable =
    ((programsUnavailable || transactionsUnavailable) && !txData) ||
    (txQuery.isError && !txData)

  const blocks = blocksQuery.data?.items ?? initialBlocks?.items ?? []
  const errorCode = blocksQuery.error?.code
  const isChainNotConfigured = errorCode === 'CHAIN_NOT_CONFIGURED'
  const isBlocksUnavailable =
    (unavailable && !blocks.length) || (blocksQuery.isError && !blocks.length)

  return (
    <section id="transaksi" className="scroll-mt-24">
      <header className="mb-6">
        <p className="font-mono text-xs text-primary">03 / JEJAK PENYALURAN & BLOK</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Transaksi & blok terbaru</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ledger penyaluran bantuan sosial terkonfirmasi (SUCCESS) dan blok terbaru pada jaringan
          konsorsium QBFT. Semua waktu ditampilkan dalam WITA (Asia/Makassar).
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {/* Tabel 1 (Atas): Transaksi penyaluran tercatat terbaru */}
        <div data-reveal className="overflow-hidden rounded-control border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5">
            <div>
              <h3 className="font-semibold">Transaksi penyaluran tercatat terbaru</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Menampilkan ledger transaksi penyaluran berstatus SUCCESS dari program publik tanpa
                identitas pribadi penerima.
              </p>
            </div>
            <Link
              href="/explorer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              Buka Block Explorer <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {isTxUnavailable ? (
            <div role="status" className="p-6 text-sm text-muted-foreground">
              Data transaksi penyaluran sementara tidak tersedia
            </div>
          ) : isTxLoading ? (
            <div aria-busy="true" className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-control bg-secondary" />
              ))}
            </div>
          ) : allTxItems.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Belum ada transaksi penyaluran publik berstatus SUCCESS yang tercatat pada jaringan.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-secondary text-xs text-muted-foreground">
                    <tr>
                      {[
                        'TX HASH',
                        'JENIS / PROGRAM',
                        'PERIODE',
                        'NOMINAL',
                        'WAKTU (WITA)',
                        'STATUS',
                        'DETAIL',
                      ].map((col) => (
                        <th key={col} className="px-5 py-4 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTxItems.map((tx, idx) => (
                      <tr
                        key={`${tx.txHash ?? 'no-hash'}-${tx.programCode}-${tx.periodId}-${idx}`}
                        className="border-t transition-colors hover:bg-secondary/50"
                      >
                        <td className="px-5 py-4 font-mono text-xs font-semibold text-primary">
                          {tx.txHash ? (
                            <Link
                              href={`/explorer/tx/${tx.txHash}`}
                              className="text-primary hover:underline"
                            >
                              {tx.txHashShort}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className="font-medium text-foreground">
                            Penyaluran ·{' '}
                            <Link
                              href={`/program/${encodeURIComponent(tx.programCode)}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {tx.programName}
                            </Link>
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {tx.programCode} · {tx.kindLabel}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs">{tx.periodLabel}</td>
                        <td className="px-5 py-4 font-mono text-xs font-medium">
                          {tx.amountFormatted}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs">{tx.timeWita}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 rounded-label bg-secondary px-2.5 py-1 text-xs text-primary">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            Tercatat
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {tx.txHash ? (
                            <Link
                              href={`/explorer/tx/${tx.txHash}`}
                              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-control border bg-white px-3 py-1.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
                            >
                              Detail transaksi <ArrowUpRight size={13} aria-hidden="true" />
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(totalTxPages > 1 || txData?.isTruncated || (txData?.partialFailureCount ?? 0) > 0) && (
                <div className="flex flex-col gap-2 border-t bg-secondary/20 px-5 py-3.5 text-xs">
                  {totalTxPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-muted-foreground">
                        {allTxItems.length} transaksi terbaru · Halaman {safeTxPage} dari{' '}
                        {totalTxPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={safeTxPage <= 1}
                          onClick={() => setTxPage((curr) => Math.max(1, curr - 1))}
                          className="min-h-10 rounded-control border bg-white px-3.5 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-secondary disabled:opacity-50"
                        >
                          Sebelumnya
                        </button>
                        <button
                          type="button"
                          disabled={safeTxPage >= totalTxPages}
                          onClick={() => setTxPage((curr) => Math.min(totalTxPages, curr + 1))}
                          className="min-h-10 rounded-control border bg-white px-3.5 py-1.5 font-mono text-xs text-primary transition-colors hover:bg-secondary disabled:opacity-50"
                        >
                          Berikutnya
                        </button>
                      </div>
                    </div>
                  )}
                  {txData?.isTruncated && (
                    <p className="text-[11px] text-muted-foreground">
                      Menampilkan ringkasan transaksi terbaru per program publik. Riwayat lengkap per
                      program dapat dilihat pada halaman detail masing-masing program.
                    </p>
                  )}
                  {(txData?.partialFailureCount ?? 0) > 0 && (
                    <p role="status" className="text-[11px] text-muted-foreground">
                      Sebagian program ({txData?.failedPrograms.join(', ')}) belum dapat dimuat saat
                      ini; menampilkan data program yang tersedia.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tabel 2 (Bawah): Blok tercatat terbaru */}
        <div data-reveal className="overflow-hidden rounded-control border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5">
            <div>
              <h3 className="font-semibold">Blok tercatat terbaru</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Blok terbaru yang divalidasi oleh konsorsium validator QBFT.
              </p>
            </div>
            <Link
              href="/explorer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              Buka Block Explorer <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {isChainNotConfigured ? (
            <div role="status" className="p-6 text-sm text-muted-foreground">
              Jaringan belum tersedia
            </div>
          ) : isBlocksUnavailable ? (
            <div role="status" className="p-6 text-sm text-muted-foreground">
              Data sementara tidak tersedia
            </div>
          ) : blocksQuery.isLoading && !blocks.length ? (
            <div aria-busy="true" className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-control bg-secondary" />
              ))}
            </div>
          ) : blocks.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Belum ada blok yang tercatat pada jaringan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    {['BLOK', 'WAKTU (WITA)', 'PROPOSER', 'JUMLAH TRANSAKSI', 'DETAIL'].map((x) => (
                      <th key={x} className="px-5 py-4 font-medium">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((block) => (
                    <tr
                      key={block.number}
                      className="border-t transition-colors hover:bg-secondary/50"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-primary">
                        <Link
                          href={`/explorer/block/${block.number}`}
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <Box size={14} aria-hidden="true" />#{block.number}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">{block.timestampWita}</td>
                      <td className="px-5 py-4 font-mono text-xs">
                        <Link
                          href={`/explorer/address/${block.proposer}`}
                          className="text-primary hover:underline"
                        >
                          {block.proposerShort}
                        </Link>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">{block.transactionCount} tx</td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/explorer/block/${block.number}`}
                          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-control border bg-white px-3 py-1.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
                        >
                          Detail blok <ArrowUpRight size={13} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
