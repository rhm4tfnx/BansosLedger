'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import useSWR from 'swr'
import { hexlify, toUtf8Bytes } from 'ethers'
import { hasPermission } from '@/lib/rbac'
import { getWalletProvider, useConnectedWallet } from '@/hooks/use-connected-wallet'
import type { Role } from '@/types/rbac'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Wallet,
  ShieldCheck,
  Network,
  FileSignature,
  ArrowUpRight,
} from 'lucide-react'

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function LoginPanel() {
  // Mount credential fields after hydration so password-manager injections cannot alter the SSR tree.
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const [tab, setTab] = useState<'account' | 'wallet'>('account')
  const [visible, setVisible] = useState(false)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  function dashboardDestination() {
    const next = new URLSearchParams(window.location.search).get('next')
    return next && /^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(next) ? next : '/dashboard'
  }
  async function handleCredentialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setNotice('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message ?? 'Login gagal.')
      setPassword('')
      await mutate()
      if (data.role === 'OPERATOR_KELURAHAN') setNotice('Sesi Operator Kelurahan aktif. Masuk ke dashboard atau lanjutkan verifikasi wallet.')
      else { router.push(dashboardDestination()); router.refresh() }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Tidak dapat menghubungi server.') }
    finally { setIsSubmitting(false) }
  }
  const { data: session, mutate } = useSWR<{ role: Role | null }>('/api/auth/session', async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Tidak dapat memeriksa sesi.')
    return response.json()
  })
  const wallet = useConnectedWallet()
  const canVerifyWallet = hasPermission(session?.role, 'wallet:verify-session')
  const [verifying, setVerifying] = useState(false)
  async function verifyWallet() {
    if (!canVerifyWallet || !wallet.address || verifying) return
    setVerifying(true)
    try {
      const provider = getWalletProvider()
      if (!provider) throw new Error('MetaMask tidak tersedia.')
      const response = await fetch('/api/auth/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: wallet.address, chainId: wallet.chainId }) })
      const challenge = await response.json()
      if (!response.ok) throw new Error(challenge.message)
      const signature = await provider.request({ method: 'personal_sign', params: [hexlify(toUtf8Bytes(challenge.message)), wallet.address] })
      const chainId = await provider.request({ method: 'eth_chainId' })
      const result = await fetch('/api/auth/wallet', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: wallet.address, chainId, signature }) })
      const verified = await result.json()
      if (!result.ok) throw new Error(verified.message)
      await mutate()
      setNotice('Kepemilikan wallet telah diverifikasi server. Sesi diperbarui.')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Verifikasi gagal.') }
    finally { setVerifying(false) }
  }
  const [wrongNetwork, setWrongNetwork] = useState(false)
  const [notice, setNotice] = useState('')
  const buttonClass =
    'flex min-h-12 w-full items-center justify-center gap-3 rounded-control bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover'
  const previewNotice =
    'Pilih jaringan Besu melalui MetaMask, kemudian ulangi pemeriksaan wallet.'

  return (
    <section aria-label="Login pengelola" className="border bg-surface">
      <div className="grid grid-cols-2 border-b" aria-label="Pratinjau tahap login">
        {(
          [
            { id: 'account', label: '01 / Akun', icon: LockKeyhole },
            { id: 'wallet', label: '02 / Verifikasi wallet', icon: Wallet },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={id === 'wallet' && !canVerifyWallet}
            title={id === 'wallet' && !canVerifyWallet ? 'Sesi akun terverifikasi dengan izin wallet:verify-session diperlukan.' : undefined}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id)
              setNotice('')
            }}
            className={`flex min-h-16 items-center justify-center gap-2 border-b-2 px-3 font-mono text-xs transition-colors first:border-r ${tab === id ? 'border-b-primary bg-primary/5 text-primary' : 'border-b-transparent text-body-copy hover:bg-background'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <div className="p-6 sm:p-8">
        {tab === 'account' ? (
          <>
            <h2 className="text-xl font-semibold">Masuk ke akun Anda</h2>
            <p className="mb-7 mt-2 text-sm leading-6 text-body-copy">
              Gunakan kredensial yang diberikan administrator.
            </p>
            {hydrated ? (
              <form
                onSubmit={handleCredentialSubmit}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="login-email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    data-lpignore="true"
                    type="email"
                    autoComplete="username"
                    required
                    placeholder="nama@instansi.go.id"
                    className="min-h-12 w-full rounded-control border bg-surface px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="mb-2 block text-sm font-medium">
                    Kata sandi
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      data-lpignore="true"
                      type={visible ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Masukkan kata sandi"
                      className="min-h-12 w-full rounded-control border bg-surface py-3 pl-4 pr-12 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                    <button
                      type="button"
                      aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-body-copy hover:text-primary"
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button disabled={isSubmitting} className={buttonClass} type="submit">
                  {isSubmitting ? 'Memverifikasi…' : 'Masuk ke Dashboard'}
                  <ArrowRight size={17} />
                </button>
              </form>
            ) : (
              <div className="h-60" role="status" aria-live="polite" aria-busy="true">
                <span className="sr-only">Memuat formulir login</span>
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-body-copy">
              Lupa kata sandi? Hubungi administrator instansi untuk pemulihan akun.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold">Verifikasi kepemilikan wallet</h2>
            <p className="mt-2 text-sm leading-6 text-body-copy">
              Setelah akun terverifikasi, hubungkan wallet yang terdaftar untuk role Anda.
            </p>
            <div className="my-6 flex items-center justify-between gap-3 border bg-background/50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Network size={17} className="text-primary" />
                Jaringan Besu
              </div>
              <span className="font-mono text-[10px] text-body-copy">
                {wrongNetwork ? 'JARINGAN TIDAK SESUAI' : 'BELUM TERHUBUNG'}
              </span>
            </div>
            <button type="button" disabled={!canVerifyWallet || verifying} className={buttonClass} onClick={wallet.connect}>
              <Wallet size={18} />
              Connect MetaMask
              <ArrowUpRight size={16} />
            </button>
            <div className="mt-5 border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileSignature size={17} className="text-primary" />
                Tanda tangani pesan nonce
              </div>
              <p className="mt-2 text-xs leading-5 text-body-copy">
                Pesan unik membuktikan kepemilikan wallet. Ini bukan transaksi dan tidak memerlukan
                biaya gas. Wallet kemudian dicocokkan dengan role pada registri.
              </p>
              <button
                type="button"
                disabled={!canVerifyWallet || !wallet.address || verifying}
                onClick={verifyWallet}
                className="mt-4 min-h-11 w-full cursor-not-allowed rounded-control border bg-background px-3 text-sm text-body-copy"
              >
                {verifying ? 'Memverifikasi tanda tangan…' : wallet.address ? 'Tanda tangani nonce server' : 'Hubungkan wallet terlebih dahulu'}
              </button>
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-xs text-body-copy">
              <input
                type="checkbox"
                checked={wrongNetwork}
                onChange={(event) => {
                  setWrongNetwork(event.target.checked)
                  setNotice('')
                }}
                className="size-4 accent-primary"
              />
              Pratinjau kondisi: chain ID tidak sesuai
            </label>
            {wrongNetwork && (
              <div className="mt-4 border border-primary/30 bg-primary/5 p-4">
                <p className="mb-3 text-xs leading-5 text-body-copy">
                  Wallet berada di jaringan yang berbeda. Beralih ke jaringan Besu sebelum
                  melanjutkan verifikasi.
                </p>
                <button
                  type="button"
                  onClick={() => setNotice(previewNotice)}
                  className={buttonClass}
                >
                  Switch ke jaringan Besu
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
        {canVerifyWallet && <div className="mt-5 flex flex-wrap gap-3"><button className={buttonClass} onClick={() => { router.push(dashboardDestination()); router.refresh() }}>Masuk ke Dashboard</button><button onClick={() => setTab('wallet')} className="text-sm text-primary underline">Lanjut verifikasi wallet</button></div>}
        {process.env.NODE_ENV !== 'production' && tab === 'account' && <div className="mt-5 space-y-2 border p-3 text-xs"><p>Pengujian akun instansi — isi kata sandi sesuai konfigurasi server.</p>{[
          ['Operator Kelurahan', 'operator@takkalasi.barru.go.id'], ['Kecamatan Balusu', 'monitoring@balusu.barru.go.id'], ['Dinas Sosial', 'verifikasi@dinsos.barru.go.id'],
        ].map(([label, address]) => <button key={address} type="button" className="mr-2 rounded border p-2" onClick={() => { setEmail(address); setPassword('') }}>{label}</button>)}</div>}
        <p
          role="status"
          className={
            notice
              ? 'mt-5 border-l-2 border-primary bg-background p-3 text-xs leading-5 text-body-copy'
              : 'sr-only'
          }
        >
          {notice}
        </p>
        <div className="mt-7 flex gap-3 border-t pt-5">
          <ShieldCheck size={20} className="shrink-0 text-primary" />
          <div>
            <p className="text-xs font-medium">Dirancang untuk akses yang terlindungi</p>
            <p className="mt-1 text-xs leading-5 text-body-copy">
              Sesi menggunakan cookie httpOnly, masa berlaku terbatas, dan logout. Role ditentukan server. Pembatasan percobaan login terdistribusi dan pencabutan sesi terpusat masih diperlukan sebelum production.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t bg-background/40 px-6 py-5 text-center text-xs text-body-copy">
        Hanya ingin memantau bantuan?{' '}
        <Link
          href="/transparansi"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Lihat transparansi publik
        </Link>
      </div>
    </section>
  )
}
