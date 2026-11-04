'use client'

import { formatApiError } from '@/lib/api/errors'
import s from './states.module.css'

/** Tooltip for write actions that are wired in the next integration step. */
export const COMING_SOON_TITLE = 'Segera: tersedia di langkah berikutnya'

export function TableSkeleton({ rows = 5, label = 'Memuat data' }: { rows?: number; label?: string }) {
  return (
    <div className={s.skeletonWrap} role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={s.skeletonRow} />
      ))}
    </div>
  )
}

export function EmptyState({ children }: { children: string }) {
  return <p className={s.empty}>{children}</p>
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const formatted = formatApiError(error)
  return (
    <div className={s.error} role="alert">
      <span>{formatted.message}</span>
      {formatted.requestId && <small>ID permintaan: {formatted.requestId}</small>}
      <button type="button" onClick={onRetry}>
        Coba lagi
      </button>
    </div>
  )
}

export function Pager({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  onPage: (page: number) => void
}) {
  return (
    <nav className={s.pager} aria-label="Paginasi">
      <span>
        {total} data · Halaman {page} dari {Math.max(totalPages, 1)}
      </span>
      <div>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Sebelumnya
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Berikutnya
        </button>
      </div>
    </nav>
  )
}

