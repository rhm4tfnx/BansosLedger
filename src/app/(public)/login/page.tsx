import type { Metadata } from 'next'
import { LoginPanel } from '@/components/features/auth/login-panel'

export const metadata: Metadata = {
  title: 'Login | BansosLedger',
  description:
    'Akses pengelolaan bantuan sosial melalui akun terdaftar dan verifikasi kepemilikan wallet.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <>
      <a href="#main" className="fixed -top-20 left-5 z-50 bg-surface p-3 text-primary focus:top-3">
        Lewati ke konten
      </a>
      <main id="main" className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-lg">
          <h1 className="sr-only">Login BansosLedger</h1>
          <LoginPanel />
          <p className="mt-6 text-center font-mono text-xs leading-6 text-body-copy">
            Data publik tetap terbuka, tanpa perlu masuk.
          </p>
        </div>
      </main>
    </>
  )
}
