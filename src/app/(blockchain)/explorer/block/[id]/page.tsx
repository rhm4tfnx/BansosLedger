import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlockDetails } from '@/components/features/explorer/block-details'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Detail Blok #${id} | BansosLedger`,
    description: `Informasi blok #${id}, konsensus QBFT, proposer, dan jumlah transaksi BansosLedger.`,
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  if (!/^\d+$/.test(id)) {
    notFound()
  }
  return (
    <ScrollReveal>
      <BlockDetails
        key={`${id}-${tab ?? 'overview'}`}
        blockNumber={id}
        initialTab={tab === 'transactions' ? 'transactions' : 'overview'}
      />
    </ScrollReveal>
  )
}
