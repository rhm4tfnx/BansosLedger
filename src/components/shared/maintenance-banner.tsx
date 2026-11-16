'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'

interface HealthReadyServices {
  mongo?: string
  rpc?: string
  pinata?: string
}

interface HealthReadyPayload {
  status?: string
  services?: HealthReadyServices
}

export interface HealthReadyCheckResult {
  httpStatus: number
  ok: boolean
  services: HealthReadyServices
}

async function fetchHealthReady(signal?: AbortSignal): Promise<HealthReadyCheckResult> {
  const response = await fetch('/api/v1/health/ready', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })
  const payload = (await response.json().catch(() => null)) as HealthReadyPayload | null
  const services =
    payload && typeof payload === 'object' && payload.services && typeof payload.services === 'object'
      ? payload.services
      : {}
  return {
    httpStatus: response.status,
    ok: response.status === 200,
    services,
  }
}

export function MaintenanceBanner() {
  const healthQuery = useQuery<HealthReadyCheckResult>({
    queryKey: ['health', 'ready'],
    queryFn: ({ signal }) => fetchHealthReady(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  })

  const data = healthQuery.data
  const isUnderMaintenance =
    healthQuery.isError ||
    (data !== undefined &&
      (!data.ok ||
        data.httpStatus !== 200 ||
        data.services.mongo === 'unavailable' ||
        data.services.rpc === 'unavailable'))

  if (!isUnderMaintenance) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-center gap-2.5 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-950 sm:text-sm"
    >
      <AlertTriangle className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
      <span>Sistem sedang dalam pemeliharaan. Data terbaru mungkin belum tersedia.</span>
    </div>
  )
}
