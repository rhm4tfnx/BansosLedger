import { SiteHeader } from '@/components/features/navigation/site-header'
import { SiteFooter } from '@/components/features/navigation/site-footer'

export default function PublicLoading() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        aria-busy="true"
        aria-live="polite"
        className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 sm:py-12"
      >
        <div className="h-8 w-64 animate-pulse rounded-control bg-secondary" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-control bg-secondary" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-control border bg-surface p-5" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-control border bg-surface p-6" />
        <span className="sr-only">Memuat data publik…</span>
      </main>
      <SiteFooter />
    </>
  )
}

