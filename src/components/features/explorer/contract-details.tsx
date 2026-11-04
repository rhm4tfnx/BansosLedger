'use client'

import Link from 'next/link'
import { AlertTriangle, Copy, Download } from 'lucide-react'
import { useClipboard } from '@/hooks/use-clipboard'
import { formatApiError } from '@/lib/api/errors'
import { useExplorerContractQuery } from '@/lib/api/hooks/explorer'

export function ContractDetails() {
  const contractQuery = useExplorerContractQuery()
  const { copied, copyText } = useClipboard()
  const contract = contractQuery.data
  const isChainNotConfigured = contractQuery.error?.code === 'CHAIN_NOT_CONFIGURED'

  function downloadAbi() {
    if (!contract) return
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(contract.abi, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'BansosLedger.abi.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main
      id="main"
      data-transparency
      className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:px-8"
    >
      <nav className="flex flex-wrap gap-4 text-sm text-primary">
        <Link href="/transparansi" className="inline-flex min-h-11 items-center hover:underline">
          Kembali ke ringkasan publik
        </Link>
        <Link href="/explorer" className="inline-flex min-h-11 items-center hover:underline">
          Explorer
        </Link>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight">Kontrak BansosLedger</h1>
      <p className="text-xs text-muted-foreground">
        Informasi on-chain smart contract BansosLedger beserta ABI publik.
      </p>

      {isChainNotConfigured && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-control border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="font-semibold">Jaringan belum tersedia</p>
        </div>
      )}

      {contractQuery.isLoading ? (
        <section
          aria-busy="true"
          className="h-48 animate-pulse rounded-control border bg-white p-5 sm:p-7"
        />
      ) : contractQuery.isError || !contract ? (
        <section role="alert" className="rounded-control border bg-white p-5 sm:p-7">
          <p className="text-sm text-muted-foreground">
            {isChainNotConfigured
              ? 'Jaringan belum tersedia'
              : formatApiError(contractQuery.error).message}
          </p>
          {contractQuery.error?.requestId && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              ID permintaan: {contractQuery.error.requestId}
            </p>
          )}
          <button
            type="button"
            onClick={() => void contractQuery.refetch()}
            className="mt-3 min-h-11 rounded-control border px-4 py-2 text-xs text-primary hover:bg-secondary"
          >
            Coba lagi
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-control border bg-white p-5 sm:p-7">
            <dl>
              <div className="grid gap-2 border-b py-4 sm:grid-cols-[240px_1fr]">
                <dt className="text-xs text-muted-foreground">Contract address</dt>
                <dd className="flex flex-wrap items-center gap-2 break-all font-mono text-xs">
                  <span>{contract.address}</span>
                  <button
                    type="button"
                    aria-label="Salin alamat kontrak"
                    onClick={() =>
                      void copyText(contract.address, 'Alamat kontrak disalin', 'Gagal menyalin.')
                    }
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border p-2 text-primary"
                  >
                    <Copy size={14} />
                  </button>
                  {copied && <span className="text-muted-foreground">{copied}</span>}
                </dd>
              </div>
              <div className="grid gap-2 border-b py-4 sm:grid-cols-[240px_1fr]">
                <dt className="text-xs text-muted-foreground">authorizedWallet</dt>
                <dd className="break-all font-mono text-xs">
                  {contract.authorizedWallet ? (
                    <Link
                      href={`/explorer/address/${contract.authorizedWallet}`}
                      className="text-primary hover:underline"
                    >
                      {contract.authorizedWallet}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="grid gap-2 border-b py-4 sm:grid-cols-[240px_1fr]">
                <dt className="text-xs text-muted-foreground">owner</dt>
                <dd className="break-all font-mono text-xs">{contract.owner ?? '—'}</dd>
              </div>
              <div className="grid gap-2 border-b py-4 sm:grid-cols-[240px_1fr]">
                <dt className="text-xs text-muted-foreground">Status jeda (paused)</dt>
                <dd className="font-mono text-xs">
                  {contract.paused === null
                    ? '—'
                    : contract.paused
                      ? 'true · Dijeda'
                      : 'false · Tidak dijeda'}
                </dd>
              </div>
              <div className="grid gap-2 py-4 sm:grid-cols-[240px_1fr]">
                <dt className="text-xs text-muted-foreground">Chain ID</dt>
                <dd className="font-mono text-xs">{contract.chainId ?? '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-control border bg-white p-5 sm:p-7">
            <details>
              <summary className="cursor-pointer font-semibold">ABI kontrak</summary>
              <pre className="mt-4 overflow-x-auto bg-secondary/40 p-4 text-xs">
                {JSON.stringify(contract.abi, null, 2)}
              </pre>
            </details>
            <button
              type="button"
              onClick={downloadAbi}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-control border px-4 py-2 text-sm text-primary hover:bg-secondary"
            >
              <Download size={15} aria-hidden="true" />
              Unduh ABI
            </button>
          </section>
        </>
      )}
    </main>
  )
}
