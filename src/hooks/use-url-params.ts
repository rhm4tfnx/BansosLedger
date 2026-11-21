'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i
const HEX_HASH_PATTERN = /^0x[a-f0-9]+$/i
// 16+ digits that are consecutive or separated only by spaces/hyphens (e.g. "7301 0112 3456 0001").
const NIK_LIKE_PATTERN = /\d(?:[\s-]*\d){15,}/

/**
 * Returns true when the value resembles a NIK. Hex identifiers (MongoDB ObjectId, 0x hashes)
 * are never treated as NIK even though they may contain many digits mixed with letters.
 */
export function looksLikeNik(value: string): boolean {
  const trimmed = value.trim()
  if (OBJECT_ID_PATTERN.test(trimmed) || HEX_HASH_PATTERN.test(trimmed)) return false
  return NIK_LIKE_PATTERN.test(trimmed)
}

/**
 * Reads and updates filter/sort/page state in the URL search params.
 * A value containing 16 digits (consecutive or separated by spaces/hyphens, a possible NIK)
 * is never written to the URL.
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
