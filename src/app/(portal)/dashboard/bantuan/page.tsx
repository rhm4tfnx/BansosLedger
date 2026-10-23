import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import { Dashboard } from '@/components/features/dashboard/overview/dashboard'
import { Programs } from '@/components/features/dashboard/programs/programs'
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-dashboard' })
export const metadata: Metadata = {
  title: 'Program Bantuan | BansosLedger',
  description:
    'Manajemen program bantuan sosial, pagu anggaran, kuota penerima, dan simulasi validasi penyaluran Kelurahan Takkalasi.',
  robots: { index: false, follow: false },
}
export default function Page() {
  return (
    <div className={outfit.variable}>
      <Dashboard section="Program Bantuan">
        <Programs />
      </Dashboard>
    </div>
  )
}
