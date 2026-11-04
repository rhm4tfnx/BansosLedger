'use client'

import type { ReactNode } from 'react'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

export interface StateBoundaryProps {
  isLoading?: boolean
  error?: unknown
  isEmpty?: boolean
  onRetry?: () => void
  loadingRows?: number
  loadingLabel?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  className?: string
  children?: ReactNode
}

export function StateBoundary({
  isLoading = false,
  error = null,
  isEmpty = false,
  onRetry,
  loadingRows = 4,
  loadingLabel = 'Memuat data…',
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Data yang Anda cari belum tersedia atau tidak sesuai filter.',
  emptyAction,
  className,
  children,
}: StateBoundaryProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn('grid gap-3 rounded-xl border bg-card p-5', className)}
      >
        <span className="sr-only">{loadingLabel}</span>
        {Array.from({ length: Math.max(1, loadingRows) }, (_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-lg bg-muted/80"
          />
        ))}
      </div>
    )
  }

  if (error) {
    const formatted = formatApiError(error)
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          'flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-5 text-sm text-red-950',
          className,
        )}
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-700" aria-hidden="true" />
          <div className="grid gap-1">
            <p className="font-medium text-red-950">{formatted.message}</p>
            {formatted.requestId && (
              <small className="font-mono text-xs text-red-800/80">
                ID Permintaan: {formatted.requestId}
              </small>
            )}
          </div>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="min-h-11 gap-1.5 border-red-300 bg-white text-red-950 hover:bg-red-100 sm:min-h-8"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Coba lagi
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div
        role="status"
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center text-sm',
          className,
        )}
      >
        <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium text-foreground">{emptyTitle}</p>
        <p className="max-w-md text-xs text-muted-foreground">{emptyDescription}</p>
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    )
  }

  return <>{children}</>
}

