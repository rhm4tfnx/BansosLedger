import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ActivityLog } from '@/components/features/dashboard/audit-log/activity-log'
import { TableSkeleton } from '@/components/features/dashboard/shared/states'
export const metadata: Metadata = {
  title: 'Log Aktivitas & Jejak Audit | BansosLedger',
  description: 'Pusat log aktivitas operasional, transaksi, dan rekonsiliasi BansosLedger.',
}
export default function Page() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ActivityLog />
    </Suspense>
  )
}
