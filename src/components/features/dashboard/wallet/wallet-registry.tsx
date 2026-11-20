'use client'

import { useState } from 'react'
import { Copy, LockKeyhole, RotateCw, Wallet } from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { ApiClientError, formatApiError } from '@/lib/api/errors'
import {
  useSession,
  useWalletBindMutation,
  useWalletNonceMutation,
} from '@/lib/api/hooks/auth'
import { useWalletStatusQuery } from '@/lib/api/hooks/chain'
import { formatWalletError, getExpectedChainId, toHexChainId, useWallet } from '@/lib/wallet'
import { WalletPanels } from '@/components/features/dashboard/wallet/wallet-panels'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
import w from '@/components/features/dashboard/wallet/wallet.module.css'

const ROTATION_DOC_SNIPPET = `// Dokumentasi administrasi Contract Owner (Hardhat / ethers v6)
const registry = await ethers.getContractAt("BansosLedger", contractAddress, ownerSigner);
const tx = await registry.setAuthorizedWallet(newKelurahanWalletAddress);
await tx.wait(1);`

const CONTRACT_GUARD_SNIPPET = `// Pengaman kontrak pintar BansosLedger.sol (Solidity 0.8.24)
error UnauthorizedCaller(address caller);
error RenounceDisabled();

function renounceOwnership() public pure override {
  revert RenounceDisabled();
}`

export function WalletRegistry() {
  const { can } = useRoleAccess()
  const sessionQuery = useSession()
  const walletQuery = useWalletStatusQuery()
  const browserWallet = useWallet()
  const nonceMutation = useWalletNonceMutation()
  const bindMutation = useWalletBindMutation()
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [binding, setBinding] = useState(false)

  const wallet = walletQuery.data
  const authorizedWallet = wallet?.authorizedWallet ?? null
  const boundWallet = wallet?.boundWallet ?? sessionQuery.data?.boundWalletAddress ?? null
  const boundWalletShort = wallet?.boundWalletShort ?? (boundWallet ? `${boundWallet.slice(0, 6)}…${boundWallet.slice(-4)}` : '-')
  const sessionVerified = Boolean(sessionQuery.data?.walletVerified)
  const activeBrowserAddress = browserWallet.address
  const boundMatchesAuthorized =
    Boolean(boundWallet && authorizedWallet) &&
    boundWallet?.toLowerCase() === authorizedWallet?.toLowerCase()
  const activeAccountMismatchesAuthorized =
    Boolean(activeBrowserAddress && authorizedWallet) &&
    activeBrowserAddress?.toLowerCase() !== authorizedWallet?.toLowerCase()
  const sessionWalletCompliant =
    sessionVerified && boundMatchesAuthorized && !activeAccountMismatchesAuthorized

  const complianceReason = sessionWalletCompliant
    ? '✓ Terverifikasi sesi'
    : activeAccountMismatchesAuthorized
      ? sessionVerified
        ? '× Akun MetaMask aktif bukan wallet resmi'
        : '× Belum diverifikasi · Akun MetaMask aktif bukan wallet resmi'
      : !sessionVerified
        ? '× Belum diverifikasi'
        : !boundWallet
          ? '× Wallet sesi belum terikat'
          : '× Wallet sesi berbeda dari wallet resmi'

  async function handleBindWallet() {
    if (binding) return
    setBinding(true)
    setNotice(null)
    try {
      const connectedAddress = browserWallet.address ?? (await browserWallet.connect())
      if (!connectedAddress) {
        setNotice({ tone: 'error', message: 'Hubungkan wallet MetaMask terlebih dahulu.' })
        return
      }
      const numericChainId =
        browserWallet.chainId ?? wallet?.chainId ?? getExpectedChainId() ?? 250204
      const chainIdHex = toHexChainId(numericChainId)

      const { message } = await nonceMutation.mutateAsync({
        address: connectedAddress,
        chainId: chainIdHex,
      })
      const signature = await browserWallet.signMessage(message, connectedAddress)
      await bindMutation.mutateAsync({
        address: connectedAddress,
        chainId: chainIdHex,
        message,
        signature,
      })
      await Promise.all([sessionQuery.refetch(), walletQuery.refetch()])
      setNotice({ tone: 'success', message: 'Wallet sesi Kelurahan berhasil diikat dan diverifikasi.' })
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? formatApiError(err).message
          : formatWalletError(err, 'Gagal mengikat wallet sesi.')
      setNotice({ tone: 'error', message })
    } finally {
      setBinding(false)
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice({ tone: 'success', message: 'Teks dokumentasi berhasil disalin.' })
    } catch {
      setNotice({ tone: 'error', message: 'Gagal menyalin teks ke papan klip.' })
    }
  }

  return (
    <div className={s.page}>
      <div className={s.breadcrumb}>Dashboard / Tata kelola / Registri wallet</div>
      <section className={s.card}>
        <div className={s.labels}>
          <span className={s.badge}>/dashboard/wallet</span>
          <span className={s.badge}>
            <LockKeyhole size={12} /> Kontrak pintar read-only
          </span>
        </div>
        <div className={s.heading}>
          <div>
            <h1>Registri Wallet &amp; Matriks Peran</h1>
            <p>
              Status langsung otorisasi wallet pada kontrak pintar, kepemilikan kontrak, serta ikatan wallet sesi.
            </p>
          </div>
          <div className={s.actions}>
            <button onClick={() => void walletQuery.refetch()} disabled={walletQuery.isFetching}>
              <RotateCw size={15} />
              {walletQuery.isFetching ? 'Memuat…' : 'Muat ulang'}
            </button>
            {can('wallet:verify-session') && (
              <button
                type="button"
                className={s.primary}
                disabled={binding || nonceMutation.isPending || bindMutation.isPending}
                onClick={() => void handleBindWallet()}
              >
                <Wallet size={15} />
                {binding ? 'Mengikat wallet…' : 'Ikat wallet sesi'}
              </button>
            )}
          </div>
        </div>
      </section>

      {notice && (
        <div
          className={notice.tone === 'error' ? w.noticeError : w.noticeSuccess}
          role={notice.tone === 'error' ? 'alert' : 'status'}
          aria-live={notice.tone === 'error' ? 'assertive' : 'polite'}
        >
          {notice.message}
        </div>
      )}

      <section className={s.card} aria-label="Status kontrak dan wallet">
        <div className={s.heading}>
          <div>
            <span className={s.eyebrow}>BAGIAN 1 · STATUS ON-CHAIN &amp; SESI</span>
            <h2>Konfigurasi wallet kontrak &amp; sesi pengguna</h2>
          </div>
          {wallet && (
            <span className={s.badge}>
              {wallet.networkOk === true
                ? '✓ Jaringan siap'
                : wallet.networkOk === false
                  ? '× Jaringan tidak siap'
                  : '- Status jaringan belum diketahui'}
            </span>
          )}
        </div>

        {walletQuery.isPending ? (
          <TableSkeleton rows={4} label="Memuat status registri wallet" />
        ) : walletQuery.isError ? (
          <ErrorState error={walletQuery.error} onRetry={() => void walletQuery.refetch()} />
        ) : !wallet ? (
          <EmptyState>Status wallet belum tersedia.</EmptyState>
        ) : (
          <>
            <div className={s.metrics}>
              <article className={s.card}>
                <small>Chain ID</small>
                <strong className={s.number}>{wallet.chainId === null ? '-' : wallet.chainId}</strong>
                <span className={s.badge}>Hyperledger Besu QBFT</span>
              </article>
              <article className={s.card}>
                <small>Status kontrak (paused)</small>
                <strong className={s.number}>
                  {wallet.paused === null ? '-' : wallet.paused ? 'Dijeda' : 'Aktif'}
                </strong>
                <span className={s.badge}>
                  {wallet.paused === null
                    ? 'Tidak diketahui'
                    : wallet.paused
                      ? '⚠ Transaksi dihentikan sementara'
                      : '✓ Kontrak menerima transaksi'}
                </span>
              </article>
              <article className={s.card}>
                <small>Kesehatan koneksi jaringan</small>
                <strong className={s.number}>
                  {wallet.networkOk === null ? '-' : wallet.networkOk ? 'Normal' : 'Terganggu'}
                </strong>
                <span className={s.badge}>Pemeriksaan RPC server</span>
              </article>
              <article className={s.card}>
                <small>Kesesuaian wallet sesi</small>
                <strong
                  className={`${s.number} ${sessionWalletCompliant ? w.green : w.red}`}
                >
                  {sessionWalletCompliant ? 'Sesuai' : 'Tidak sesuai'}
                </strong>
                <span className={sessionWalletCompliant ? w.authorized : w.revoked}>
                  {complianceReason}
                </span>
              </article>
            </div>

            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Peran kriptografis</th>
                    <th>Alamat</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <h3>Authorized Wallet Kelurahan</h3>
                      <small>Penandatangan penyaluran resmi</small>
                    </td>
                    <td>
                      <HashLink
                        hash={wallet.authorizedWallet}
                        short={wallet.authorizedWalletShort}
                        kind="address"
                      />
                    </td>
                    <td>
                      <span className={wallet.authorizedWallet ? w.authorized : s.badge}>
                        {wallet.authorizedWallet ? '✓ TERDAFTAR' : '- BELUM DIATUR'}
                      </span>
                    </td>
                    <td>Alamat tunggal yang diizinkan memanggil pencatatan penyaluran on-chain.</td>
                  </tr>
                  <tr>
                    <td>
                      <h3>Contract Owner</h3>
                      <small>Ownable2Step · tanpa renounce</small>
                    </td>
                    <td>
                      <HashLink hash={wallet.owner} short={wallet.ownerShort} kind="address" />
                    </td>
                    <td>
                      <span className={wallet.owner ? w.authorized : s.badge}>
                        {wallet.owner ? '✓ AKTIF' : '- TIDAK TERSEDIA'}
                      </span>
                    </td>
                    <td>Mengelola konfigurasi kontrak dan rotasi wallet resmi secara dua tahap.</td>
                  </tr>
                  <tr>
                    <td>
                      <h3>Wallet Terikat pada Sesi</h3>
                      <small>Sesi autentikasi saat ini</small>
                    </td>
                    <td>
                      <HashLink hash={boundWallet} short={boundWalletShort} kind="address" />
                    </td>
                    <td>
                      <span className={sessionWalletCompliant ? w.authorized : w.revoked}>
                        {sessionWalletCompliant
                          ? '✓ COCOK DENGAN WALLET RESMI'
                          : activeAccountMismatchesAuthorized
                            ? '× AKUN METAMASK TIDAK COCOK'
                            : !boundWallet
                              ? '- BELUM TERIKAT'
                              : !sessionVerified
                                ? '× BELUM DIVERIFIKASI'
                                : '⚠ TIDAK COCOK'}
                      </span>
                    </td>
                    <td>
                      {can('wallet:verify-session')
                        ? 'Pengikatan tanda tangan wallet sesi dikelola melalui alur verifikasi operator.'
                        : 'Peran pemantauan baca-saja tidak memerlukan pengikatan wallet.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <WalletPanels />

      <section className={s.card} id="mekanisme-wallet">
        <div className={s.heading}>
          <div>
            <span className={s.eyebrow}>DOKUMENTASI TATA KELOLA KONTRAK</span>
            <h2>Mekanisme rotasi wallet &amp; perlindungan kepemilikan</h2>
          </div>
        </div>
        <p>
          Perubahan alamat penandatangan resmi tidak pernah dilakukan dari antarmuka web, melainkan
          melalui transaksi administratif Contract Owner yang tercatat permanen pada blok.
        </p>
        <div className={s.columns}>
          <div>
            <div className={s.heading}>
              <h3>Contoh skrip rotasi administratif</h3>
              <button type="button" onClick={() => void copyText(ROTATION_DOC_SNIPPET)}>
                <Copy size={12} /> Salin skrip
              </button>
            </div>
            <pre className={w.terminal}>{ROTATION_DOC_SNIPPET}</pre>
          </div>
          <div>
            <h3>Perlindungan kontrak pintar BansosLedger.sol</h3>
            <pre className={w.terminal}>{CONTRACT_GUARD_SNIPPET}</pre>
          </div>
        </div>
      </section>
    </div>
  )
}
