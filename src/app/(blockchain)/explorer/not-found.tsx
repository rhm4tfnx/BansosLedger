import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ExplorerNotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex max-w-4xl flex-col gap-5 px-5 py-14 sm:px-8"
    >
      <section className="rounded-control border bg-white p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-wider text-primary">404 · Explorer</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Data blockchain tidak ditemukan
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Blok, transaksi, atau alamat yang Anda cari tidak ditemukan pada jaringan BansosLedger.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/explorer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Kembali ke Explorer
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

