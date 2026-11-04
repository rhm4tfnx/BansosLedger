import type { Metadata } from 'next'
import { CekBansos } from '@/components/features/cek-bansos/cek-bansos'
import { SiteFooter } from '@/components/features/navigation/site-footer'
import { SiteHeader } from '@/components/features/navigation/site-header'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Cek Status Bantuan Sosial | BansosLedger',
    description:
      'Periksa status penyaluran bantuan sosial menggunakan NIK 16 digit secara aman dan terverifikasi.',
  }
}

export default function CekBansosPage() {
  return (
    <>
      <a className="fixed -top-20 left-5 z-50 bg-surface p-3 text-primary focus:top-3" href="#main">
        Lewati ke konten
      </a>
      <SiteHeader />
      <main id="main">
        <CekBansos />
      </main>
      <SiteFooter />
    </>
  )
}
