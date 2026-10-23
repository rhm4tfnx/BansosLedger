'use client'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { type Recap, programs, percent } from '@/mocks/report-data'
import s from '@/components/features/dashboard/reports/reports.module.css'
export function ReportCharts({ rows }: { rows: Recap[] }) {
  const total = rows.reduce((sum, r) => sum + r.realized, 0)
  const slices = programs
    .map((name, i) => ({
      name,
      value: rows.filter((r) => r.program === name).reduce((sum, r) => sum + r.realized, 0),
      fill: `var(--chart-${i + 1})`,
    }))
    .filter((r) => r.value)
  return (
    <div className={s.chartGrid}>
      <div className={s.inset}>
        <h3>Komparasi pagu & realisasi</h3>
        <p>Per program dan wilayah · dalam juta rupiah</p>
        <ChartContainer
          className="h-64 w-full aspect-auto"
          config={{
            budget: { label: 'Pagu (juta)', color: 'var(--chart-4)' },
            realized: { label: 'Realisasi (juta)', color: 'var(--chart-1)' },
          }}
        >
          <BarChart
            accessibilityLayer
            data={rows.map((r) => ({
              label: `${r.program} / ${r.area.slice(0, 6)}`,
              budget: r.budget / 1e6,
              realized: r.realized / 1e6,
            }))}
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
        <h3>Distribusi dana tersalurkan</h3>
        <p>Proporsi realisasi per program</p>
        <ChartContainer
          className="h-52 w-full aspect-auto"
          config={Object.fromEntries(
            programs.map((p, i) => [p, { label: p, color: `var(--chart-${i + 1})` }]),
          )}
        >
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              strokeWidth={3}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
        <div className={s.legend}>
          {slices.map((r) => (
            <span key={r.name}>
              {r.name} <strong>{percent(total ? (r.value / total) * 100 : 0)}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
