import type { Metadata } from 'next'
import { ContractDetails } from '@/components/features/explorer/contract-details'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Kontrak | BansosLedger',
    description: 'Alamat kontrak, wallet berwenang, status jeda, dan ABI BansosLedger.',
  }
}

export default function Page() {
  return <ContractDetails />
}
