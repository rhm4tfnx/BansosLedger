import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import { Dashboard } from '@/components/features/dashboard/dashboard'
import { Recipients } from '@/components/features/dashboard/recipients'
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-dashboard' })
export const metadata: Metadata = {
  title: 'Penerima Bantuan | BansosLedger',
  description: 'Pengelolaan penerima bantuan sosial Kelurahan Takkalasi.',
  robots: { index: false, follow: false },
}
export default function Page() {
  return (
    <div className={outfit.variable}>
      <Dashboard>
        <Recipients />
      </Dashboard>
    </div>
  )
}
