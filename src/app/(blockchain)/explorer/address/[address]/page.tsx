import { notFound } from 'next/navigation'
import { addresses } from '@/lib/explorer-addresses'
import { AddressDetails } from '@/components/features/explorer/address-details'

export const metadata = {
  title: 'Detail Address | BansosLedger',
  description:
    'Profil wallet institusi, aktivitas transaksi, dan informasi validator BansosLedger. Data demonstrasi.',
}
export default async function Page({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  const wallet = addresses.find((w) => w.address.toLowerCase() === address.toLowerCase())
  if (!wallet) notFound()
  return <AddressDetails key={wallet.address} wallet={wallet} />
}
