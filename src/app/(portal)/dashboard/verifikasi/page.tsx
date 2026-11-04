import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Verification } from '@/components/features/dashboard/verification/verification'
import { TableSkeleton } from '@/components/features/dashboard/shared/states'
export const metadata: Metadata = {
  title: 'Verifikasi Integritas | BansosLedger',
  description:
    'Rekonsiliasi riwayat transaksi off-chain dan event on-chain BansosLedger.',
}
export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <Verification />
    </Suspense>
  )
}
