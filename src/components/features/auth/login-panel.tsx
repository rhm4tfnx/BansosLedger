'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
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
  const [wrongNetwork, setWrongNetwork] = useState(false)
  const [notice, setNotice] = useState('')
  const buttonClass =
    'flex min-h-12 w-full items-center justify-center gap-3 rounded-control bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover'
  const previewNotice =
    'Ini pratinjau tampilan. Login, koneksi MetaMask, tanda tangan, dan pergantian jaringan belum diaktifkan.'

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
                onSubmit={(event) => {
                  event.preventDefault()
                  setNotice(previewNotice)
                }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="login-email"
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
                <button className={buttonClass} type="submit">
                  Masuk & lanjutkan
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
            <button type="button" className={buttonClass} onClick={() => setNotice(previewNotice)}>
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
                disabled
                className="mt-4 min-h-11 w-full cursor-not-allowed rounded-control border bg-background px-3 text-sm text-body-copy"
              >
                Hubungkan wallet terlebih dahulu
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
              Implementasi backend akan menggunakan cookie httpOnly, timeout sesi, logout,
              pembatasan percobaan login, dan pesan error yang tidak mengungkap data akun.
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
