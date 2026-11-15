'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { SmartBackLink } from '@/components/shared/smart-back-link'
import { usePublicProgramDetailQuery, usePublicProgramsQuery } from '@/lib/api/hooks/public'
import { ensureWitaSuffix } from '@/lib/format'
import type {
  PaginatedResult,
  PublicProgramDetailViewModel,
  PublicProgramViewModel,
} from '@/types'
import { PublicShell, publicPanel } from './public-shell'

export interface PublicProgramsProps {
  initialPage?: number
  initialData?: PaginatedResult<PublicProgramViewModel>
  unavailable?: boolean
}

export function PublicPrograms({
  initialPage = 1,
  initialData,
  unavailable = false,
}: PublicProgramsProps = {}) {
  const [page, setPage] = useState(initialPage)
  const query = usePublicProgramsQuery({
    page,
    limit: 20,
    enabled: !unavailable || page !== initialPage,
    initialData: page === initialPage ? initialData : undefined,
  })

  const data = query.data ?? (page === initialPage ? initialData : undefined)
  const isUnavailable = (unavailable && !data) || (query.isError && !data)

  return (
    <PublicShell title="Program bantuan sosial">
      <section className={publicPanel}>
        {isUnavailable ? (
          <div role="status" className="py-6 text-sm text-muted-foreground">
            Data sementara tidak tersedia
          </div>
        ) : query.isLoading && !data ? (
          <div aria-busy="true" className="space-y-3 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-control bg-secondary" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Belum ada program publik yang tersedia.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      'Nama',
                      'Kode',
                      'Jenis / Sumber Dana',
                      'Periode',
                      'Nominal per penerima',
                      'Pagu',
                      'Status',
                    ].map((h) => (
                      <th key={h} className="border-b p-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.code}>
                      <td className="border-b p-4 font-medium">
                        <Link
                          className="text-primary underline"
                          href={`/program/${encodeURIComponent(p.code)}`}
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="border-b p-4 font-mono text-xs">{p.code}</td>
                      <td className="border-b p-4 text-xs">
                        {p.kindLabel} · {p.fundSource}
                      </td>
                      <td className="border-b p-4">{p.periodRangeLabel}</td>
                      <td className="border-b p-4 font-mono text-xs">
                        {p.amountPerRecipientFormatted}
                      </td>
                      <td className="border-b p-4 font-mono text-xs">{p.totalBudgetFormatted}</td>
                      <td className="border-b p-4">
                        <span className="inline-flex items-center gap-1 rounded-label bg-secondary px-2.5 py-1 text-xs text-primary">
                          <CheckCircle2 size={12} aria-hidden="true" />
                          {p.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 pt-2 text-xs">
                <span className="text-muted-foreground">
                  Halaman {data.page} dari {data.totalPages} ({data.total} program)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((curr) => Math.max(1, curr - 1))}
                    className="min-h-11 rounded-control border px-4 py-2 text-primary disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((curr) => curr + 1)}
                    className="min-h-11 rounded-control border px-4 py-2 text-primary disabled:opacity-50"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </PublicShell>
  )
}

export interface PublicProgramDetailProps {
  code: string
  initialPage?: number
  initialData?: PublicProgramDetailViewModel
  unavailable?: boolean
}

export function PublicProgramDetail({
  code,
  initialPage = 1,
  initialData,
  unavailable = false,
}: PublicProgramDetailProps) {
  const [page, setPage] = useState(initialPage)
  const query = usePublicProgramDetailQuery(code, page, 20, {
    enabled: !unavailable || page !== initialPage,
    initialData: page === initialPage ? initialData : undefined,
  })

  const data = query.data ?? (page === initialPage ? initialData : undefined)
  const isUnavailable = (unavailable && !data) || (query.isError && !data)

  if (isUnavailable) {
    return (
      <PublicShell title={`Program ${code}`}>
        <section role="status" className={publicPanel}>
          <p className="font-semibold text-primary">Data sementara tidak tersedia</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Informasi detail program dan buku besar penyaluran sedang tidak dapat dimuat saat ini.
          </p>
        </section>
      </PublicShell>
    )
  }

  if (query.isLoading && !data) {
    return (
      <PublicShell title={`Program ${code}`}>
        <section aria-busy="true" className={publicPanel}>
          <div className="h-32 animate-pulse rounded-control bg-secondary" />
        </section>
      </PublicShell>
    )
  }

  const p = data?.program
  const ledger = data?.ledger

  return (
    <PublicShell title={p?.name ?? code}>
      <section className={publicPanel}>
        <SmartBackLink
          fallbackHref="/program"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border bg-white px-4 py-2.5 font-mono text-xs font-medium text-primary transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Semua program
        </SmartBackLink>
        {p && (
          <>
            {p.description && (
              <p className="mt-4 text-sm text-muted-foreground">{p.description}</p>
            )}
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ['Kode', p.code],
                ['Jenis & Sumber Dana', `${p.kindLabel} · ${p.fundSource}`],
                ['Periode', p.periodRangeLabel],
                ['Nominal per penerima', p.amountPerRecipientFormatted],
                ['Pagu', p.totalBudgetFormatted],
                ['Status', p.statusLabel],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-2 text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>

      <section className={publicPanel}>
        <h2 className="font-semibold">Ledger transaksi SUCCESS</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Daftar transaksi penyaluran terkonfirmasi on-chain tanpa identitas pribadi penerima.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {['TxHash', 'Periode', 'Nominal', 'Waktu WITA'].map((label) => (
                  <th key={label} className="border-b p-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger?.items.map((t, idx) => (
                <tr key={t.txHash ?? `${t.periodId}-${idx}`}>
                  <td className="border-b p-4">
                    {t.txHash ? (
                      <Link
                        href={`/explorer/tx/${t.txHash}`}
                        className="break-all font-mono text-xs text-primary underline"
                      >
                        {t.txHash}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="border-b p-4">{t.periodLabel}</td>
                  <td className="border-b p-4 font-mono text-xs">{t.amountFormatted}</td>
                  <td className="border-b p-4 font-mono text-xs">{ensureWitaSuffix(t.timeWita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!ledger || ledger.items.length === 0) && (
          <p className="mt-4 text-sm text-muted-foreground">
            Belum ada transaksi SUCCESS yang tercatat untuk program ini.
          </p>
        )}
        {ledger && ledger.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 pt-2 text-xs">
            <span className="text-muted-foreground">
              Halaman {ledger.page} dari {ledger.totalPages} ({ledger.total} transaksi)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((curr) => Math.max(1, curr - 1))}
                className="min-h-11 rounded-control border px-4 py-2 text-primary disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= ledger.totalPages}
                onClick={() => setPage((curr) => curr + 1)}
                className="min-h-11 rounded-control border px-4 py-2 text-primary disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  )
}
