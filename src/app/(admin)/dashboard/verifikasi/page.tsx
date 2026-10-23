import type { Metadata } from 'next'
import { Verification } from '@/components/features/dashboard/verification'
export const metadata: Metadata = {
  title: 'Verifikasi Integritas | BansosLedger',
  description:
    'Rekonsiliasi riwayat transaksi, verifikasi CID IPFS, dan pemeriksaan kebutuhan jejak audit BansosLedger.',
}
export default function Page() {
  return <Verification />
}
