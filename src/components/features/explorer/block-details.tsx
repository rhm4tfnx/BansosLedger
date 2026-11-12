'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react'
import { formatApiError } from '@/lib/api/errors'
import { useExplorerBlockDetailQuery } from '@/lib/api/hooks/explorer'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-4 last:border-0 sm:grid-cols-[240px_1fr]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm leading-6 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

export interface BlockDetailsProps {
  blockNumber: number | string
  initialTab?: string
}

export function BlockDetails({ blockNumber }: BlockDetailsProps) {
  const [copyStatus, setCopyStatus] = useState('')
  const blockQuery = useExplorerBlockDetailQuery(blockNumber)
  const block = blockQuery.data
  const isChainNotConfigured = blockQuery.error?.code === 'CHAIN_NOT_CONFIGURED'

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(`${label} disalin`)
    } catch {
      setCopyStatus('Gagal menyalin.')
    }
  }

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/explorer" className="flex items-center gap-3 font-bold">
            <span
              className="relative block w-36 shrink-0 overflow-hidden mix-blend-multiply min-[1025px]:w-40"
              style={{ aspectRatio: '1590 / 325' }}
            >
              <img
                src="/images/bansosledger-detail-logo.png"
                alt="BansosLedger"
                width={2145}
                height={733}
                fetchPriority="high"
                className="absolute h-auto max-w-none"
                style={{ width: '134.91%', left: '-17.61%', top: '-58.46%' }}
              />
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              href="/transparansi"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control border bg-white px-3.5 py-2 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              Ringkasan publik
            </Link>
            <Link
              href="/explorer"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border bg-white px-3.5 py-2 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Explorer
            </Link>
          </div>
        </div>
      </header>
      <main
        id="main"
        data-transparency
        className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:px-8"
      >
        <div data-reveal>
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Link href="/explorer" className="text-primary hover:underline">
              Explorer
            </Link>
            <span>/ Detail blok /</span>
            <Link href="/transparansi" className="text-primary hover:underline">
              Ringkasan publik
            </Link>
          </nav>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Block <span className="text-primary">#{String(blockNumber)}</span>
            </h1>
            <span className="rounded-label border px-3 py-1 font-mono text-[10px] text-muted-foreground">
              QBFT · PERMISSIONED
            </span>
          </div>
        </div>

        {isChainNotConfigured && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-control border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="font-semibold">Jaringan belum tersedia</p>
          </div>
        )}

        <section className="rounded-control border bg-white p-5 sm:p-7" aria-label="Overview">
          <h2 className="mb-3 text-lg font-semibold">Overview</h2>
          {blockQuery.isLoading ? (
            <div aria-busy="true" className="space-y-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-control bg-secondary" />
              ))}
            </div>
          ) : blockQuery.isError || !block ? (
            <div role="alert" className="py-4 text-sm text-muted-foreground">
              <p>
                {isChainNotConfigured
                  ? 'Jaringan belum tersedia'
                  : formatApiError(blockQuery.error).message}
              </p>
              {blockQuery.error?.requestId && (
                <p className="mt-1 font-mono text-[10px]">
                  ID permintaan: {blockQuery.error.requestId}
                </p>
              )}
              <button
                type="button"
                onClick={() => void blockQuery.refetch()}
                className="mt-3 min-h-11 rounded-control border px-4 py-2 text-xs text-primary hover:bg-secondary"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <dl>
              <Row label="Block height">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">{block.number}</span>
                  {block.number > 0 && (
                    <Link
                      aria-label="Blok sebelumnya"
                      href={`/explorer/block/${block.number - 1}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border p-2"
                    >
                      <ChevronLeft size={16} />
                    </Link>
                  )}
                  <Link
                    aria-label="Blok berikutnya"
                    href={`/explorer/block/${block.number + 1}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border p-2"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </Row>
              <Row label="Status">
                <span className="inline-flex items-center gap-1.5 rounded-label bg-secondary px-2.5 py-1 text-xs text-primary">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Finalized · QBFT
                </span>
              </Row>
              <Row label="Timestamp (WITA)">
                <span className="font-mono text-xs">{block.timestampWita} WITA</span>
              </Row>
              <Row label="Timestamp (UTC)">
                <span className="font-mono text-xs">
                  {block.timestamp > 0 ? new Date(block.timestamp * 1000).toISOString() : '—'} UTC
                </span>
              </Row>
              <Row label="Jumlah transaksi">{block.transactionCount} transaksi</Row>
              <Row label="Block proposer (Validator)">
                <Link
                  href={`/explorer/address/${block.proposer}`}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {block.proposer}
                </Link>
              </Row>
              <Row label="Block hash">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs">{block.hash}</code>
                  <button
                    type="button"
                    onClick={() => void copyText(block.hash, 'Block hash')}
                    aria-label="Salin block hash"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border p-2 text-muted-foreground hover:text-primary"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </Row>
              <Row label="Parent hash">
                {block.number > 0 ? (
                  <Link
                    href={`/explorer/block/${block.number - 1}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {block.parentHash}
                  </Link>
                ) : (
                  <code className="font-mono text-xs">{block.parentHash}</code>
                )}
              </Row>
              {copyStatus && (
                <Row label="Info salin">
                  <span role="status" className="text-xs text-muted-foreground">
                    {copyStatus}
                  </span>
                </Row>
              )}
            </dl>
          )}
        </section>
      </main>
    </>
  )
}
