import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { SiteFooter } from '@/components/features/navigation/site-footer'
import { TransparencyDashboard } from '@/components/features/transparency/transparency-dashboard'
import {
  fetchPublicNetworkStatusServer,
  fetchPublicProgramsServer,
  fetchPublicRecentBlocksServer,
  fetchPublicSummaryServer,
  fetchPublicValidatorsServer,
} from '@/lib/api/server-public'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Portal Transparansi — BansosLedger',
    description:
      'Ringkasan program bantuan sosial, realisasi penyaluran, buku besar on-chain, dan status jaringan Kelurahan Takkalasi.',
  }
}

export default async function TransparencyPage() {
  const [summaryRes, programsRes, networkRes, validatorsRes, blocksRes] = await Promise.all([
    fetchPublicSummaryServer(),
    fetchPublicProgramsServer({ page: 1, limit: 20 }),
    fetchPublicNetworkStatusServer(),
    fetchPublicValidatorsServer(),
    fetchPublicRecentBlocksServer(6),
  ])

  return (
    <ScrollReveal>
      <TransparencyDashboard
        initialSummary={summaryRes.ok ? summaryRes.data : undefined}
        summaryUnavailable={!summaryRes.ok}
        initialPrograms={programsRes.ok ? programsRes.data : undefined}
        programsUnavailable={!programsRes.ok}
        initialNetwork={networkRes.ok ? networkRes.data : undefined}
        networkUnavailable={!networkRes.ok}
        initialValidators={validatorsRes.ok ? validatorsRes.data : undefined}
        initialBlocks={blocksRes.ok ? blocksRes.data : undefined}
        blocksUnavailable={!blocksRes.ok}
      />
      <SiteFooter />
    </ScrollReveal>
  )
}
