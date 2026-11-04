import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Recipients } from '@/components/features/dashboard/recipients/recipients'
import { TableSkeleton } from '@/components/features/dashboard/shared/states'
export const metadata: Metadata = {
  title: 'Penerima Bantuan | BansosLedger',
  description: 'Pengelolaan penerima bantuan sosial Kelurahan Takkalasi.',
  robots: { index: false, follow: false },
}
export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <Recipients />
    </Suspense>
  )
}
