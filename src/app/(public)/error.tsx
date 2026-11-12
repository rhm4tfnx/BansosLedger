'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SiteHeader } from '@/components/features/navigation/site-header'
import { SiteFooter } from '@/components/features/navigation/site-footer'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        role="alert"
        className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-14 sm:px-8"
      >
        <section className="rounded-control border bg-surface p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">
            Layanan publik
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Data sementara tidak tersedia
          </h1>
          <p className="mt-3 text-sm leading-6 text-body-copy">
            Maaf, informasi publik sedang tidak dapat dimuat saat ini. Silakan coba muat ulang
            beberapa saat lagi.
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
              href="/transparansi"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border bg-white px-5 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Kembali ke ringkasan publik
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

