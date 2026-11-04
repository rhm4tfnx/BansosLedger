export default function ExplorerLoading() {
  return (
    <main
      id="main"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8"
    >
      <div className="h-8 w-56 animate-pulse rounded-control bg-secondary" />
      <div className="h-12 w-full max-w-3xl animate-pulse rounded-control bg-secondary" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-control border bg-white p-6" />
        <div className="h-72 animate-pulse rounded-control border bg-white p-6" />
      </div>
      <span className="sr-only">Memuat Block Explorer…</span>
    </main>
  )
}

