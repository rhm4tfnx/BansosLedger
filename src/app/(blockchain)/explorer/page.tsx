import type { Metadata } from 'next'
import { NetworkWidget } from '@/components/features/dashboard/monitoring/network-widget'
import networkStyles from '@/components/features/dashboard/monitoring/monitoring.module.css'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { SiteFooter } from '@/components/features/navigation/site-footer'
import { BlockExplorer } from '@/components/features/explorer/block-explorer'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Block Explorer — BansosLedger',
    description:
      'Jelajahi blok, transaksi, alamat, kontrak, dan validator jaringan konsorsium QBFT BansosLedger.',
  }
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
