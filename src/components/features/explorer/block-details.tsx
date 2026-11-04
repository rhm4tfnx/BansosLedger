'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { blocks, transactions, validators, blockHash } from '@/mocks/explorer-data'

const tabs = [
  ['overview', 'Overview'],
  ['consensus', 'Consensus Info'],
  ['transactions', 'Transactions'],
  ['participants', 'Participants'],
] as const
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-4 last:border-0 sm:grid-cols-[240px_1fr]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm leading-6 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}
export function BlockDetails({
  block,
  initialTab,
}: {
  block: (typeof blocks)[number]
  initialTab: string
}) {
  const [tab, setTab] = useState(initialTab)
  const blockTransactions = transactions.filter((t) => t.id === block.id)
  const panel = 'rounded-control border bg-white p-5 sm:p-7'
  const participants = (
    <div className="grid gap-3 sm:grid-cols-2">
      {validators.map((v) => (
        <div
          key={v}
          className="flex items-center gap-3 rounded-control border border-l-2 border-l-primary p-4"
        >
          <CheckCircle2 className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {v === block.signer ? 'Proposer' : 'Validator'} · Signed (ilustrasi)
            </p>
          </div>
        </div>
      ))}
    </div>
  )
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
        <div data-reveal>
          <nav aria-label="Breadcrumb" className="flex gap-2 text-xs text-muted-foreground">
            <Link href="/explorer" className="text-primary">
              Explorer
            </Link>
            <span>/ Detail blok</span><Link href="/transparansi" className="text-primary">Ringkasan publik</Link>
          </nav>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Block <span className="text-primary">#{block.id}</span>
            </h1>
            <span className="rounded-label border px-3 py-1 font-mono text-[10px] text-muted-foreground">
              QBFT · CHAIN ID 13579
            </span>
          </div>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Data ilustrasi · Informasi berikut bukan hasil pembacaan jaringan blockchain live.
          </p>
        </div>
        <nav aria-label="Bagian detail blok" className="flex gap-2 overflow-x-auto border-b pb-3">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`shrink-0 rounded-control px-4 py-2.5 text-xs font-medium transition-colors ${tab === key ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-primary'}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <section data-reveal className={panel} aria-label={tabs.find((t) => t[0] === tab)?.[1]}>
          <h2 className="mb-3 text-lg font-semibold">{tabs.find((t) => t[0] === tab)?.[1]}</h2>
          {tab === 'overview' && (
            <>
              <dl>
                <Row label="Block height">
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{block.id}</span>
                    {blocks.some((b) => b.id === block.id - 1) && (
                      <Link
                        aria-label="Blok sebelumnya"
                        href={`/explorer/block/${block.id - 1}`}
                        className="rounded-control border p-1"
                      >
                        <ChevronLeft size={16} />
                      </Link>
                    )}
                    {blocks.some((b) => b.id === block.id + 1) && (
                      <Link
                        aria-label="Blok berikutnya"
                        href={`/explorer/block/${block.id + 1}`}
                        className="rounded-control border p-1"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                </Row>
                <Row label="Status">
                  <span className="rounded-label bg-secondary px-2 py-1 text-xs text-primary">
                    Finalized · ilustrasi
                  </span>
                </Row>
                <Row label="Timestamp">
                  10 Oktober 2026 · 15:45:{String(30 - (12542 - block.id)).padStart(2, '0')} UTC
                </Row>
                <Row label="Transactions">
                  <button
                    className="text-primary underline underline-offset-4"
                    onClick={() => setTab('transactions')}
                  >
                    {block.transactions} transaksi dalam blok ini
                  </button>
                </Row>
                <Row label="Block signer (PoA)">{block.signer}</Row>
                <Row label="Consensus">QBFT (Proof of Authority)</Row>
                <Row label="Validator reward">0 ETH · PoA — tanpa reward</Row>
                <Row label="Gas used">
                  <span className="font-mono">{block.gas.toLocaleString('id-ID')}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({(block.gas / 300000).toFixed(2)}%)
                  </span>
                  <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${block.gas / 300000}%` }}
                    />
                  </div>
                </Row>
                <Row label="Gas limit">30.000.000</Row>
                <Row label="Gas price">0 Gwei (fixed)</Row>
                <Row label="Extra data">Bansos-Takkalasi-Oct10 · ilustrasi</Row>
              </dl>
              <details className="mt-4 border-t pt-4">
                <summary className="cursor-pointer text-xs font-medium text-primary">
                  Detail hash & data teknis
                </summary>
                <dl>
                  <Row label="Block hash">
                    <code className="text-xs">{blockHash(block.id)}</code>
                  </Row>
                  <Row label="Parent hash">
                    <code className="text-xs">{blockHash(block.id - 1)}</code>
                  </Row>
                  <Row label="State root">
                    <code className="text-xs">{blockHash(block.id + 100000)}</code>
                  </Row>
                  <Row label="Nonce">
                    <code>0x0000000000000000</code>
                  </Row>
                </dl>
              </details>
            </>
          )}
          {tab === 'consensus' && (
            <>
              <dl>
                <Row label="Protocol">QBFT · Proof of Authority</Row>
                <Row label="Consensus round">0 (ilustrasi)</Row>
                <Row label="Block proposer">{block.signer}</Row>
                <Row label="Quorum">3 dari 4 validator</Row>
                <Row label="Finality">Instan setelah commit quorum</Row>
                <Row label="Parent block hash">
                  <code className="text-xs">{blockHash(block.id - 1)}</code>
                </Row>
                <Row label="Block extra data">Bansos-Takkalasi-Oct10</Row>
              </dl>
              <h3 className="mb-4 mt-7 font-mono text-xs text-muted-foreground">
                AKUNTABILITAS INSTITUSIONAL · PARTISIPASI VALIDATOR
              </h3>
              {participants}
            </>
          )}
          {tab === 'transactions' && (
            <>
              <div className="mb-6 grid grid-cols-3 gap-3">
                {[
                  [block.transactions, 'Total transaksi'],
                  [block.transactions - 1, 'Berhasil'],
                  [1, 'Gagal'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-control border bg-secondary/40 p-4 text-center"
                  >
                    <p className="text-xl font-semibold text-primary">{value}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <h3 className="text-xs font-medium">Sampel transaksi dalam blok</h3>
              <p className="mb-4 mt-2 text-xs text-muted-foreground">
                Menampilkan {blockTransactions.length} sampel dari {block.transactions} transaksi
                ilustrasi.
              </p>
              {blockTransactions.map((t) => (
                <details key={t.hash} className="rounded-control border bg-secondary/30 p-4" open>
                  <summary className="cursor-pointer break-all font-mono text-xs text-primary">
                    Detail transaksi
                  </summary>
                  <Link
                    href={`/explorer/tx/${t.hash}`}
                    className="mt-3 block break-all font-mono text-xs text-primary underline underline-offset-4"
                  >
                    {t.hash}
                  </Link>
                  <dl>
                    <Row label="From">
                      <span>{t.signer}</span>
                      <code className="block text-xs text-muted-foreground">{t.address}</code>
                    </Row>
                    <Row label="To">BansosContract (ilustrasi)</Row>
                    <Row label="Method">
                      <code>{t.method}</code>
                    </Row>
                    <Row label="Program">{t.program}</Row>
                    <Row label="Status">
                      <span className="text-primary">Success · ilustrasi</span>
                    </Row>
                    <Row label="Block number">#{block.id}</Row>
                  </dl>
                </details>
              ))}
            </>
          )}
          {tab === 'participants' && (
            <>
              <p className="mb-5 text-xs text-muted-foreground">
                Validator institusional · Authorized signers · Status ilustrasi
              </p>
              {participants}
            </>
          )}
        </section>
        <p className="text-xs leading-6 text-muted-foreground">
          Blok mengelompokkan transaksi dan saling terhubung melalui hash kriptografis. Seluruh
          hash, status, dan metrik pada pratinjau ini merupakan ilustrasi.
        </p>
        <Link href="/explorer" className="flex items-center gap-2 text-sm text-primary">
          <ArrowLeft size={15} />
          Kembali ke explorer
        </Link>
      </main>
    </>
  )
}
