import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SiteHeader } from '@/components/features/navigation/site-header'
import { SiteFooter } from '@/components/features/navigation/site-footer'

export default function PublicNotFound() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-14 sm:px-8"
      >
        <section className="rounded-control border bg-surface p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">404</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Halaman atau data tidak ditemukan
          </h1>
          <p className="mt-3 text-sm leading-6 text-body-copy">
            Program atau halaman publik yang Anda cari tidak tersedia atau belum dipublikasikan.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/transparansi"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Kembali ke ringkasan publik
            </Link>
            <Link
              href="/program"
              className="inline-flex min-h-11 items-center justify-center rounded-control border bg-white px-5 py-2.5 text-sm font-medium text-primary hover:bg-secondary"
            >
              Lihat daftar program
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

