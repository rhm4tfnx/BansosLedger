'use client'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ProgramSummaryMetricsViewModel } from '@/types'
import s from '@/components/features/dashboard/reports/reports.module.css'

export function ReportCharts({ summary }: { summary: ProgramSummaryMetricsViewModel }) {
  const slices = [
    { name: 'Realisasi', value: summary.realisasiRupiah, fill: 'var(--chart-1)' },
    { name: 'Sisa pagu', value: Math.max(summary.sisa, 0), fill: 'var(--chart-4)' },
  ].filter((r) => r.value > 0)
  return (
    <div className={s.chartGrid}>
      <div className={s.inset}>
        <h3>Komparasi pagu &amp; realisasi</h3>
        <p>Cakupan filter aktif · dalam juta rupiah</p>
        <ChartContainer
          className="h-64 w-full aspect-auto"
          config={{
            budget: { label: 'Pagu (juta)', color: 'var(--chart-4)' },
            realized: { label: 'Realisasi (juta)', color: 'var(--chart-1)' },
          }}
        >
          <BarChart
            accessibilityLayer
            data={[
              {
                label: 'Total',
                budget: summary.pagu / 1e6,
                realized: summary.realisasiRupiah / 1e6,
              },
            ]}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis width={35} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="budget" fill="var(--color-budget)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="realized" fill="var(--color-realized)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
        <div className={s.legend}>
          <span>Pagu anggaran</span>
          <strong>Realisasi penyaluran</strong>
        </div>
      </div>
      <div className={s.inset}>
        <h3>Proporsi realisasi</h3>
        <p>Realisasi terhadap sisa pagu</p>
        <ChartContainer
          className="h-52 w-full aspect-auto"
          config={{
            Realisasi: { label: 'Realisasi', color: 'var(--chart-1)' },
            'Sisa pagu': { label: 'Sisa pagu', color: 'var(--chart-4)' },
          }}
        >
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} strokeWidth={3} />
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className={s.legend}>
          <span>Realisasi <strong>{summary.percentage}%</strong></span>
          <span>Sisa <strong>{summary.sisaFormatted}</strong></span>
        </div>
      </div>
    </div>
  )
}
