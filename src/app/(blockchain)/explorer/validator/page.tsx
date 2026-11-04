import type { Metadata } from 'next'
import { ValidatorDetails } from '@/components/features/explorer/validator-details'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Validator | BansosLedger',
    description: 'Daftar validator institusional pada jaringan konsorsium QBFT BansosLedger.',
  }
}

export default function Page() {
  return <ValidatorDetails />
}
