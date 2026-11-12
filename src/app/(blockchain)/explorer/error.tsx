'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ExplorerError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main
      id="main"
      role="alert"
      className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-14 sm:px-8"
    >
      <section className="rounded-control border bg-white p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">Block Explorer</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Data sementara tidak tersedia
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Maaf, data blok atau transaksi pada jaringan sedang tidak dapat dimuat saat ini.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Coba lagi
          </button>
          <Link
            href="/explorer"
            className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-5 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
          >
            Ke beranda Explorer
          </Link>
          <Link
            href="/transparansi"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border bg-white px-5 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Kembali ke ringkasan publik
          </Link>
        </div>
      </section>
    </main>
  )
}

