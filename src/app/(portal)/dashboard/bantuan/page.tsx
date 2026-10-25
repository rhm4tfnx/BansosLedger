import type { Metadata } from 'next'
import { Programs } from '@/components/features/dashboard/programs/programs'
export const metadata: Metadata = {
  title: 'Program Bantuan | BansosLedger',
  description:
    'Manajemen program bantuan sosial, pagu anggaran, kuota penerima, dan simulasi validasi penyaluran Kelurahan Takkalasi.',
  robots: { index: false, follow: false },
}
export default function Page() {
  return (
    <>
      <>
        <Programs />
      </>
    </>
  )
}
