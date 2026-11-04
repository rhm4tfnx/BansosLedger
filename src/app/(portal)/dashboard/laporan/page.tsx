import type { Metadata } from 'next'
import { Reports } from '@/components/features/dashboard/reports/reports'

export const metadata: Metadata = {
  title: 'Laporan Realisasi | BansosLedger',
  description:
    'Rekap realisasi bantuan, laporan realisasi, pelaporan berjenjang, rekonsiliasi dan ekspor laporan Kelurahan Takkalasi. Pratinjau frontend dengan data contoh.',
}

export default function Page() {
  return <Reports />
}
