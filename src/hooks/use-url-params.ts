'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

function looksLikeNik(value: string): boolean {
  return value.replace(/\D/g, '').length >= 16
}

/**
 * Reads and updates filter/sort/page state in the URL search params.
 * A value containing 16 consecutive digits (a possible NIK) is never written to the URL.
 */
export function useUrlParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const get = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams])

  const getPage = useCallback(() => {
    const value = Number.parseInt(searchParams.get('page') ?? '1', 10)
    return Number.isFinite(value) && value >= 1 ? value : 1
  }, [searchParams])

  const set = useCallback(
    (updates: Record<string, string | number | null | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        const text = value === null || value === undefined ? '' : String(value)
        if (text === '' || looksLikeNik(text)) {
          next.delete(key)
        } else {
          next.set(key, text)
        }
      }
      if (resetPage && !('page' in updates)) next.delete('page')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return { get, getPage, set }
}
