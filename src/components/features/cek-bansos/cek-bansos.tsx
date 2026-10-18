'use client'

import { useState } from 'react'
import { ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react'

const demoResult = {
  name: 'Sitti Aminah',
  nik: '731107******0001',
  program: 'Bantuan Pangan Non-Tunai (BPNT) Periode III / 2026',
  status: 'Berhasil disalurkan',
  amount: 'Rp1.500.000,00',
  date: '07 Agustus 2026',
  txid: '0x8f4c2b9a1e3f5d7c8b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2',
}

export function CekBansos() {
  const [nik, setNik] = useState('')
  const [result, setResult] = useState<typeof demoResult | null>(null)
  const [error, setError] = useState('')

  const [resultVersion, setResultVersion] = useState(0)

  function updateResult(normalizedNik: string) {
    setError('')
    setResult({
      ...demoResult,
      nik: `${normalizedNik.slice(0, 6)}******${normalizedNik.slice(-4)}`,
    })
    setResultVersion((version) => version + 1)
  }

  function handleNikChange(value: string) {
    const normalizedNik = value.replace(/\D/g, '').slice(0, 16)
    setNik(normalizedNik)
    setError('')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (nik.length !== 16) {
      setResult(null)
      setError('NIK harus terdiri dari 16 digit angka.')
      return
    }
    updateResult(nik)
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

        <form onSubmit={handleSubmit} className="mt-8 border bg-surface p-5 min-[641px]:p-7">
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
            <button
              type="submit"
              className="bg-primary px-6 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Cek Status
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
        </form>

        <section aria-labelledby="hasil-verifikasi" className="mt-8">
          <h2 id="hasil-verifikasi" className="mb-5 font-sans text-2xl font-medium tracking-tight">
            hasil-verifikasi/
          </h2>
          {result ? (
            <div
              key={resultVersion}
              data-result-version={resultVersion}
              data-reveal
              className="border bg-surface p-5 min-[641px]:p-8"
            >
              <div className="grid gap-7 min-[769px]:grid-cols-2 min-[769px]:gap-x-12 min-[769px]:gap-y-8">
                <Info label="Nama penerima" value={result.name} emphasis />
                <Info label="NIK (disamarkan)" value={result.nik} mono />
                <Info label="Program bantuan" value={result.program} />
                <Info label="Status penyaluran" value={result.status} badge />
                <Info label="Jumlah bantuan" value={result.amount} />
                <Info label="Tanggal penyaluran" value={result.date} />
              </div>
              <div className="mt-8 border-t pt-7">
                <p className="mb-3 font-mono text-xs uppercase tracking-wide text-body-copy">
                  Blockchain audit trail (txid)
                </p>
                <div className="flex flex-col gap-3 border bg-background px-3 py-3 min-[641px]:flex-row min-[641px]:items-center min-[641px]:justify-between">
                  <code className="break-all font-mono text-[10px] text-primary-hover">
                    {result.txid}
                  </code>
                  <a
                    href="#"
                    className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-primary-hover hover:underline"
                  >
                    Lihat di Explorer <ArrowUpRight aria-hidden="true" className="size-3" />
                  </a>
                </div>
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
