'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, XCircle } from 'lucide-react'
import { formatApiError } from '@/lib/api/errors'
import { useExplorerTxQuery } from '@/lib/api/hooks/explorer'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-4 last:border-0 sm:grid-cols-[240px_1fr]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

const panel = 'rounded-control border bg-white p-5 sm:p-7'

export interface TransactionDetailsProps {
  txHash: string
}

export function TransactionDetails({ txHash }: TransactionDetailsProps) {
  const [copyStatus, setCopyStatus] = useState('')
  const txQuery = useExplorerTxQuery(txHash)
  const tx = txQuery.data
  const isChainNotConfigured = txQuery.error?.code === 'CHAIN_NOT_CONFIGURED'

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(tx?.txHash ?? txHash)
      setCopyStatus('Hash disalin')
    } catch {
      setCopyStatus('Gagal menyalin. Silakan salin hash secara manual.')
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
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap gap-2 text-xs text-muted-foreground"
          >
            <Link href="/explorer" className="text-primary hover:underline">
              Explorer
            </Link>
            <span>/ Detail transaksi /</span>
            <Link href="/transparansi" className="text-primary hover:underline">
              Ringkasan publik
            </Link>
          </nav>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Transaction <span className="text-primary">Details</span>
            </h1>
            {tx && (
              <span className="flex items-center gap-2 rounded-label border bg-secondary px-3 py-1.5 text-xs text-primary">
                {tx.status === 'SUCCESS' ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <XCircle size={14} aria-hidden="true" />
                )}
                {tx.statusLabel}
              </span>
            )}
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

        {txQuery.isLoading ? (
          <section aria-busy="true" className={panel}>
            <div className="space-y-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-control bg-secondary" />
              ))}
            </div>
          </section>
        ) : txQuery.isError || !tx ? (
          <section role="alert" className={panel}>
            <p className="text-sm text-muted-foreground">
              {isChainNotConfigured
                ? 'Jaringan belum tersedia'
                : formatApiError(txQuery.error).message}
            </p>
            {txQuery.error?.requestId && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                ID permintaan: {txQuery.error.requestId}
              </p>
            )}
            <button
              type="button"
              onClick={() => void txQuery.refetch()}
              className="mt-3 min-h-11 rounded-control border px-4 py-2 text-xs text-primary hover:bg-secondary"
            >
              Coba lagi
            </button>
          </section>
        ) : (
          <>
            <section className={panel} aria-label="Overview">
              <dl>
                <Row label="Transaction hash">
                  <div className="flex items-start gap-3">
                    <code className="min-w-0 font-mono text-xs">{tx.txHash}</code>
                    <button
                      type="button"
                      onClick={() => void copyHash()}
                      aria-label="Salin transaction hash"
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control border p-2 text-muted-foreground hover:text-primary"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <span role="status" className="text-xs text-muted-foreground">
                    {copyStatus}
                  </span>
                </Row>
                <Row label="Status">
                  <span className="inline-flex items-center gap-1.5 rounded-label bg-secondary px-2.5 py-1 text-xs text-primary">
                    {tx.status === 'SUCCESS' ? (
                      <CheckCircle2 size={13} aria-hidden="true" />
                    ) : (
                      <XCircle size={13} aria-hidden="true" />
                    )}
                    {tx.statusLabel} ({tx.status})
                  </span>
                </Row>
                <Row label="Block">
                  <Link
                    href={`/explorer/block/${tx.blockNumber}`}
                    className="font-mono text-primary underline underline-offset-4"
                  >
                    #{tx.blockNumber}
                  </Link>
                  <span className="ml-3 rounded-label border px-2 py-1 text-[10px] text-muted-foreground">
                    QBFT · Finalized
                  </span>
                </Row>
                <Row label="Timestamp">
                  <p className="font-mono text-xs">{tx.wita} WITA</p>
                  <p className="font-mono text-xs text-muted-foreground">{tx.utc} UTC</p>
                </Row>
                <Row label="Otoritas pengirim (From)">
                  <Link
                    href={`/explorer/address/${tx.from}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {tx.from}
                  </Link>
                </Row>
                <Row label="Kontrak validasi (To)">
                  <Link
                    href="/explorer/contract"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {tx.to}
                  </Link>
                </Row>
              </dl>
            </section>

            <section className={panel} aria-label="Decoded DisbursementRecorded events">
              <h2 className="mb-4 text-sm font-semibold">
                Data penyaluran terdekode ({tx.events.length} event)
              </h2>
              {tx.events.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Tidak ada event DisbursementRecorded pada transaksi ini.
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {tx.events.map((ev, idx) => {
                    const isWithdrawn =
                      Boolean(ev.cid) &&
                      (!ev.gatewayUrl ||
                        ev.cid.toUpperCase().includes('WITHDRAWN') ||
                        ev.cid.toUpperCase().includes('DITARIK'))

                    return (
                      <div
                        key={`${ev.refId}-${idx}`}
                        className="rounded-control border bg-secondary/20 p-4"
                      >
                        <p className="mb-2 font-mono text-xs font-semibold text-primary">
                          Event #{idx + 1}: DisbursementRecorded
                        </p>
                        <dl>
                          <Row label="Program ID">
                            <code className="font-mono text-xs">{ev.programId}</code>
                          </Row>
                          <Row label="Periode">{ev.periodLabel}</Row>
                          <Row label="Nominal bantuan">
                            <span className="font-mono font-semibold">{ev.amountFormatted}</span>
                          </Row>
                          <Row label="Commitment penerima">
                            <code className="font-mono text-xs">{ev.commitment}</code>
                          </Row>
                          <Row label="Reference ID (refId)">
                            <code className="font-mono text-xs">{ev.refId}</code>
                          </Row>
                          <Row label="Dicatat oleh (recordedBy)">
                            <Link
                              href={`/explorer/address/${ev.recordedBy}`}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {ev.recordedBy}
                            </Link>
                          </Row>
                          <Row label="Waktu pencatatan">
                            <p className="font-mono text-xs">{ev.wita ?? tx.wita} WITA</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {ev.utc ?? tx.utc} UTC
                            </p>
                          </Row>
                          <Row label="Bukti digital (IPFS CID)">
                            {isWithdrawn && (
                              <span className="mr-3 inline-block rounded-label border px-2 py-1 font-mono text-xs font-semibold">
                                DITARIK
                              </span>
                            )}
                            {ev.gatewayUrl && !isWithdrawn ? (
                              <a
                                href={ev.gatewayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all font-mono text-xs text-primary underline"
                              >
                                {ev.cid}
                              </a>
                            ) : ev.cid ? (
                              <code className="font-mono text-xs text-muted-foreground">
                                {ev.cid}
                              </code>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Tidak ada CID bukti.
                              </span>
                            )}
                          </Row>
                        </dl>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
