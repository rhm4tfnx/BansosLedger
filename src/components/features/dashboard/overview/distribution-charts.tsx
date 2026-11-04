'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { useDashboardSummaryQuery } from '@/lib/api/hooks'
import { EmptyState, ErrorState, TableSkeleton } from '../shared/states'
import styles from '@/components/features/dashboard/overview/dashboard.module.css'

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function DistributionCharts() {
  const summaryQuery = useDashboardSummaryQuery()
  const summary = summaryQuery.data
  const monthly = (summary?.monthly ?? []).map((row) => ({
    month: row.periodLabel,
    total: row.amount / 1_000_000,
  }))
  const byProgram = (summary?.byProgram ?? []).map((row, i) => ({
    name: row.code,
    value: row.amount,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))
  const totalAmount = byProgram.reduce((sum, row) => sum + row.value, 0)

  return (
    <div className={styles.chartGrid}>
      <section className={styles.card} id="penyaluran">
        <div className={styles.cardHeading}>
          <div>
            <h2>Tren penyaluran bantuan</h2>
            <p>Realisasi bulanan dalam juta rupiah</p>
          </div>
        </div>
        {summaryQuery.isPending ? (
          <TableSkeleton rows={4} label="Memuat grafik penyaluran" />
        ) : summaryQuery.isError ? (
          <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
        ) : monthly.length === 0 ? (
          <EmptyState>Belum ada data penyaluran bulanan.</EmptyState>
        ) : (
          <>
            <ChartContainer
              className="h-80 w-full aspect-auto"
              config={{ total: { label: 'Penyaluran (Juta Rp)', color: 'var(--chart-1)' } }}
            >
              <BarChart accessibilityLayer data={monthly} barSize={17} margin={{ top: 15, right: 12, left: -24, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="#eef0f6" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={12} />
                <YAxis tickLine={false} axisLine={false} tickCount={5} />
                <ChartTooltip cursor={{ fill: '#f9fafb' }} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} activeBar={{ fill: '#7a86ff' }} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
            <div className={styles.chartNote}>
              {monthly[0]?.month} – {monthly[monthly.length - 1]?.month}
              <span>Data live dari server</span>
            </div>
          </>
        )}
      </section>
      <section className={styles.card} id="program">
        <div className={styles.cardHeading}>
          <div>
            <h2>Penyaluran per program</h2>
            <p>Distribusi dari total dana tersalurkan</p>
          </div>
          <span className={styles.softBadge}>{summary ? `${summary.byProgram.length} program` : '-'}</span>
        </div>
        {summaryQuery.isPending ? (
          <TableSkeleton rows={4} label="Memuat distribusi program" />
        ) : summaryQuery.isError ? (
          <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
        ) : byProgram.length === 0 ? (
          <EmptyState>Belum ada penyaluran per program.</EmptyState>
        ) : (
          <>
            <div className={styles.donut}>
              <ChartContainer config={{ value: { label: 'Nominal (Rp)' } }} className="h-52 w-full aspect-auto">
                <PieChart>
                  <Pie data={byProgram} dataKey="value" nameKey="name" innerRadius={69} outerRadius={92} strokeWidth={0} startAngle={90} endAngle={-270}>
                    {byProgram.map((p) => (
                      <Cell key={p.name} fill={p.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </PieChart>
              </ChartContainer>
              <div className={styles.donutLabel}>
                <span>Total tersalurkan</span>
                <strong>{summary?.realisasiFormatted ?? '-'}</strong>
              </div>
            </div>
            <div className={styles.programList}>
              {(summary?.byProgram ?? []).map((p, i) => (
                <div key={p.code}>
                  <span>
                    <i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {p.name}
                  </span>
                  <strong>
                    {p.amountFormatted}
                    {totalAmount > 0 ? ` · ${Math.round((p.amount / totalAmount) * 100)}%` : ''}
                  </strong>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
