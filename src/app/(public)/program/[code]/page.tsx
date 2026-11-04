import { notFound } from 'next/navigation'
import { initialPrograms } from '@/mocks/program-data'
import { PublicProgramDetail } from '@/components/features/public/public-programs'
export const metadata = { title: 'Detail Program | BansosLedger', description: 'Ringkasan program dan ledger transaksi bantuan yang berhasil.' }
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const program = initialPrograms.find(p => p.code === code && !p.deleted)
  if (!program) notFound()
  return <PublicProgramDetail program={program} />
}
