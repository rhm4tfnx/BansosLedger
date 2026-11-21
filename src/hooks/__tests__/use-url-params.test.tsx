import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { looksLikeNik, useUrlParams } from '@/hooks/use-url-params'

const replaceMock = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/dashboard/penyaluran',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

beforeEach(() => {
  replaceMock.mockReset()
  currentSearch = ''
})

function lastUrl(): string {
  const call = replaceMock.mock.calls.at(-1)
  return typeof call?.[0] === 'string' ? call[0] : ''
}

describe('looksLikeNik', () => {
  it('never treats MongoDB ObjectId or 0x hashes as NIK', () => {
    expect(looksLikeNik('6b01ff82e0194024a0685413')).toBe(false)
    expect(looksLikeNik('6B01FF82E0194024A0685413')).toBe(false)
    expect(looksLikeNik('123456789012345678901234')).toBe(false)
    expect(
      looksLikeNik('0x57ba7fb366702d3f55d3dc63931e0c6bb97e94af89ba8298bc96591afa010014'),
    ).toBe(false)
    expect(looksLikeNik('0x1234567890123456789012345678901234567890')).toBe(false)
  })

  it('detects 16-digit NIK, plain or separated by spaces/hyphens', () => {
    expect(looksLikeNik('7301011234560001')).toBe(true)
    expect(looksLikeNik('7301 0112 3456 0001')).toBe(true)
    expect(looksLikeNik('7301-0112-3456-0001')).toBe(true)
    expect(looksLikeNik(' 7301 - 0112 - 3456 - 0001 ')).toBe(true)
    expect(looksLikeNik('Budi 7301011234560001')).toBe(true)
  })

  it('allows ordinary filter values', () => {
    expect(looksLikeNik('FAILED')).toBe(false)
    expect(looksLikeNik('BLT-UJI')).toBe(false)
    expect(looksLikeNik('202611')).toBe(false)
    expect(looksLikeNik('730101123456000')).toBe(false)
  })
})

describe('useUrlParams().set', () => {
  it('writes a 24-char hex ObjectId id to the URL', () => {
    const { result } = renderHook(() => useUrlParams())
    act(() => {
      result.current.set({ id: '6b01ff82e0194024a0685413' })
    })
    expect(replaceMock).toHaveBeenCalledWith('/dashboard/penyaluran?id=6b01ff82e0194024a0685413', {
      scroll: false,
    })
  })

  it('writes a 0x transaction hash to the URL', () => {
    const hash = '0x57ba7fb366702d3f55d3dc63931e0c6bb97e94af89ba8298bc96591afa010014'
    const { result } = renderHook(() => useUrlParams())
    act(() => {
      result.current.set({ tx: hash })
    })
    expect(new URLSearchParams(lastUrl().split('?')[1]).get('tx')).toBe(hash)
  })

  it.each(['7301011234560001', '7301 0112 3456 0001', '7301-0112-3456-0001'])(
    'blocks NIK-like value "%s" and removes an existing key',
    (nik) => {
      currentSearch = 'q=lama&status=FAILED'
      const { result } = renderHook(() => useUrlParams())
      act(() => {
        result.current.set({ q: nik })
      })
      const url = lastUrl()
      expect(url).toBe('/dashboard/penyaluran?status=FAILED')
      expect(url).not.toContain('7301')
    },
  )
})
