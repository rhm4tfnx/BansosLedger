'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { formatPeriod } from '@/lib/utils'
import { TurnstileWidget } from './turnstile-widget'
import { ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react'

import { initialRecipients } from '@/mocks/recipient-data'
import { initialRows } from '@/mocks/disbursement-data'

type StatusEntry = { program: string; period: string; status: 'Sudah disalurkan' | 'Belum disalurkan'; txHash?: string }
type StatusResult = { name: string; entries: StatusEntry[] }

// TODO(PRD FR-PUB-04): replace with POST /api/v1/public/status-check (NIK in the JSON body, never in the URL)
function lookupStatus(nik: string): StatusResult | null {
  const recipient = initialRecipients.find(r => r.nik === nik && r.status === 'FINAL' && !r.deleted)
  if (!recipient) return null
  const entries: StatusEntry[] = initialRows
    .filter(row => row.recipient === recipient.id && row.status === 'SUCCESS')
    .slice(0, 10)
    .map(row => ({ program: row.program, period: row.period || formatPeriod(row.periodId), status: 'Sudah disalurkan', txHash: row.hash }))
  return { name: recipient.name, entries: entries.length ? entries : [{ program: '—', period: '—', status: 'Belum disalurkan' }] }
}

let sessionAttempts: number[] = []
function consumeAttempt() {
  const now = Date.now()
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem('status-check-attempts') || '[]')
    if (Array.isArray(saved)) sessionAttempts = saved.filter((t): t is number => typeof t === 'number' && Number.isFinite(t))
  } catch { /* Storage may be blocked; retain the in-memory session limit. */ }
  sessionAttempts = sessionAttempts.filter(t => t > now - 600000)
  if (sessionAttempts.length >= 5) return false
  sessionAttempts.push(now)
  try { sessionStorage.setItem('status-check-attempts', JSON.stringify(sessionAttempts)) } catch { /* Only attempt timestamps are persisted, never input or results. */ }
  return true
}

export function CekBansos() {
  const [nik, setNik] = useState('')
  const [captchaOk, setCaptchaOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState<{ nik: string; result: StatusResult | null } | null>(null)
  const submitting = useRef(false)

  function handleNikChange(value: string) {
    const normalizedNik = value.replace(/\D/g, '').slice(0, 16)
    setNik(normalizedNik)
    setError('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    if (!/^\d{16}$/.test(nik)) {
      setChecked(null)
      setError('NIK harus terdiri dari 16 digit angka.')
      return
    }
    if (!captchaOk) { setError('Selesaikan verifikasi CAPTCHA terlebih dahulu.'); return }
    if (!consumeAttempt()) { setError('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'); return }
    const submittedNik = nik
    submitting.current = true
    setError('')
    setChecked(null)
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    const result = lookupStatus(submittedNik)
    setChecked({ nik: submittedNik, result })
    if (!result) setError('Data tidak ditemukan.')
    setLoading(false)
    submitting.current = false
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
              Verifikasi status penerima bantuan sosial masyarakat. Data demo ditampilkan untuk
              pratinjau sistem.
            </p>
          </div>
          <div className="node-indicator inline-flex items-center gap-2 self-start border border-primary/30 bg-surface px-4 py-3 font-mono text-xs text-primary-hover min-[769px]:self-auto">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Jaringan aktif · QBFT
          </div>
        </header>

        <form method="post" onSubmit={handleSubmit} className="mt-8 border bg-surface p-5 min-[641px]:p-7">
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
              className="min-w-0 flex-1 border bg-background px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <TurnstileWidget onVerify={token => setCaptchaOk(Boolean(token))} />
          <div className="mt-3 flex flex-col gap-3 min-[641px]:flex-row">
            <button
              type="submit"
              disabled={!captchaOk || loading}
              className="bg-primary px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Memeriksa…' : 'Cek Status'}
            </button>
          </div>
          {error ? (
            <p id="nik-error" role="alert" className="mt-3 font-mono text-xs text-red-700">
              {error}
            </p>
          ) : (
            <p id="nik-help" className="mt-3 font-mono text-xs text-body-copy">
              Gunakan NIK 16 digit. Data yang ditampilkan adalah simulasi.
            </p>
          )}
          <p aria-live="polite" className="sr-only">{loading ? 'Memeriksa…' : error || (checked?.result ? 'Hasil verifikasi tersedia.' : '')}</p>
        </form>
        <p className="mt-3 font-mono text-xs text-body-copy">Hasil menampilkan NIK yang Anda ketik, nama lengkap, program, periode, status, dan TxHash. Alamat dan nomor telepon tidak pernah ditampilkan.</p>
        <p className="mt-3 font-mono text-xs text-body-copy">Mode demo: data simulasi. Versi produksi akan memakai verifikasi server dengan pembatasan percobaan.</p>

        <Link href="/cara-verifikasi" className="mt-3 inline-flex font-mono text-xs text-primary-hover hover:underline">Cara memeriksa transaksi</Link>

        <section aria-labelledby="hasil-verifikasi" className="mt-8">
          <h2 id="hasil-verifikasi" className="mb-5 font-sans text-2xl font-medium tracking-tight">
            hasil-verifikasi/
          </h2>
          {checked?.result ? (
            <div
              data-reveal
              className="border bg-surface p-5 min-[641px]:p-8"
            >
              <div className="grid gap-7 min-[769px]:grid-cols-2 min-[769px]:gap-x-12 min-[769px]:gap-y-8">
                <Info label="Nama penerima" value={checked.result.name} emphasis />
                <Info label="NIK" value={checked.nik} mono />
                {checked.result.entries.map((entry, index) => (
                  <div key={index} className="grid gap-7 min-[769px]:col-span-2 min-[769px]:grid-cols-2 min-[769px]:gap-x-12 min-[769px]:gap-y-8">
                    <Info label="Program bantuan" value={entry.program} />
                    <Info label="Periode" value={entry.period} />
                    <Info label="Status penyaluran" value={entry.status} badge />
                  </div>
                ))}
              </div>
              <p className="mt-7 border p-3 font-mono text-xs text-body-copy">Jangan bagikan tangkapan layar halaman ini karena memuat NIK dan nama lengkap.</p>
              <div className="mt-8 border-t pt-7">
                <p className="mb-3 font-mono text-xs uppercase tracking-wide text-body-copy">
                  Blockchain audit trail (txid)
                </p>
                {checked.result.entries.map((entry, index) => (
                  <div key={index} className="flex flex-col gap-3 border bg-background px-3 py-3 min-[641px]:flex-row min-[641px]:items-center min-[641px]:justify-between">
                    <code className="break-all font-mono text-[10px] text-primary-hover">{entry.txHash || 'Belum ada transaksi'}</code>
                    {entry.txHash && <Link prefetch={false} href={`/explorer/tx/${entry.txHash}`} className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-primary-hover hover:underline">
                      Lihat di Explorer <ArrowUpRight aria-hidden="true" className="size-3" />
                    </Link>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              key="empty"
              data-reveal
              className="border border-dashed bg-surface p-8 text-center"
            >
              <CheckCircle2 aria-hidden="true" className="mx-auto mb-4 size-8 text-primary-hover" />
              <p className="font-sans text-lg">Belum ada hasil verifikasi</p>
              <p className="mx-auto mt-2 max-w-md font-mono text-xs leading-6 text-body-copy">
                Masukkan NIK 16 digit untuk menampilkan status bantuan pada mode demo.
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
}: {
  label: string
  value: string
  emphasis?: boolean
  mono?: boolean
  badge?: boolean
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-wide text-body-copy">{label}</p>
      {badge ? (
        <span className="inline-flex rounded-label bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase text-primary-hover">
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
