'use client'

import { useState, type ReactNode } from 'react'
import { useClipboard } from '@/hooks/use-clipboard'
import Link from 'next/link'
import { ArrowLeft, Copy, Wallet } from 'lucide-react'
import {
  addressTransactions,
  contractAddress,
  type ExplorerAddress,
} from '@/lib/explorer-addresses'

const panel = 'rounded-control border bg-white p-5 sm:p-6'
const short = (s: string) => `${s.slice(0, 10)}…${s.slice(-6)}`
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-4 last:border-0 sm:grid-cols-[240px_1fr]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  )
}
export function AddressDetails({ wallet: w }: { wallet: ExplorerAddress }) {
  const [tab, setTab] = useState('Transactions')
  const [method, setMethod] = useState('all')
  const { copied, copyText } = useClipboard()
  const txs = addressTransactions(w.address)
  const filtered = txs.filter((t) => method === 'all' || t.method === method)
  const validator = w.type === 'Validator'
  async function copy() {
    await copyText(
      w.address,
      'Alamat disalin',
      'Gagal menyalin. Silakan salin alamat secara manual.',
    )
  }
  return (
    <>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/explorer" className="flex items-center gap-3 font-bold">
            <span
              className="relative block w-36 shrink-0 overflow-hidden mix-blend-multiply min-[1025px]:w-40"
              style={{ aspectRatio: '1590 / 325' }}
            >
              <img
                src="/images/bansosledger-detail-logo.png"
                alt="BansosLedger"
                width={2145}
                height={733}
                fetchPriority="high"
                className="absolute h-auto max-w-none"
                style={{ width: '134.91%', left: '-17.61%', top: '-58.46%' }}
              />
            </span>
          </Link>
          <Link href="/explorer" className="flex items-center gap-2 text-xs text-primary">
            <ArrowLeft size={14} />
            Explorer
          </Link>
        </div>
      </header>
      <main
        id="main"
        data-transparency
        className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:px-8"
      >
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/explorer" className="text-primary">
            Explorer
          </Link>{' '}
          / Detail address
        </nav>
        <div className="border-b pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Wallet className="size-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Address <span className="text-primary">Details</span>
            </h1>
            <span className="rounded-label border bg-secondary px-3 py-1 text-xs text-primary">
              {w.type}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <code className="min-w-0 break-all text-xs sm:text-sm">{w.address}</code>
            <button
              onClick={copy}
              aria-label="Salin address"
              className="rounded-control border bg-white p-2 text-primary"
            >
              <Copy size={15} />
            </button>
            <span role="status" className="text-xs text-muted-foreground">
              {copied}
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Data dummy · Wallet dan metrik hanya untuk demonstrasi, bukan akun operasional. Jangan
            kirim dana ke alamat ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-label bg-secondary px-3 py-1.5 text-primary">
            Active · ilustrasi
          </span>
          <span className="rounded-label border px-3 py-1.5">{w.name}</span>
          <span className="rounded-label border px-3 py-1.5">QBFT · Permissioned</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <section className={panel}>
            <h2 className="mb-5 text-sm font-semibold">Overview</h2>
            <p className="text-[10px] uppercase text-muted-foreground">Institution</p>
            <p className="mt-2 text-sm font-semibold">{w.name}</p>
            <p className="mt-5 text-[10px] uppercase text-muted-foreground">Wallet role</p>
            <p className="mt-2 text-sm">{w.role}</p>
            <p className="mt-5 text-xs text-muted-foreground">
              0 ETH · Gas price 0 Gwei (PoA fixed)
            </p>
          </section>
          <section className={panel}>
            <h2 className="mb-5 text-sm font-semibold">More Info</h2>
            <p className="text-[10px] uppercase text-muted-foreground">
              {validator ? 'Blocks signed' : 'Transactions received'}
            </p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {validator ? w.signed.toLocaleString('id-ID') : txs.length}
            </p>
            <p className="mt-5 text-[10px] uppercase text-muted-foreground">
              Last {validator ? 'block signed' : 'activity'}
            </p>
            <Link
              className="mt-2 inline-block text-sm text-primary"
              href={`/explorer/block/${w.lastBlock}`}
            >
              #{w.lastBlock} ↗
            </Link>
          </section>
          <section className={panel}>
            <h2 className="mb-5 text-sm font-semibold">Network Info</h2>
            <p className="text-[10px] uppercase text-muted-foreground">BansosLedger consortium</p>
            <p className="mt-2 text-sm">Proof of Authority · QBFT</p>
            <p className="mt-5 text-xs text-muted-foreground">
              Chain ID <span className="text-foreground">13579</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {validator
                ? `Uptime ${w.uptime} · Authorized signer`
                : 'Kontrak pencatatan penyaluran'}
            </p>
          </section>
        </div>
        <nav
          aria-label="Bagian detail address"
          className="flex gap-2 overflow-x-auto border-b pb-3"
        >
          {['Overview', 'Transactions', 'More Info', 'Advanced'].map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              aria-current={tab === name ? 'page' : undefined}
              className={`shrink-0 rounded-control px-4 py-2.5 text-xs font-medium transition-colors ${tab === name ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-primary'}`}
            >
              {name}
            </button>
          ))}
        </nav>
        {tab === 'Transactions' ? (
          <section
            className="overflow-hidden rounded-control border bg-white"
            aria-label="Transactions"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
              <h2 className="text-sm font-semibold">
                {filtered.length} dari {txs.length} transaksi ilustrasi
              </h2>
              <label className="flex items-center gap-3 text-xs text-muted-foreground">
                Filter method
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="rounded-control border bg-white p-2 text-foreground"
                >
                  <option value="all">All methods</option>
                  {Array.from(new Set(txs.map((t) => t.method))).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="border-b bg-secondary/30 text-muted-foreground">
                  <tr>
                    {['Transaction hash', 'Method', 'Block', 'From', 'To', 'Status', 'Txn fee'].map(
                      (h) => (
                        <th className="px-5 py-4 font-medium" key={h}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.hash} className="border-b last:border-0 hover:bg-secondary/20">
                      <td className="px-5 py-5">
                        <Link
                          className="font-mono text-primary hover:underline"
                          href={`/explorer/tx/${t.hash}`}
                        >
                          {short(t.hash)}
                        </Link>
                      </td>
                      <td className="px-5 py-5">
                        <span className="rounded-label border bg-secondary/30 px-2 py-1">
                          {t.method}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <Link className="text-primary" href={`/explorer/block/${t.id}`}>
                          {t.id}
                        </Link>
                      </td>
                      <td className="px-5 py-5">
                        <Link className="text-primary" href={`/explorer/address/${t.address}`}>
                          {t.signer}
                        </Link>
                      </td>
                      <td className="px-5 py-5">
                        <Link
                          className="text-primary"
                          href={`/explorer/address/${contractAddress}`}
                        >
                          BansosContract
                        </Link>
                      </td>
                      <td className="px-5 py-5">
                        <span className="rounded-label bg-secondary px-2 py-1 text-primary">
                          Success
                        </span>
                      </td>
                      <td className="px-5 py-5 text-muted-foreground">0 ETH</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Tidak ada transaksi untuk metode ini.
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className={panel} aria-label={tab}>
            <h2 className="mb-3 text-sm font-semibold">{tab}</h2>
            <dl>
              {tab === 'Overview' && (
                <>
                  <Row label="Institution name">{w.name}</Row>
                  <Row label="Address type">
                    {validator ? 'Blockchain validator (QBFT signer)' : 'Smart contract'}
                  </Row>
                  <Row label="Role">{w.role}</Row>
                  <Row label="Status">Active · dummy</Row>
                  <Row label="Uptime">{w.uptime}</Row>
                  <Row label="Blocks signed">
                    {validator ? w.signed.toLocaleString('id-ID') : 'Tidak berlaku'}
                  </Row>
                  <Row label="Last block">
                    <Link href={`/explorer/block/${w.lastBlock}`} className="text-primary">
                      #{w.lastBlock}
                    </Link>
                  </Row>
                  <Row label="Reputation score">
                    {validator
                      ? `${w.reputation}/100 · PoA authority rating (ilustrasi)`
                      : 'Tidak berlaku'}
                  </Row>
                </>
              )}
              {tab === 'More Info' && (
                <>
                  <Row label="Total signatures">
                    {validator ? w.signed.toLocaleString('id-ID') : 'Tidak berlaku'}
                  </Row>
                  <Row label="Signature success rate">{w.uptime}</Row>
                  <Row label="Failed validations">
                    {validator ? '3 · ilustrasi' : 'Tidak berlaku'}
                  </Row>
                  <Row label="Average block time">4 detik</Row>
                  <Row label="Last audit">5 Oktober 2026 · simulasi</Row>
                  <Row label="Audit status">PASSED · dummy, bukan audit resmi</Row>
                  <Row label="Critical issues">0 · ilustrasi</Row>
                </>
              )}
              {tab === 'Advanced' && (
                <>
                  <Row label="Validator public key">Belum tersedia dalam demo</Row>
                  <Row label="Validator commission">0 · PoA, no fee</Row>
                  <Row label="Total blocks proposed">
                    {validator ? (w.signed - 123).toLocaleString('id-ID') : 'Tidak berlaku'}
                  </Row>
                  <Row label="Slash events">{validator ? '0 · ilustrasi' : 'Tidak berlaku'}</Row>
                  <Row label="Average response time">
                    {validator ? '150 ms · ilustrasi' : 'Tidak berlaku'}
                  </Row>
                  <Row label="Network latency">Low · ilustrasi</Row>
                  <Row label="Chain ID">13579</Row>
                </>
              )}
            </dl>
          </section>
        )}
      </main>
    </>
  )
}
