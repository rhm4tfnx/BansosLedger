import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Reports } from '@/components/features/dashboard/reports/reports'
import { TableSkeleton } from '@/components/features/dashboard/shared/states'

export const metadata: Metadata = {
  title: 'Laporan Realisasi | BansosLedger',
  description:
    'Rekap realisasi bantuan, rekonsiliasi data, dan ekspor laporan Kelurahan Takkalasi.',
}

export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <Reports />
    </Suspense>
  )
}
