'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Clock, Copy, ShieldCheck } from 'lucide-react'
import { formatApiError } from '@/lib/api/errors'
import { usePublicStatusCheckMutation } from '@/lib/api/hooks/public'
import type { PublicStatusEntryViewModel } from '@/types'
import { TurnstileWidget } from './turnstile-widget'

interface VerifiedResult {
  name: string
  entries: PublicStatusEntryViewModel[]
}

export function CekBansos() {
  const [nik, setNik] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [error, setError] = useState('')
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null)
  const [copiedTx, setCopiedTx] = useState<string | null>(null)
  const [checked, setChecked] = useState<{ nik: string; result: VerifiedResult | null } | null>(
    null,
  )
  const submitting = useRef(false)
  const resultSectionRef = useRef<HTMLElement | null>(null)
  const statusCheckMutation = usePublicStatusCheckMutation()
  const loading = statusCheckMutation.isPending

  function scrollToResultSection() {
    const run = () => {
      resultSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(run)
    } else {
      setTimeout(run, 0)
    }
  }

  function handleNikChange(value: string) {
    const normalizedNik = value.replace(/\D/g, '').slice(0, 16)
    setNik(normalizedNik)
    setError('')
    setErrorRequestId(null)
  }

  async function handleCopyTxHash(txHash: string) {
    try {
      await navigator.clipboard.writeText(txHash)
      setCopiedTx(txHash)
      setTimeout(() => setCopiedTx((curr) => (curr === txHash ? null : curr)), 2000)
    } catch {
      // Ignore clipboard failure
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || loading) return

    if (!/^\d{16}$/.test(nik)) {
      setChecked(null)
      setError('NIK harus terdiri dari 16 digit angka.')
      setErrorRequestId(null)
      return
    }
    if (!turnstileToken) {
      setError('Selesaikan verifikasi CAPTCHA terlebih dahulu.')
      setErrorRequestId(null)
      return
    }

    const submittedNik = nik
    submitting.current = true
    setError('')
    setErrorRequestId(null)
    setChecked(null)

    try {
      const response = await statusCheckMutation.mutateAsync({
        nik: submittedNik,
        turnstileToken,
      })

      if (!response.found) {
        setChecked({ nik: submittedNik, result: null })
        setError('Data tidak ditemukan.')
      } else {
        const displayEntries: PublicStatusEntryViewModel[] = response.entries.length
          ? response.entries
          : [
              {
                programCode: '—',
                programName: '—',
                periodId: 0,
                periodLabel: '—',
                amount: 0,
                amountFormatted: '—',
                status: 'BELUM_DISALURKAN',
                statusLabel: 'Belum disalurkan',
                txHash: null,
                txHashShort: '—',
              },
            ]
        setChecked({
          nik: submittedNik,
          result: {
            name: response.name,
            entries: displayEntries,
          },
        })
      }
    } catch (err) {
      const formatted = formatApiError(err)
      const message = formatted.retryAfter
        ? `${formatted.message} Coba lagi dalam ${formatted.retryAfter} detik.`
        : formatted.message
      setError(message)
      setErrorRequestId(formatted.requestId)
    } finally {
      submitting.current = false
      scrollToResultSection()
    }
  }

  return (
    <section id="cek-bansos" className="border-b">
      <div className="mx-auto w-[calc(100%-40px)] max-w-7xl py-10 min-[641px]:w-[calc(100%-48px)] min-[641px]:py-14 min-[769px]:w-[calc(100%-64px)] min-[1025px]:w-[calc(100%-112px)] min-[1025px]:py-16">
        <header className="flex flex-col gap-5 border-b pb-7 min-[769px]:flex-row min-[769px]:items-end min-[769px]:justify-between">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary-hover">
              Layanan publik / verifikasi
            </p>
            <h1 className="font-sans text-4xl font-medium tracking-tight min-[641px]:text-5xl">
              cek-bansos/
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-sm leading-6 text-body-copy">
              Verifikasi status penerima bantuan sosial masyarakat secara mandiri. NIK dikirim
              secara aman dan tidak pernah disimpan di alamat halaman (URL).
            </p>
          </div>
          <div className="node-indicator inline-flex items-center gap-2 self-start border border-primary/30 bg-surface px-4 py-3 font-mono text-xs text-primary-hover min-[769px]:self-auto">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Jaringan aktif · QBFT
          </div>
        </header>

        <form
          method="post"
          onSubmit={handleSubmit}
          className="mt-8 border bg-surface p-5 min-[641px]:p-7"
        >
          <label htmlFor="nik" className="mb-3 block font-sans text-sm font-medium">
            Nomor Induk Kependudukan (NIK)
          </label>
          <div className="flex flex-col gap-3 min-[641px]:flex-row">
            <input
              id="nik"
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              value={nik}
              onChange={(event) => handleNikChange(event.target.value)}
              aria-invalid={Boolean(error)}
              placeholder="Masukkan 16 digit NIK"
              aria-describedby={error ? 'nik-error' : 'nik-help'}
              className="min-h-11 min-w-0 flex-1 border bg-background px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
          <div className="mt-3 flex flex-col gap-3 min-[641px]:flex-row">
            <button
              type="submit"
              disabled={!turnstileToken || loading}
              className="min-h-11 bg-primary px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Memeriksa…' : 'Cek Status'}
            </button>
          </div>
          {error ? (
            <div id="nik-error" role="alert" className="mt-3">
              <p className="font-mono text-xs text-red-700">{error}</p>
              {errorRequestId && (
                <p className="mt-1 font-mono text-[10px] text-body-copy">
                  ID permintaan: {errorRequestId}
                </p>
              )}
            </div>
          ) : (
            <p id="nik-help" className="mt-3 font-mono text-xs text-body-copy">
              Gunakan NIK 16 digit yang terdaftar di Kelurahan Takkalasi.
            </p>
          )}
          <p aria-live="polite" className="sr-only">
            {loading
              ? 'Memeriksa…'
              : error || (checked?.result ? 'Hasil verifikasi tersedia.' : '')}
          </p>
        </form>
        <p className="mt-3 font-mono text-xs text-body-copy">
          Hasil menampilkan NIK yang Anda ketik, nama lengkap, program, periode, nominal, status,
          dan TxHash. Alamat dan nomor telepon tidak pernah ditampilkan.
        </p>

        <div className="mt-4">
          <Link
            href="/cara-verifikasi"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border bg-surface px-4 py-2.5 font-mono text-xs font-medium text-primary-hover transition-colors hover:bg-secondary"
          >
            Cara memeriksa transaksi
          </Link>
        </div>

        <section
          ref={resultSectionRef}
          aria-labelledby="hasil-verifikasi"
          className="mt-8 scroll-mt-24"
        >
          <h2 id="hasil-verifikasi" className="mb-5 font-sans text-2xl font-medium tracking-tight">
            hasil-verifikasi/
          </h2>
          {checked?.result ? (
            <div data-reveal className="border bg-surface p-5 min-[641px]:p-8">
              <div className="grid gap-7 min-[769px]:grid-cols-2 min-[769px]:gap-x-12 min-[769px]:gap-y-8">
                <Info label="Nama penerima" value={checked.result.name} emphasis />
                <Info label="NIK" value={checked.nik} mono />
                {checked.result.entries.map((entry, index) => (
                  <div
                    key={`${entry.programCode}-${entry.periodId}-${index}`}
                    className="grid gap-7 min-[769px]:col-span-2 min-[769px]:grid-cols-2 min-[769px]:gap-x-12 min-[769px]:gap-y-8"
                  >
                    <Info label="Program bantuan" value={entry.programName} />
                    <Info label="Periode" value={entry.periodLabel} />
                    <Info label="Nominal bantuan" value={entry.amountFormatted} mono />
                    <Info
                      label="Status penyaluran"
                      value={entry.statusLabel}
                      badge
                      status={entry.status}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-7 border p-3 font-mono text-xs text-body-copy">
                Jangan bagikan tangkapan layar halaman ini karena memuat NIK dan nama lengkap.
              </p>
              <div className="mt-8 border-t pt-7">
                <p className="mb-3 font-mono text-xs uppercase tracking-wide text-body-copy">
                  Blockchain audit trail (txid)
                </p>
                {checked.result.entries.map((entry, index) => (
                  <div
                    key={`${entry.programCode}-${entry.periodId}-tx-${index}`}
                    className="flex flex-col gap-3 border bg-background px-3 py-3 min-[641px]:flex-row min-[641px]:items-center min-[641px]:justify-between"
                  >
                    <code className="break-all font-mono text-[10px] text-primary-hover">
                      {entry.txHash || 'Belum ada transaksi'}
                    </code>
                    {entry.txHash && (
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleCopyTxHash(entry.txHash!)}
                          aria-label={`Salin TxHash ${entry.txHashShort}`}
                          className="inline-flex min-h-11 items-center gap-1 font-mono text-xs text-primary-hover hover:underline"
                        >
                          <Copy aria-hidden="true" className="size-3" />
                          {copiedTx === entry.txHash ? 'Tersalin' : 'Salin'}
                        </button>
                        <Link
                          prefetch={false}
                          href={`/explorer/tx/${entry.txHash}`}
                          className="inline-flex min-h-11 shrink-0 items-center gap-1 font-mono text-xs text-primary-hover hover:underline"
                        >
                          Lihat di Explorer <ArrowUpRight aria-hidden="true" className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div key="empty" data-reveal className="border border-dashed bg-surface p-8 text-center">
              <CheckCircle2 aria-hidden="true" className="mx-auto mb-4 size-8 text-primary-hover" />
              <p className="font-sans text-lg">Belum ada hasil verifikasi</p>
              <p className="mx-auto mt-2 max-w-md font-mono text-xs leading-6 text-body-copy">
                Masukkan NIK 16 digit untuk menampilkan status bantuan sosial Anda.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function Info({
  label,
  value,
  emphasis,
  mono,
  badge,
  status,
}: {
  label: string
  value: string
  emphasis?: boolean
  mono?: boolean
  badge?: boolean
  status?: string
}) {
  const isDelivered = status === 'SUDAH_DISALURKAN' || value === 'Sudah disalurkan'
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-body-copy">{label}</p>
      {badge ? (
        <span className="inline-flex items-center gap-1.5 rounded-label bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase text-primary-hover">
          {isDelivered ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
          ) : (
            <Clock aria-hidden="true" className="size-3.5" />
          )}
          {value}
        </span>
      ) : (
        <p
          className={`${emphasis ? 'text-xl' : 'text-sm'} ${mono ? 'font-mono' : 'font-sans'} leading-6`}
        >
          {value}
        </p>
      )}
    </div>
  )
}
