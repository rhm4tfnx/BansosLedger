import type { Metadata } from 'next'
import { PublicPrograms } from '@/components/features/public/public-programs'
import { fetchPublicProgramsServer } from '@/lib/api/server-public'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Program Bantuan | BansosLedger',
    description:
      'Program, periode, nominal per penerima, dan pagu anggaran bantuan sosial tanpa identitas penerima.',
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const parsedPage = Number.parseInt(resolvedParams.page ?? '1', 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const result = await fetchPublicProgramsServer({ page, limit: 20 })

  return (
    <PublicPrograms
      initialPage={page}
      initialData={result.ok ? result.data : undefined}
      unavailable={!result.ok}
    />
  )
}
