'use client'

import Link from 'next/link'
import { ArrowUpRight, Box } from 'lucide-react'
import { useExplorerBlocksQuery } from '@/lib/api/hooks/explorer'
import { formatRupiah } from '@/lib/format'
import type { ExplorerBlockViewModel, PaginatedResult } from '@/types'

export const rupiah = formatRupiah

export interface TransparencyTransactionsProps {
  initialBlocks?: PaginatedResult<ExplorerBlockViewModel>
  unavailable?: boolean
}

export function TransparencyTransactions({
  initialBlocks,
  unavailable = false,
}: TransparencyTransactionsProps = {}) {
  const blocksQuery = useExplorerBlocksQuery(1, 6, {
    enabled: !unavailable,
    initialData: initialBlocks,
    refetchInterval: 10_000,
  })

  const blocks = blocksQuery.data?.items ?? initialBlocks?.items ?? []
  const errorCode = blocksQuery.error?.code
  const isChainNotConfigured = errorCode === 'CHAIN_NOT_CONFIGURED'
  const isUnavailable = (unavailable && !blocks.length) || (blocksQuery.isError && !blocks.length)

  return (
    <section id="transaksi" className="scroll-mt-24">
      <header className="mb-6">
        <p className="font-mono text-xs text-primary">03 / JEJAK PENYALURAN & BLOK</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Blok terbaru & jejak audit</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Blok terbaru pada jaringan konsorsium QBFT. Semua waktu ditampilkan dalam WITA
          (Asia/Makassar).
        </p>
      </header>
      <div data-reveal className="overflow-hidden rounded-control border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5">
          <h3 className="font-semibold">Blok tercatat terbaru</h3>
          <Link
            href="/explorer"
            className="inline-flex min-h-11 items-center gap-1 font-mono text-xs text-primary hover:underline"
          >
            Buka Block Explorer <ArrowUpRight size={14} />
          </Link>
        </div>

        {isChainNotConfigured ? (
          <div role="status" className="p-6 text-sm text-muted-foreground">
            Jaringan belum tersedia
          </div>
        ) : isUnavailable ? (
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
                      <span className="inline-flex items-center gap-2">
                        <Box size={14} aria-hidden="true" />#{block.number}
                      </span>
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
                        className="inline-flex min-h-11 items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Detail blok <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
