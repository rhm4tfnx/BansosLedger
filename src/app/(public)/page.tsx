import type { Metadata } from 'next'
import { LandingHero } from '@/components/features/landing/landing-hero'
import { LandingStatistics } from '@/components/features/landing/landing-details'
import { SiteHeader } from '@/components/features/navigation/site-header'
import { SiteFooter } from '@/components/features/navigation/site-footer'
import { LandingFeatures } from '@/components/features/landing/landing-features'
import { SystemFlow } from '@/components/features/landing/system-flow'
import { LandingFaq } from '@/components/features/landing/landing-faq'
import { CommunityReviews } from '@/components/features/landing/community-reviews'
import { WhyBansosLedger } from '@/components/features/landing/why-bansos-ledger'
import { fetchPublicSummaryServer } from '@/lib/api/server-public'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'BansosLedger — Transparansi Bantuan Sosial Berbasis Blockchain',
    description:
      'Platform pencatatan dan verifikasi penyaluran bantuan sosial Kelurahan Takkalasi berbasis jaringan konsorsium QBFT.',
  }
}

export default async function Page() {
  const summaryResult = await fetchPublicSummaryServer()

  return (
    <>
      <a className="fixed -top-20 left-5 z-50 bg-surface p-3 text-primary focus:top-3" href="#main">
        Lewati ke konten
      </a>
      <SiteHeader />
      <main id="main">
        <LandingHero />
        <LandingStatistics
          summary={summaryResult.ok ? summaryResult.data : undefined}
          unavailable={!summaryResult.ok}
        />
        <WhyBansosLedger />
        <LandingFeatures />
        <SystemFlow />
        <CommunityReviews />
        <LandingFaq />
      </main>
      <SiteFooter />
    </>
  )
}
