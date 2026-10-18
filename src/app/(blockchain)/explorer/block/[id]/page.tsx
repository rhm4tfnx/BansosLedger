import { notFound } from 'next/navigation'
import { blocks } from '@/constants/explorer-data'
import { BlockDetails } from '@/components/features/explorer/block-details'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

export const metadata = {
  title: 'Detail Blok | BansosLedger',
  description:
    'Informasi blok, konsensus QBFT, transaksi dan validator BansosLedger. Data ilustrasi.',
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
  const block = blocks.find((item) => String(item.id) === id)
  if (!block) notFound()
  return (
    <ScrollReveal>
      <BlockDetails
        key={`${id}-${tab}`}
        block={block}
        initialTab={tab === 'transactions' ? 'transactions' : 'overview'}
      />
    </ScrollReveal>
  )
}
