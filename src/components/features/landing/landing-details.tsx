'use client'

import { CircleCheck, FileText, LayoutGrid, ShieldCheck, Wallet } from 'lucide-react'
import { usePublicSummaryQuery } from '@/lib/api/hooks/public'
import { cn } from '@/lib/utils'
import type { PublicSummaryViewModel } from '@/types'

export interface LandingStatisticsProps {
  summary?: PublicSummaryViewModel
  unavailable?: boolean
}

export function LandingStatistics({
  summary: initialSummary,
  unavailable = false,
}: LandingStatisticsProps = {}) {
  const query = usePublicSummaryQuery({
    enabled: !initialSummary && !unavailable,
    initialData: initialSummary,
  })
  const data = query.data ?? initialSummary
  const isUnavailable = (unavailable && !data) || (query.isError && !data)

  const cards = data
    ? [
        {
          icon: LayoutGrid,
          title: 'Program Aktif',
          value: data.programs.toLocaleString('id-ID'),
          description: 'Program bantuan sosial publik',
          color: 'bg-success/15 text-primary',
        },
        {
          icon: Wallet,
          title: 'Total Pagu Anggaran',
          value: data.budgetFormatted,
          description: 'Alokasi anggaran program publik',
          color: 'bg-success/15 text-primary',
        },
        {
          icon: CircleCheck,
          title: 'Dana Tersalurkan',
          value: data.amountFormatted,
          description: 'Realisasi tercatat on-chain',
          color: 'bg-warning/20 text-primary',
        },
        {
          icon: FileText,
          title: 'Transaksi Tercatat',
          value: data.transactions.toLocaleString('id-ID'),
          description: 'Transaksi tercatat di blockchain',
          color: 'bg-danger/10 text-danger',
        },
      ]
    : []

  return (
    <section
      className="relative mx-auto w-[calc(100%-40px)] max-w-7xl scroll-mt-8 font-mono min-[641px]:w-[calc(100%-48px)] min-[769px]:w-[calc(100%-64px)] min-[1025px]:w-[calc(100%-112px)]"
      id="transparansi"
      aria-label="Ringkasan transparansi bantuan sosial"
    >
      {isUnavailable ? (
        <div
          role="status"
          className="mt-5 rounded-control border bg-white p-6 text-center shadow-sm"
        >
          <p className="font-sans text-sm font-semibold text-primary-hover">
            Data sementara tidak tersedia
          </p>
          <p className="mt-1 text-xs text-body-copy">
            Ringkasan statistik bantuan sosial sedang tidak dapat dimuat saat ini.
          </p>
        </div>
      ) : query.isLoading && !data ? (
        <div
          aria-busy="true"
          className="grid grid-cols-2 gap-3 pt-5 min-[769px]:grid-cols-4 min-[769px]:gap-4 min-[769px]:pt-6"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-control border bg-white px-4 py-6 shadow-sm"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pt-5 min-[769px]:grid-cols-4 min-[769px]:gap-4 min-[769px]:pt-6">
          {cards.map(({ icon: Icon, title, value, description, color }) => (
            <article
              className="flex items-start gap-2.5 rounded-control border bg-white px-3 py-6 shadow-sm min-[769px]:gap-3 min-[769px]:px-4 min-[769px]:py-8 min-[1025px]:gap-4 min-[1025px]:px-5"
              key={title}
            >
              <div
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-label min-[769px]:size-10 min-[1025px]:size-12',
                  color,
                )}
              >
                <Icon aria-hidden="true" className="size-5 min-[769px]:size-6" />
              </div>
              <div className="min-w-0">
                <h2 className="mb-1 text-[10px] font-semibold min-[769px]:text-[11px]">
                  {title}
                </h2>
                <p className="break-words text-lg leading-tight font-bold text-primary-hover tabular-nums min-[769px]:text-xl">
                  {value}
                </p>
                <p className="mt-1 max-w-40 text-[10px] leading-relaxed text-body-copy">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3 px-1 py-3.5 text-[10px] leading-relaxed text-body-copy">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={13} className="shrink-0 text-primary" aria-hidden="true" />
          Transparansi di setiap langkah penyaluran
        </span>
        <span>Tanpa NIK atau identitas pribadi penerima</span>
      </div>
    </section>
  )
}
