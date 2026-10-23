import type { Metadata } from 'next'
import { NetworkMonitoring } from '@/components/features/dashboard/monitoring/network-monitoring'
export const metadata: Metadata = {
  title: 'Status jaringan | BansosLedger',
  description:
    'Monitoring validator institusional, konsensus QBFT, kesehatan JSON-RPC dan simulasi fail-safe jaringan BansosLedger.',
}
export default function Page() {
  return <NetworkMonitoring />
}
