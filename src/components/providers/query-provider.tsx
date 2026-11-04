'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AlertTriangle, Clock3, X } from 'lucide-react'
import {
  ApiClientError,
  isStatusQueryKey,
  registerUnauthorizedHandler,
  useUiEventsStore,
} from '@/lib/api'

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
            return false
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: (query) => isStatusQueryKey(query.queryKey),
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export interface QueryProviderProps {
  children: ReactNode
  client?: QueryClient
  onUnauthorizedRedirect?: (targetUrl: string) => void
}

function GlobalApiFeedbackOverlay() {
  const serviceUnavailable = useUiEventsStore((state) => state.serviceUnavailable)
  const serviceUnavailableRequestId = useUiEventsStore(
    (state) => state.serviceUnavailableRequestId,
  )
  const setServiceUnavailable = useUiEventsStore((state) => state.setServiceUnavailable)
  const rateLimitToast = useUiEventsStore((state) => state.rateLimitToast)
  const dismissRateLimitToast = useUiEventsStore((state) => state.dismissRateLimitToast)

  useEffect(() => {
    if (!rateLimitToast) return
    const timer = window.setTimeout(() => {
      dismissRateLimitToast()
    }, 6_000)
    return () => window.clearTimeout(timer)
  }, [rateLimitToast, dismissRateLimitToast])

  return (
    <>
      {serviceUnavailable && (
        <div
          role="alert"
          aria-live="assertive"
          className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
            <span className="font-medium">Layanan sedang tidak tersedia</span>
            {serviceUnavailableRequestId && (
              <small className="font-mono text-xs text-amber-800/80">
                ID: {serviceUnavailableRequestId}
              </small>
            )}
          </div>
          <button
            type="button"
            aria-label="Tutup peringatan layanan"
            onClick={() => setServiceUnavailable(false)}
            className="inline-flex size-7 items-center justify-center rounded-md text-amber-900 hover:bg-amber-100"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {rateLimitToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-2.5 rounded-xl border border-amber-200 bg-white p-3.5 text-sm text-slate-900 shadow-lg ring-1 ring-black/5"
        >
          <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-slate-900">{rateLimitToast.message}</p>
            <small className="text-xs text-slate-500">
              Coba kembali setelah {rateLimitToast.retryAfterSeconds} detik.
            </small>
          </div>
          <button
            type="button"
            aria-label="Tutup pemberitahuan batas permintaan"
            onClick={dismissRateLimitToast}
            className="inline-flex size-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}

export function QueryProvider({
  children,
  client,
  onUnauthorizedRedirect,
}: QueryProviderProps) {
  const [internalClient] = useState(createAppQueryClient)
  const queryClient = client ?? internalClient
  const router = useRouter()

  useEffect(() => {
    registerUnauthorizedHandler((nextPath) => {
      queryClient.clear()
      const targetUrl = `/login?next=${encodeURIComponent(nextPath)}`
      if (onUnauthorizedRedirect) {
        onUnauthorizedRedirect(targetUrl)
      } else {
        router.replace(targetUrl)
      }
    })
    return () => {
      registerUnauthorizedHandler(null)
    }
  }, [queryClient, router, onUnauthorizedRedirect])

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalApiFeedbackOverlay />
      {children}
    </QueryClientProvider>
  )
}

