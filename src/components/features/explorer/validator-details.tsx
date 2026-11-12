'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { formatApiError } from '@/lib/api/errors'
import { useExplorerValidatorsQuery } from '@/lib/api/hooks/explorer'

export function ValidatorDetails() {
  const validatorsQuery = useExplorerValidatorsQuery()
  const isChainNotConfigured = validatorsQuery.error?.code === 'CHAIN_NOT_CONFIGURED'
  const validators = validatorsQuery.data?.items ?? []
  const count = validatorsQuery.data?.count ?? null

  return (
    <main
      id="main"
      data-transparency
      className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:px-8"
    >
      <nav
        aria-label="Navigasi explorer"
        className="flex flex-wrap items-center gap-2.5 sm:gap-3"
      >
        <Link
          href="/transparansi"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Kembali ke ringkasan publik
        </Link>
        <Link
          href="/explorer"
          className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
        >
          Explorer
        </Link>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight">Validator jaringan</h1>
      <p className="text-xs text-muted-foreground">
        Daftar validator institusional pada jaringan konsorsium QBFT BansosLedger (jumlah aktif:{' '}
        {count != null ? count : '-'}).
      </p>

      {isChainNotConfigured && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-control border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="font-semibold">Jaringan belum tersedia</p>
        </div>
      )}

      <section className="rounded-control border bg-white p-5 sm:p-7">
        {validatorsQuery.isLoading ? (
          <div aria-busy="true" className="space-y-3 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-control bg-secondary" />
            ))}
          </div>
        ) : validatorsQuery.isError ? (
          <div role="alert" className="py-4 text-sm text-muted-foreground">
            <p>
              {isChainNotConfigured
                ? 'Jaringan belum tersedia'
                : formatApiError(validatorsQuery.error).message}
            </p>
            {validatorsQuery.error?.requestId && (
              <p className="mt-1 font-mono text-[10px]">
                ID permintaan: {validatorsQuery.error.requestId}
              </p>
            )}
            <button
              type="button"
              onClick={() => void validatorsQuery.refetch()}
              className="mt-3 min-h-11 rounded-control border px-4 py-2 text-xs text-primary hover:bg-secondary"
            >
              Coba lagi
            </button>
          </div>
        ) : validators.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Daftar alamat validator belum diekspos oleh node RPC publik.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b p-4">Institusi Validator</th>
                  <th className="border-b p-4">Alamat</th>
                </tr>
              </thead>
              <tbody>
                {validators.map((v) => (
                  <tr key={v.address}>
                    <td className="border-b p-4 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <ShieldCheck size={15} className="text-primary" aria-hidden="true" />
                        {v.institution}
                      </span>
                    </td>
                    <td className="border-b p-4 font-mono text-xs">
                      <Link
                        href={`/explorer/address/${v.address}`}
                        className="text-primary underline"
                      >
                        {v.address}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
