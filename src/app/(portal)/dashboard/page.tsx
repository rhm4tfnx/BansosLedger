import type { Metadata } from 'next'
import { Dashboard } from '@/components/features/dashboard/overview/dashboard'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-dashboard' })

export const metadata: Metadata = {
  title: 'Dashboard Pengelola | BansosLedger',
  description: 'Ringkasan penyaluran bantuan sosial, transaksi, dan jaringan BansosLedger.',
  robots: { index: false, follow: false },
}

export default function DashboardPage() {
  return (
    <div className={outfit.variable}>
      <Dashboard />
    </div>
  )
}
