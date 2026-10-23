import type { Metadata } from 'next'
import { NetworkWidget } from '@/components/features/dashboard/network-widget'
import networkStyles from '@/components/features/dashboard/monitoring.module.css'
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
      <div className={networkStyles.publicWidget}>
        <NetworkWidget />
      </div>
      <SiteFooter />
    </ScrollReveal>
  )
}
