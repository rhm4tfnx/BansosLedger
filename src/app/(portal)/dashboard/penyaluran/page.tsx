import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Disbursements } from '@/components/features/dashboard/disbursements/disbursements'
import { TableSkeleton } from '@/components/features/dashboard/shared/states'

export const metadata: Metadata = {
  title: 'Penyaluran & IPFS | BansosLedger',
  description:
    'Dashboard pencatatan penyaluran bantuan sosial, bukti IPFS, dan verifikasi blockchain.',
}
export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <Disbursements />
    </Suspense>
  )
}
