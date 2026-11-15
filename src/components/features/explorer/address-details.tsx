'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Wallet } from 'lucide-react'
import { SmartBackLink } from '@/components/shared/smart-back-link'
import { useClipboard } from '@/hooks/use-clipboard'
import { formatApiError } from '@/lib/api/errors'
import { useExplorerAddressQuery, useExplorerValidatorsQuery } from '@/lib/api/hooks/explorer'
import { ensureWitaSuffix } from '@/lib/format'

const panel = 'rounded-control border bg-white p-5 sm:p-6'

export interface AddressDetailsProps {
  address: string
}

export function AddressDetails({ address }: AddressDetailsProps) {
  const [page, setPage] = useState(1)
  const { copied, copyText } = useClipboard()
  const addressQuery = useExplorerAddressQuery(address, page, 20)
  const validatorsQuery = useExplorerValidatorsQuery()

  const data = addressQuery.data
  const isChainNotConfigured = addressQuery.error?.code === 'CHAIN_NOT_CONFIGURED'
  const matchedValidator = validatorsQuery.data?.items.find(
    (v) => v.address.toLowerCase() === address.toLowerCase(),
  )

  async function copy() {
    await copyText(
      address,
      'Alamat disalin',
      'Gagal menyalin. Silakan salin alamat secara manual.',
    )
  }

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
          <Link href="/explorer" className="flex items-center gap-3 font-bold">
            <span
              className="relative block w-28 shrink-0 overflow-hidden mix-blend-multiply min-[400px]:w-32 sm:w-36 min-[1025px]:w-40"
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/transparansi"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-primary transition-colors hover:bg-secondary sm:px-3.5 sm:py-2 sm:text-xs"
            >
              Ringkasan publik
            </Link>
            <SmartBackLink
              fallbackHref="/explorer"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border bg-white px-2.5 py-1.5 font-mono text-[11px] font-medium text-primary transition-colors hover:bg-secondary sm:px-3.5 sm:py-2 sm:text-xs"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Explorer
            </SmartBackLink>
          </div>
        </div>
      </header>
      <main
        id="main"
        data-transparency
        className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:px-8"
      >
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap gap-2 text-xs text-muted-foreground"
        >
          <Link href="/explorer" className="text-primary hover:underline">
            Explorer
          </Link>
          <span>/ Detail address /</span>
          <Link href="/transparansi" className="text-primary hover:underline">
            Ringkasan publik
          </Link>
        </nav>

        <div className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Wallet className="size-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Address <span className="text-primary">Details</span>
            </h1>
            {matchedValidator && (
              <span className="rounded-label border bg-secondary px-3 py-1 text-xs text-primary">
                Validator · {matchedValidator.institution}
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <code className="min-w-0 break-all font-mono text-xs sm:text-sm">{address}</code>
            <button
              type="button"
              onClick={() => void copy()}
              aria-label="Salin address"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border bg-white p-2 text-primary"
            >
              <Copy size={15} />
            </button>
            <span role="status" className="text-xs text-muted-foreground">
              {copied}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <section className={panel}>
            <h2 className="mb-3 text-sm font-semibold">Overview</h2>
            <p className="text-[10px] uppercase text-muted-foreground">Institusi / Peran</p>
            <p className="mt-1 text-sm font-semibold">
              {matchedValidator?.institution ?? 'Alamat Jaringan QBFT'}
            </p>
          </section>
          <section className={panel}>
            <h2 className="mb-3 text-sm font-semibold">Ringkasan Aktivitas</h2>
            <p className="text-[10px] uppercase text-muted-foreground">
              Event penyaluran tercatat (recordedBy)
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-primary">
              {data ? data.total.toLocaleString('id-ID') : '—'}
            </p>
          </section>
        </div>

        <section
          className="overflow-hidden rounded-control border bg-white"
          aria-label="Transactions"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <h2 className="text-sm font-semibold">
              Riwayat event penyaluran ({data?.total ?? 0})
            </h2>
          </div>

          {addressQuery.isLoading ? (
            <div aria-busy="true" className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-control bg-secondary" />
              ))}
            </div>
          ) : addressQuery.isError ? (
            <div role="alert" className="p-6 text-sm text-muted-foreground">
              <p>
                {isChainNotConfigured
                  ? 'Jaringan belum tersedia'
                  : formatApiError(addressQuery.error).message}
              </p>
              {addressQuery.error?.requestId && (
                <p className="mt-1 font-mono text-[10px]">
                  ID permintaan: {addressQuery.error.requestId}
                </p>
              )}
              <button
                type="button"
                onClick={() => void addressQuery.refetch()}
                className="mt-3 min-h-11 rounded-control border px-4 py-2 text-xs text-primary hover:bg-secondary"
              >
                Coba lagi
              </button>
            </div>
          ) : !data || data.events.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Belum ada event penyaluran yang dicatat oleh alamat ini.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-xs">
                  <thead className="border-b bg-secondary/30 text-muted-foreground">
                    <tr>
                      {[
                        'Transaction hash',
                        'Ref ID',
                        'Periode',
                        'Nominal',
                        'Waktu (WITA)',
                        'Status',
                      ].map((h) => (
                        <th className="px-5 py-4 font-medium" key={h}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((ev, idx) => (
                      <tr
                        key={`${ev.txHash ?? ev.refId}-${idx}`}
                        className="border-b last:border-0 hover:bg-secondary/20"
                      >
                        <td className="px-5 py-4 font-mono">
                          {ev.txHash ? (
                            <Link
                              className="text-primary hover:underline"
                              href={`/explorer/tx/${ev.txHash}`}
                            >
                              {ev.txHashShort ?? ev.txHash}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-4 font-mono">{ev.refId}</td>
                        <td className="px-5 py-4">{ev.periodLabel}</td>
                        <td className="px-5 py-4 font-mono">{ev.amountFormatted}</td>
                        <td className="px-5 py-4 font-mono">{ensureWitaSuffix(ev.wita)}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 rounded-label bg-secondary px-2 py-1 text-primary">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            Tercatat
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t bg-secondary/20 px-5 py-3 text-xs">
                  <span className="font-mono text-muted-foreground">
                    Halaman {data.page} dari {data.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="min-h-11 rounded-control border bg-white px-4 py-2 font-mono text-primary disabled:opacity-50"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
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
      </main>
    </>
  )
}
