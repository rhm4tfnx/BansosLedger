import type { Metadata } from 'next'
import { ActivityLog } from '@/components/features/dashboard/activity-log'
export const metadata: Metadata = {
  title: 'Log Aktivitas & Jejak Audit | BansosLedger',
  description: 'Pusat log aktivitas operasional, transaksi, dan rekonsiliasi BansosLedger.',
}
export default function Page() {
  return <ActivityLog />
}
