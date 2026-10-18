import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { SiteFooter } from '@/components/features/navigation/site-footer'
import { BlockExplorer } from '@/components/features/explorer/block-explorer'

export const metadata: Metadata = {
  title: 'Block Explorer — BansosLedger',
  description:
    'Jelajahi blok, transaksi, dan validator jaringan BansosLedger QBFT. Pratinjau teknis dengan data ilustrasi.',
}

export default function ExplorerPage() {
  return (
    <ScrollReveal>
      <BlockExplorer />
      <SiteFooter />
    </ScrollReveal>
  )
}
