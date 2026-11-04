import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TransactionDetails } from '@/components/features/explorer/transaction-details'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hash: string }>
}): Promise<Metadata> {
  const { hash } = await params
  return {
    title: `Detail Transaksi ${hash.slice(0, 10)}… | BansosLedger`,
    description:
      'Detail transaksi BansosLedger: status on-chain, program, periode, nominal, commitment, dan bukti IPFS.',
  }
}

export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    notFound()
  }
  return <TransactionDetails key={hash} txHash={hash} />
}
