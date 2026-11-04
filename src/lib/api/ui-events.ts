import { create } from 'zustand'

export interface RateLimitToastItem {
  id: string
  retryAfterSeconds: number
  message: string
  createdAt: number
}

export interface UiEventsState {
  mustChangePasswordOpen: boolean
  serviceUnavailable: boolean
  serviceUnavailableRequestId: string | null
  rateLimitToast: RateLimitToastItem | null
  openMustChangePassword: () => void
  closeMustChangePassword: () => void
  setServiceUnavailable: (active: boolean, requestId?: string | null) => void
  showRateLimitToast: (retryAfterSeconds: number | null, message?: string) => void
  dismissRateLimitToast: () => void
  resetUiEvents: () => void
}

export const useUiEventsStore = create<UiEventsState>((set) => ({
  mustChangePasswordOpen: false,
  serviceUnavailable: false,
  serviceUnavailableRequestId: null,
  rateLimitToast: null,
  openMustChangePassword: () => set({ mustChangePasswordOpen: true }),
  closeMustChangePassword: () => set({ mustChangePasswordOpen: false }),
  setServiceUnavailable: (active, requestId = null) =>
    set({
      serviceUnavailable: active,
      serviceUnavailableRequestId: active ? requestId : null,
    }),
  showRateLimitToast: (retryAfterSeconds, customMessage) => {
    const seconds =
      typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.ceil(retryAfterSeconds)
        : 60
    const message =
      customMessage ?? `Terlalu banyak permintaan. Coba lagi dalam ${seconds} detik.`
    set({
      rateLimitToast: {
        id: `${Date.now()}-${seconds}`,
        retryAfterSeconds: seconds,
        message,
        createdAt: Date.now(),
      },
    })
  },
  dismissRateLimitToast: () => set({ rateLimitToast: null }),
  resetUiEvents: () =>
    set({
      mustChangePasswordOpen: false,
      serviceUnavailable: false,
      serviceUnavailableRequestId: null,
      rateLimitToast: null,
    }),
}))

type UnauthorizedHandler = (nextPath: string) => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

export function defaultRedirectToLogin(nextPath: string): void {
  if (typeof window === 'undefined') return
  const target = `/login?next=${encodeURIComponent(nextPath)}`
  window.location.assign(target)
}

export function triggerUnauthorized(currentPath?: string): void {
  const path =
    currentPath ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/dashboard')

  if (path.startsWith('/login')) {
    return
  }

  if (unauthorizedHandler) {
    unauthorizedHandler(path)
    return
  }

  defaultRedirectToLogin(path)
}

