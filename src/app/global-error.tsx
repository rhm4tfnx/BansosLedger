'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body className="bg-background font-sans text-foreground antialiased">
        <main
          id="main"
          role="alert"
          className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-5 px-5 py-14 sm:px-8"
        >
          <section className="rounded-control border bg-white p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-wider text-primary">BansosLedger</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Layanan sedang mengalami gangguan
            </h1>
            <p className="mt-3 text-sm leading-6">
              Maaf, terjadi gangguan saat memuat aplikasi. Silakan coba lagi.
            </p>
            {error?.digest && (
              <p className="mt-2 font-mono text-xs">Kode referensi: {error.digest}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-white"
              >
                Muat ulang
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}

