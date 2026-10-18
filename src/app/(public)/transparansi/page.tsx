import type { Metadata } from 'next'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { SiteFooter } from '@/components/features/navigation/site-footer'
import { TransparencyDashboard } from '@/components/features/transparency/transparency-dashboard'

export const metadata: Metadata = {
  title: 'Portal Transparansi — BansosLedger',
  description:
    'Ringkasan program bantuan sosial, penyaluran, audit transaksi, dan informasi jaringan Kelurahan Takkalasi. Pratinjau dengan data ilustrasi.',
}

export default function TransparencyPage() {
  return (
    <ScrollReveal>
      <TransparencyDashboard />
      <SiteFooter />
    </ScrollReveal>
  )
}
