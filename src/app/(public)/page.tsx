import { LandingHero } from '@/components/features/landing/landing-hero'
import { LandingStatistics } from '@/components/features/landing/landing-details'
import { SiteHeader } from '@/components/features/navigation/site-header'
import { SiteFooter } from '@/components/features/navigation/site-footer'
import { LandingFeatures } from '@/components/features/landing/landing-features'
import { SystemFlow } from '@/components/features/landing/system-flow'
import { LandingFaq } from '@/components/features/landing/landing-faq'
import { CommunityReviews } from '@/components/features/landing/community-reviews'
import { WhyBansosLedger } from '@/components/features/landing/why-bansos-ledger'

export default function Page() {
  return (
    <>
      <a className="fixed -top-20 left-5 z-50 bg-surface p-3 text-primary focus:top-3" href="#main">
        Lewati ke konten
      </a>
      <SiteHeader />
      <main id="main">
        <LandingHero />
        <LandingStatistics />
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
