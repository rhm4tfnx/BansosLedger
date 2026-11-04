import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AddressDetails } from '@/components/features/explorer/address-details'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>
}): Promise<Metadata> {
  const { address } = await params
  return {
    title: `Detail Address ${address.slice(0, 10)}… | BansosLedger`,
    description:
      'Profil alamat on-chain dan riwayat pencatatan penyaluran bantuan sosial pada jaringan BansosLedger.',
  }
}

export default async function Page({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    notFound()
  }
  return <AddressDetails key={address} address={address} />
}
