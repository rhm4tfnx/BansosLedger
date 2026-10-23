'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Copy } from 'lucide-react'
import { transactions } from '@/mocks/explorer-data'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-4 last:border-0 sm:grid-cols-[240px_1fr]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}
const tabs = ['Overview', 'Logs', 'State Changes'] as const
const panel = 'rounded-control border bg-white p-5 sm:p-7'

export function TransactionDetails({
  transaction: t,
}: {
  transaction: (typeof transactions)[number]
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
  const [copyStatus, setCopyStatus] = useState('')
  const index = transactions.findIndex((item) => item.hash === t.hash)
  const amount = [300000, 250000, 0, 0][index % 4]
  const recipient = `REC-2026-${String(index + 1).padStart(3, '0')}`
  const contract = `0x${'9abcdef0'.repeat(5)}`
  const event = ['BatchRecorded', 'DistributionVerified', 'RecipientRegistered', 'BatchAudited'][
    index % 4
  ]
  const input = {
    method: t.method,
    from: t.address,
    to: contract,
    amount,
    recipientId: recipient,
    recipientNIK: '[tidak ditampilkan dalam demo]',
  }
  async function copyHash() {
    try {
      await navigator.clipboard.writeText(t.hash)
      setCopyStatus('Hash disalin')
    } catch {
      setCopyStatus('Gagal menyalin. Silakan salin hash secara manual.')
    }
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
        <div>
          <nav aria-label="Breadcrumb" className="flex gap-2 text-xs text-muted-foreground">
            <Link href="/explorer" className="text-primary">
              Explorer
            </Link>
            <span>/ Detail transaksi</span>
          </nav>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Transaction <span className="text-primary">Details</span>
            </h1>
            <span className="flex items-center gap-2 rounded-label border bg-secondary px-3 py-1.5 text-xs text-primary">
              <CheckCircle2 size={14} />
              Success · ilustrasi
            </span>
          </div>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Data ilustrasi · Bukan pembacaan jaringan blockchain live. Seluruh alamat, log, dan
            perubahan state adalah contoh.
          </p>
        </div>
        <nav
          aria-label="Bagian detail transaksi"
          className="flex gap-2 overflow-x-auto border-b pb-3"
        >
          {tabs.map((name) => (
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
        {tab === 'Overview' && (
          <>
            <section className={panel} aria-label="Overview">
              <dl>
                <Row label="Transaction hash">
                  <div className="flex items-start gap-3">
                    <code className="min-w-0 text-xs">{t.hash}</code>
                    <button
                      onClick={copyHash}
                      aria-label="Salin transaction hash"
                      className="shrink-0 rounded-control border p-1.5 text-muted-foreground hover:text-primary"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <span role="status" className="text-xs text-muted-foreground">
                    {copyStatus}
                  </span>
                </Row>
                <Row label="Status">
                  <span className="inline-flex items-center gap-1.5 rounded-label bg-secondary px-2 py-1 text-xs text-primary">
                    <CheckCircle2 size={13} />
                    Success
                  </span>
                </Row>
                <Row label="Block">
                  <Link
                    href={`/explorer/block/${t.id}`}
                    className="text-primary underline underline-offset-4"
                  >
                    #{t.id}
                  </Link>
                  <span className="ml-3 rounded-label border px-2 py-1 text-[10px] text-muted-foreground">
                    QBFT · Finalized
                  </span>
                </Row>
                <Row label="Timestamp">
                  10 Oktober 2026 · 15:45:{String(30 - index).padStart(2, '0')} UTC
                </Row>
                <Row label="Confirmations">{index + 1} blok · Finalitas instan (PoA)</Row>
                <Row label="Otoritas pengirim (From)">
                  <p>{t.signer}</p>
                  <Link
                    href={`/explorer/address/${t.address}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {t.address}
                  </Link>
                </Row>
                <Row label="Kontrak validasi (To)">
                  <p>BansosLedger: BansosContract</p>
                  <Link
                    href={`/explorer/address/${contract}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {contract}
                  </Link>
                </Row>
                <Row label="Alokasi bantuan (Value)">
                  <span className="font-medium">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(amount)}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">({t.program})</span>
                </Row>
                <Row label="Transaction fee">0 ETH · Jaringan permissioned</Row>
                <Row label="Gas price (PoA fixed)">0.00 Gwei</Row>
              </dl>
            </section>
            <section className={panel} aria-label="Function called">
              <h2 className="mb-2 text-sm font-semibold">Function called</h2>
              <dl>
                <Row label="Method name">
                  <code className="rounded-label bg-secondary px-2 py-1 text-xs">{t.method}()</code>
                </Row>
                <Row label="Gas used / limit">
                  125.432 / 300.000 <span className="text-xs text-muted-foreground">(41,81%)</span>
                </Row>
                <Row label="Input data (decoded)">
                  <pre className="overflow-x-auto rounded-control border bg-secondary/40 p-4 text-xs leading-6">
                    {JSON.stringify(input, null, 2)}
                  </pre>
                </Row>
              </dl>
            </section>
            <section className={panel} aria-label="IPFS proof of evidence">
              <h2 className="mb-2 text-sm font-semibold">IPFS proof of evidence</h2>
              <dl>
                <Row label="IPFS hash (proof document)">
                  <span className="text-muted-foreground">
                    Belum tersedia — tidak ada dokumen diunggah dalam demo.
                  </span>
                </Row>
                <Row label="Evidence type">
                  Foto bukti penyerahan / dokumen pendukung (ilustrasi)
                </Row>
                <Row label="Recipient ID">
                  <code>{recipient}</code>
                </Row>
                <Row label="NIK penerima">
                  Tidak ditampilkan · Data pribadi penerima tidak disertakan dalam demo.
                </Row>
              </dl>
            </section>
          </>
        )}
        {tab === 'Logs' && (
          <section className={panel} aria-label="Transaction logs">
            <h2 className="mb-5 text-sm font-semibold">
              Transaction logs{' '}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                2 events · ilustrasi
              </span>
            </h2>
            <div className="flex flex-col gap-4">
              <div className="rounded-control border bg-secondary/30 p-4">
                <h3 className="text-sm font-medium text-primary">Event: {event}</h3>
                <dl>
                  <Row label="Contract address">
                    <code className="text-xs">{contract}</code>
                  </Row>
                  <Row label="From">
                    <code className="text-xs">{t.address}</code>
                  </Row>
                  <Row label="Recipient ID">{recipient}</Row>
                  <Row label="Amount (IDR)">{amount.toLocaleString('id-ID')}</Row>
                </dl>
              </div>
              <div className="rounded-control border bg-secondary/30 p-4">
                <h3 className="text-sm font-medium text-primary">Event: AuditEntryCreated</h3>
                <dl>
                  <Row label="Transaction hash">
                    <code className="text-xs">{t.hash}</code>
                  </Row>
                  <Row label="Status">RECORDED</Row>
                </dl>
              </div>
            </div>
          </section>
        )}
        {tab === 'State Changes' && (
          <section className={panel} aria-label="State changes">
            <h2 className="mb-2 text-sm font-semibold">State changes</h2>
            <p className="mb-5 text-xs text-muted-foreground">
              Perubahan state smart contract PoA · ilustrasi, bukan hasil execution trace.
            </p>
            <div className="flex flex-col gap-4">
              {[
                [`BansosContract → records[${recipient}].status`, 'PENDING', 'RECORDED'],
                ['AuditLog → transactionCount', String(4521 + index), String(4522 + index)],
              ].map(([field, oldValue, newValue]) => (
                <div key={field} className="rounded-control border bg-secondary/30 p-4">
                  <h3 className="break-words text-sm font-medium text-primary">{field}</h3>
                  <dl>
                    <Row label="Old value">
                      <code>{oldValue}</code>
                    </Row>
                    <Row label="New value">
                      <code>{newValue}</code>
                    </Row>
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}
        <Link
          href={`/explorer/block/${t.id}?tab=transactions`}
          className="flex items-center gap-2 text-sm text-primary"
        >
          <ArrowLeft size={15} />
          Kembali ke transaksi dalam blok #{t.id}
        </Link>
      </main>
    </>
  )
}
