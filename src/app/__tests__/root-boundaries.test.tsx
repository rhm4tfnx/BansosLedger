import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RootError from '@/app/error'
import GlobalError from '@/app/global-error'
import RootNotFound from '@/app/not-found'

describe('Root error boundaries — error.tsx, global-error.tsx, not-found.tsx', () => {
  it('renders RootError with Indonesian message and digest without leaking error.message or stack', async () => {
    const resetMock = vi.fn()
    const sensitiveError = Object.assign(new Error('SECRET_INTERNAL_STACK_TRACE_DETAIL'), {
      digest: 'ERR-DIGEST-101',
    })

    render(<RootError error={sensitiveError} reset={resetMock} />)

    expect(screen.getByText(/Terjadi kesalahan pada layanan/i)).toBeInTheDocument()
    expect(screen.getByText(/ERR-DIGEST-101/)).toBeInTheDocument()
    expect(screen.queryByText(/SECRET_INTERNAL_STACK_TRACE_DETAIL/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Coba lagi/i }))
    expect(resetMock).toHaveBeenCalledTimes(1)
  })

  it('renders GlobalError without leaking internal error message', async () => {
    const resetMock = vi.fn()
    const sensitiveError = Object.assign(new Error('DB_CONNECTION_STRING_LEAK'), {
      digest: 'GLOBAL-DIGEST-202',
    })

    render(<GlobalError error={sensitiveError} reset={resetMock} />)

    expect(screen.getByText(/Layanan sedang mengalami gangguan/i)).toBeInTheDocument()
    expect(screen.getByText(/GLOBAL-DIGEST-202/)).toBeInTheDocument()
    expect(screen.queryByText(/DB_CONNECTION_STRING_LEAK/)).not.toBeInTheDocument()
  })

  it('renders RootNotFound with links to home and transparency portal', () => {
    render(<RootNotFound />)

    expect(screen.getByText(/Halaman tidak ditemukan/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ke beranda utama/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /Portal transparansi/i })).toHaveAttribute(
      'href',
      '/transparansi',
    )
  })
})

