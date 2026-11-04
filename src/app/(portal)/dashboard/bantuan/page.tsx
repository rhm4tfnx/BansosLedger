import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Programs } from '@/components/features/dashboard/programs/programs'
import { TableSkeleton } from '@/components/features/dashboard/shared/states'
export const metadata: Metadata = {
  title: 'Program Bantuan | BansosLedger',
  description:
    'Manajemen program bantuan sosial, pagu anggaran, kuota penerima, dan realisasi penyaluran Kelurahan Takkalasi.',
  robots: { index: false, follow: false },
}
export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <Programs />
    </Suspense>
  )
}
