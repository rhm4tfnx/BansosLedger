'use client'

import type { ReactNode } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeftRight,
  Loader2,
  PlugZap,
  UserX,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNetworkStatusQuery } from '@/lib/api/hooks/chain'
import { shortenHash } from '@/lib/format'
import { useWallet } from '@/lib/wallet'
import type { NetworkStatusType } from '@/lib/api-contract'

export interface WalletGateProps {
  children: ReactNode
  boundWalletAddress?: string | null
  networkStatus?: NetworkStatusType | null
  enableNetworkQuery?: boolean
  enableSessionQuery?: boolean
  estimatedBlockSeconds?: number
}

export function WalletGate({
  children,
  boundWalletAddress,
  networkStatus: explicitNetworkStatus,
  enableNetworkQuery = false,
  enableSessionQuery = true,
  estimatedBlockSeconds = 4,
}: WalletGateProps) {
  const wallet = useWallet({
    boundWalletAddress,
    enableSessionQuery,
  })

  const networkQuery = useNetworkStatusQuery({
    enabled: explicitNetworkStatus === undefined && enableNetworkQuery,
  })

  const resolvedNetworkStatus =
    explicitNetworkStatus !== undefined
      ? explicitNetworkStatus
      : (networkQuery.data?.status ?? null)

  const feedbackBanner =
    wallet.wasRejected || wallet.lastError ? (
      <div
        role="alert"
        aria-live="assertive"
        className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      >
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
          <span>{wallet.lastError ?? 'Transaksi dibatalkan di wallet'}</span>
        </div>
        <button
          type="button"
          aria-label="Tutup pesan wallet"
          onClick={wallet.clearWalletFeedback}
          className="inline-flex size-6 items-center justify-center rounded-md text-amber-900 hover:bg-amber-100"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    ) : null

  // 1. Network stopped (PRD 13.2 rule 6)
  if (resolvedNetworkStatus === 'Berhenti') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex flex-col gap-2 rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-950"
      >
        <div className="flex items-center gap-2 font-semibold">
          <AlertOctagon className="size-5 shrink-0 text-red-700" aria-hidden="true" />
          <span>Jaringan blockchain sedang berhenti</span>
        </div>
        <p className="text-xs text-red-900/90">
          Node konsorsium Hyperledger Besu tidak memproduksi blok baru saat ini. Penandatanganan
          transaksi ditangguhkan sementara hingga konsensus kembali normal.
        </p>
      </div>
    )
  }

  // 2. No MetaMask installed (PRD 13.2 rule 6)
  if (wallet.status === 'unavailable') {
    return (
      <div
        role="region"
        aria-label="Status Wallet"
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-900"
      >
        <div className="flex items-center gap-2 font-semibold">
          <Wallet className="size-5 shrink-0 text-slate-700" aria-hidden="true" />
          <span>MetaMask tidak terdeteksi</span>
        </div>
        <p className="text-xs text-slate-600">
          Ekstensi wallet MetaMask diperlukan untuk menandatangani transaksi penyaluran tanpa
          menyimpan kunci privat di server maupun peramban. Pasang ekstensi MetaMask lalu muat
          ulang halaman ini.
        </p>
      </div>
    )
  }

  // 3. Disconnected (PRD 13.2 rule 6)
  if (wallet.status === 'disconnected') {
    return (
      <div>
        {feedbackBanner}
        <div
          role="region"
          aria-label="Hubungkan Wallet"
          className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-sm"
        >
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <PlugZap className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>Wallet belum terhubung</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Hubungkan akun MetaMask resmi instansi Anda sebelum menandatangani transaksi on-chain.
          </p>
          <Button
            type="button"
            onClick={() => {
              void wallet.connect().catch(() => {})
            }}
          >
            Hubungkan MetaMask
          </Button>
        </div>
      </div>
    )
  }

  // 4. Wrong network + switch button (PRD 13.2 rule 6)
  if (wallet.status === 'wrong-chain') {
    return (
      <div>
        {feedbackBanner}
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-5 text-sm text-amber-950"
        >
          <div className="flex items-center gap-2 font-semibold">
            <ArrowLeftRight className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
            <span>Jaringan wallet tidak sesuai</span>
          </div>
          <p className="text-xs text-amber-900/90">
            MetaMask saat ini terhubung ke Chain ID{' '}
            <strong className="font-mono">{wallet.chainId ?? 'tidak diketahui'}</strong>, sedangkan
            BansosLedger membutuhkan Chain ID{' '}
            <strong className="font-mono">{wallet.expectedChainId ?? '—'}</strong>.
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
            onClick={() => {
              void wallet.ensureChain().catch(() => {})
            }}
          >
            Pindah ke Jaringan Besu
          </Button>
        </div>
      </div>
    )
  }

  // 5. Wrong account compared to session.boundWalletAddress (PRD FR-AUTH-09 & 13.2 rule 6)
  if (wallet.status === 'wrong-account') {
    return (
      <div>
        {feedbackBanner}
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/80 p-5 text-sm text-red-950"
        >
          <div className="flex items-center gap-2 font-semibold">
            <UserX className="size-5 shrink-0 text-red-700" aria-hidden="true" />
            <span>Akun MetaMask tidak sesuai</span>
          </div>
          <p className="text-xs text-red-900/90">
            Akun aktif di MetaMask (
            <strong className="font-mono">{shortenHash(wallet.address)}</strong>) berbeda dengan
            wallet yang terikat pada sesi Anda (
            <strong className="font-mono">{shortenHash(wallet.boundWalletAddress)}</strong>).
            Silakan ganti akun di ekstensi MetaMask.
          </p>
        </div>
      </div>
    )
  }

  // 6. Waiting for block with spinner + estimate + aria-live (PRD 13.2 rule 6)
  if (wallet.pendingTx) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex flex-col gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm text-foreground"
      >
        <div className="flex items-center gap-2.5 font-semibold">
          <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          <span>
            {wallet.pendingTx.hash
              ? 'Menunggu konfirmasi blok…'
              : 'Menunggu tanda tangan di MetaMask…'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Estimasi waktu konfirmasi blok Hyperledger Besu sekitar ~{estimatedBlockSeconds} detik.
          Jangan menutup jendela ini hingga status transaksi terverifikasi.
        </p>
        {wallet.pendingTx.hash && (
          <small className="font-mono text-xs text-muted-foreground">
            Tx Hash: {shortenHash(wallet.pendingTx.hash, 10, 8)}
          </small>
        )}
      </div>
    )
  }

  // 7. Ready (with optional rejected/error banner if previous attempt was cancelled by user)
  return (
    <div>
      {feedbackBanner}
      {children}
    </div>
  )
}

