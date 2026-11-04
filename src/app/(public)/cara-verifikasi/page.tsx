import type { Metadata } from 'next'
import { VerificationGuide } from '@/components/features/public/verification-guide'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Cara Memeriksa Transaksi | BansosLedger',
    description: 'Empat langkah memeriksa program, periode, nominal, dan bukti transaksi.',
  }
}

export default function Page() {
  return <VerificationGuide />
}
