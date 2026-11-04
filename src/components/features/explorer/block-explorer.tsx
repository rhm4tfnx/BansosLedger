'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Box, ArrowUpRight, Search, ShieldCheck, Network, FileText, ArrowLeft } from 'lucide-react'
import { Area, AreaChart, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { CountUp } from '@/components/ui/count-up'
import { wallets, addresses } from '@/constants/explorer-addresses'
import { walletFor } from '@/mocks/explorer-queries'

import { validators, blocks, transactions as mockTransactions } from '@/mocks/explorer-data'
const trend = [126, 141, 158, 163, 172, 168, 154, 139, 132, 145, 157, 169, 185, 195].map(
  (value, i) => ({ day: `${i + 1} Okt`, value }),
)
const short = (value: string) => `${value.slice(0, 10)}…${value.slice(-6)}`

export function BlockExplorer({ ledger = [] }: { ledger?: typeof mockTransactions }) {
  const transactions = [...ledger, ...mockTransactions]
  const [searchError, setSearchError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState<{ query: string; filter: string } | null>(null)
  const [allBlocks, setAllBlocks] = useState(false)
  const [allTransactions, setAllTransactions] = useState(false)
  const [detail, setDetail] = useState<{ title: string; rows: [string, string][] } | null>(null)
  const router = useRouter()
  const blockDetail = (b: (typeof blocks)[number]) => router.push(`/explorer/block/${b.id}`)
  const transactionDetail = (t: (typeof transactions)[number]) =>
    router.push(`/explorer/tx/${t.hash}`)
  const q = search?.query.toLowerCase() ?? ''
  const matchedBlocks =
    search && ['all', 'block'].includes(search.filter)
      ? blocks.filter((b) => String(b.id) === q.replace('#', ''))
      : []
  const matchedTransactions =
    search && ['all', 'transaction', 'address'].includes(search.filter)
      ? transactions.filter((t) => t.hash.toLowerCase() === q || t.address.toLowerCase() === q || t.refId.toLowerCase() === q || t.commitment.toLowerCase() === q)
      : []
  const matchedValidators =
    search && ['all', 'validator'].includes(search.filter)
      ? validators.filter((v) => v.toLowerCase().includes(q))
      : []

  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <span
              className="relative block w-36 shrink-0 overflow-hidden mix-blend-multiply min-[1025px]:w-40"
              style={{ aspectRatio: '1590 / 325' }}
            >
              <img
                src="/images/bansosledger-logo.png"
                alt="BansosLedger"
                width={2145}
                height={733}
                fetchPriority="high"
                className="absolute h-auto max-w-none"
                style={{ width: '134.91%', left: '-17.61%', top: '-58.46%' }}
              />
            </span>
            <span className="hidden border-l pl-3 font-mono text-xs font-normal text-muted-foreground sm:block">
              BLOCK EXPLORER
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-2 font-mono text-xs text-primary">
            <ArrowLeft size={14} />
            Home
          </Link>
        </div>
      </header>
      <main data-transparency id="main">
        <section className="border-b bg-secondary">
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-12">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-primary">
              <span>BARRU QBFT CONSORTIUM</span>
              <span className="rounded-label border border-primary/20 px-2 py-1">
                CHAIN ID 13579
              </span>
              <span>DATA ILUSTRASI</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              BansosLedger <span className="text-primary">Block Explorer.</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Telusuri jejak digital bantuan sosial. Dari blok, transaksi, hingga validator.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const value = query.trim()
                const valid = /^0x[0-9a-f]{64}$/i.test(value) || /^0x[0-9a-f]{40}$/i.test(value) || /^\d+$/.test(value) || /^(?:REF|TX|DIS|PEN)-[A-Z0-9-]+$/i.test(value) || transactions.some(t => t.refId.toLowerCase() === value.toLowerCase())
                if (!valid) { setSearch(null); setSearchError('Format pencarian tidak valid. Gunakan TxHash, nomor blok, alamat, refId, atau commitment.'); return }
                setSearchError('')
                if (value) {
                  const wallet = addresses.find(
                    (w) => w.address.toLowerCase() === query.trim().toLowerCase(),
                  )
                  if (wallet && ['all', 'address'].includes(filter)) {
                    router.push(`/explorer/address/${wallet.address}`)
                    return
                  }
                  setSearch({ query: query.trim(), filter })
                  setDetail(null)
                }
              }}
              className="mt-7 flex max-w-4xl flex-wrap gap-2 rounded-control border bg-white p-2 sm:flex-nowrap"
            >
              <label className="sr-only" htmlFor="explorer-filter">
                Jenis pencarian
              </label>
              <select
                id="explorer-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-control border-r bg-white px-3 py-3 text-xs"
              >
                <option value="all">Semua filter</option>
                <option value="block">Nomor blok</option>
                <option value="transaction">TxHash / refId / commitment</option>
                <option value="address">Alamat</option>
              </select>
              <label htmlFor="explorer-search" className="sr-only">
                Cari TxHash, nomor blok, alamat, refId, atau commitment
              </label>
              <input
                id="explorer-search"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="TxHash / nomor blok / alamat / refId / commitment"
                className="min-w-0 flex-1 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                aria-label="Cari di explorer"
                className="rounded-control bg-primary p-3 text-white hover:bg-primary-hover"
              >
                <Search size={20} />
              </button>
            </form>
            {searchError && <p role="alert" className="mt-3 text-xs text-destructive">{searchError}</p>}
            <nav className="mt-3 flex flex-wrap gap-4 text-xs text-primary"><Link href="/cara-verifikasi">Cara memeriksa transaksi</Link><Link href="/explorer/contract">Kontrak</Link><Link href="/explorer/validator">Validator</Link><Link href="/transparansi">Ringkasan publik</Link></nav>
            <p className="mt-3 text-xs text-muted-foreground">
              Coba:{' '}
              <button
                className="text-primary underline"
                onClick={() => {
                  setQuery('12542')
                  setSearch({ query: '12542', filter: 'all' })
                }}
              >
                12542
              </button>{' '}
              atau salin TxHash dari transaksi di bawah.
            </p>
          </div>
        </section>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-14 sm:px-8">
          <div className="-mt-6 flex flex-wrap items-center justify-between gap-3 rounded-control border bg-white p-4 text-xs shadow-sm">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <strong>Proof of Authority · QBFT</strong>
              <span className="hidden text-muted-foreground sm:inline">
                4 validator institusional
              </span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              SIMULASI • BUKAN JARINGAN LIVE
            </span>
          </div>
          {search && (
            <section className="rounded-control border bg-white p-5" aria-live="polite">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">Hasil pencarian</h2>
                <button className="text-xs text-primary" onClick={() => setSearch(null)}>
                  Tutup hasil
                </button>
              </div>
              <p className="mt-2 break-all text-xs text-muted-foreground">
                Pencarian: {search.query}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {matchedBlocks.map((b) => (
                  <button
                    className="text-left text-sm text-primary"
                    key={b.id}
                    onClick={() => blockDetail(b)}
                  >
                    Blok #{b.id} — {b.signer}
                  </button>
                ))}
                {matchedTransactions.map((t) => (
                  <button
                    className="text-left text-sm text-primary"
                    key={t.hash}
                    onClick={() => transactionDetail(t)}
                  >
                    Transaksi {short(t.hash)} — {t.method}
                  </button>
                ))}
                {matchedValidators.map((v) => (
                  <button
                    className="text-left text-sm text-primary"
                    key={v}
                    onClick={() => router.push(`/explorer/address/${walletFor(v).address}`)}
                  >
                    {v}
                  </button>
                ))}
                {!matchedBlocks.length &&
                  !matchedTransactions.length &&
                  !matchedValidators.length && (
                    <p className="text-sm">
                      Tidak ditemukan dalam dataset ilustrasi. Gunakan nomor blok 12531–12542 atau
                      TxHash, refId, atau commitment dari data ilustrasi.
                    </p>
                  )}
              </div>
            </section>
          )}
          {detail && (
            <section
              className="rounded-control border border-primary/30 bg-white p-5"
              aria-live="polite"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{detail.title}</h2>
                <button onClick={() => setDetail(null)} className="text-xs text-primary">
                  Tutup detail
                </button>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {detail.rows.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-all font-mono text-xs leading-6">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section
            data-reveal
            className="grid min-w-0 gap-6 rounded-control border bg-white p-6 lg:grid-cols-[1fr_1fr_1.3fr]"
          >
            <div className="flex flex-col gap-5">
              <div>
                <p className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <Network size={15} />
                  VALIDATOR NODES
                </p>
                <p className="mt-2 font-semibold text-primary">
                  <CountUp value={4} /> validator aktif
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Konsensus QBFT · ilustrasi</p>
              </div>
              <div className="border-t pt-4">
                <p className="font-mono text-[10px] text-muted-foreground">MITRA INSTITUSIONAL</p>
                <p className="mt-2 text-sm font-medium">Kelurahan, Kecamatan, Dinsos, Auditor</p>
                <p className="mt-1 text-xs text-muted-foreground">Authorized signers</p>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <p className="font-mono text-[10px] text-muted-foreground">TOTAL TRANSAKSI</p>
                <p className="mt-2 font-semibold text-primary">
                  <CountUp value={3521} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Gas price: 0 Gwei (fixed)</p>
              </div>
              <div className="border-t pt-4">
                <p className="font-mono text-[10px] text-muted-foreground">LAST FINALIZED BLOCK</p>
                <button
                  onClick={() => blockDetail(blocks[0])}
                  className="mt-2 font-semibold text-primary"
                >
                  #12.542 <ArrowUpRight className="inline size-4" />
                </button>
                <p className="mt-1 text-xs text-muted-foreground">Instant finality · ilustrasi</p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] text-muted-foreground">
                RIWAYAT TRANSAKSI · 14 HARI
              </p>
              <ChartContainer
                config={{ value: { label: 'Transaksi', color: 'var(--primary)' } }}
                className="mt-4 h-32 w-full"
              >
                <AreaChart data={trend} accessibilityLayer>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={45} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="value"
                    type="monotone"
                    stroke="var(--color-value)"
                    fill="var(--color-value)"
                    fillOpacity={0.07}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </section>
          <section className="rounded-control border bg-white p-5">
            <h2 className="font-semibold">Wallet institusi</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Alamat dummy · klik untuk melihat profil dan aktivitas
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {wallets.map((w) => (
                <Link
                  key={w.address}
                  href={`/explorer/address/${w.address}`}
                  className="min-w-0 rounded-control border p-4 transition-colors hover:bg-secondary/40"
                >
                  <p className="text-xs font-medium text-primary">{w.name}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                    {short(w.address)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <section className="min-w-0 overflow-hidden rounded-control border bg-white">
              <div className="flex items-center justify-between border-b p-5">
                <h2 className="font-semibold">Blok terbaru</h2>
                <span className="font-mono text-[10px] text-muted-foreground">LATEST BLOCKS</span>
              </div>
              {blocks.slice(0, allBlocks ? 12 : 6).map((b) => (
                <div className="flex items-center gap-3 border-b p-5" key={b.id}>
                  <span className="rounded-control bg-secondary p-3 text-primary">
                    <Box size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => blockDetail(b)}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      #{b.id}
                    </button>
                    <p className="mt-1 text-[10px] text-muted-foreground">Finalized · ilustrasi</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <Link
                      href={`/explorer/address/${walletFor(b.signer).address}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {b.signer}
                    </Link>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {b.transactions} txns · 4 detik
                    </p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setAllBlocks(!allBlocks)}
                className="w-full bg-secondary/40 p-4 font-mono text-xs text-primary"
              >
                {allBlocks ? 'Tampilkan lebih sedikit' : 'Lihat semua blok (12)'} →
              </button>
            </section>
            <section className="min-w-0 overflow-hidden rounded-control border bg-white">
              <div className="flex items-center justify-between border-b p-5">
                <h2 className="font-semibold">Transaksi terbaru</h2>
                <span className="font-mono text-[10px] text-muted-foreground">LATEST TXNS</span>
              </div>
              {transactions.slice(0, allTransactions ? transactions.length : 6).map((t) => (
                <div className="flex items-center gap-3 border-b p-5" key={t.hash}>
                  <span className="rounded-control bg-secondary p-3 text-primary">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => {
                        transactionDetail(t)
                        window.scrollTo({
                          top: 300,
                          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            ? 'instant'
                            : 'smooth',
                        })
                      }}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {short(t.hash)}
                    </button>
                    <p className="mt-1 text-[10px] text-muted-foreground">{t.method}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <Link
                      href={`/explorer/address/${walletFor(t.signer).address}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {t.signer}
                    </Link>
                    <p className="mt-1 text-[10px] text-muted-foreground">{t.program}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setAllTransactions(!allTransactions)}
                className="w-full bg-secondary/40 p-4 font-mono text-xs text-primary"
              >
                {allTransactions ? 'Tampilkan lebih sedikit' : `Lihat semua transaksi (${transactions.length})`} →
              </button>
            </section>
          </div>
          <p className="text-center text-xs leading-6 text-muted-foreground">
            Seluruh blok, hash, alamat, dan metrik merupakan data ilustrasi untuk pratinjau
            explorer.
            <br />
            Belum terhubung ke RPC Hyperledger Besu. Tidak menampilkan NIK atau identitas penerima.
          </p>
        </div>
      </main>
    </>
  )
}
