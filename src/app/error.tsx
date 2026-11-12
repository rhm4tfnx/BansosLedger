'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main
      id="main"
      role="alert"
      className="mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center gap-5 px-5 py-14 sm:px-8"
    >
      <section className="rounded-control border bg-surface p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">BansosLedger</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Terjadi kesalahan pada layanan
        </h1>
        <p className="mt-3 text-sm leading-6 text-body-copy">
          Maaf, permintaan Anda tidak dapat diproses saat ini. Silakan muat ulang halaman atau coba
          beberapa saat lagi.
        </p>
        {error?.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Kode referensi: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border bg-white px-5 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </main>
  )
}

