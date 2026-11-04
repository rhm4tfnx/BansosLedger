import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicProgramDetail } from '@/components/features/public/public-programs'
import { fetchPublicProgramDetailServer } from '@/lib/api/server-public'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  return {
    title: `Detail Program ${code} | BansosLedger`,
    description: `Ringkasan program bantuan sosial ${code} dan ledger transaksi penyaluran yang terkonfirmasi on-chain.`,
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams?: Promise<{ page?: string }>
}) {
  const { code } = await params
  const resolvedSearch = searchParams ? await searchParams : {}
  const parsedPage = Number.parseInt(resolvedSearch.page ?? '1', 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const result = await fetchPublicProgramDetailServer(code, page, 20)
  if (!result.ok && result.notFound) {
    notFound()
  }

  return (
    <PublicProgramDetail
      code={code}
      initialPage={page}
      initialData={result.ok ? result.data : undefined}
      unavailable={!result.ok}
    />
  )
}
