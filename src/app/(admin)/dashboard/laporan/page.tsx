import type { Metadata } from 'next'
import { Reports } from '@/components/features/dashboard/reports'

export const metadata: Metadata = {
  title: 'Laporan & LPJ | BansosLedger',
  description:
    'Rekap realisasi bantuan, empat komponen LPJ, pelaporan berjenjang, rekonsiliasi dan ekspor laporan Kelurahan Takkalasi. Pratinjau frontend dengan data contoh.',
}

export default function Page() {
  return <Reports />
}
