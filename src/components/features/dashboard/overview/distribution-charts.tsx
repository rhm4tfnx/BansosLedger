'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { monthlyDistribution, programs } from '@/constants/dashboard'
import styles from '@/components/features/dashboard/overview/dashboard.module.css'

export function DistributionCharts() {
  const [year, setYear] = useState('2026')
  const data = monthlyDistribution.map((row) => ({
    ...row,
    pkh: row.pkh * (year === '2026' ? 1 : 0.76),
    blt: row.blt * (year === '2026' ? 1 : 0.76),
    other: row.other * (year === '2026' ? 1 : 0.76),
    total: Number(((row.pkh + row.blt + row.other) * (year === '2026' ? 1 : 0.76)).toFixed(2)),
  }))
  return (
    <div className={styles.chartGrid}>
      <section className={styles.card} id="penyaluran">
        <div className={styles.cardHeading}>
          <div>
            <h2>Tren penyaluran bantuan</h2>
            <p>Realisasi bulanan dalam miliar rupiah</p>
          </div>
          <select aria-label="Tahun grafik" value={year} onChange={(e) => setYear(e.target.value)}>
            <option>2026</option>
            <option>2025</option>
          </select>
        </div>

        <ChartContainer
          className="h-80 w-full aspect-auto"
          config={{ total: { label: 'Penyaluran (Miliar Rp)', color: 'var(--chart-1)' } }}
        >
          <BarChart
            accessibilityLayer
            data={data}
            barSize={17}
            margin={{ top: 15, right: 12, left: -24, bottom: 5 }}
          >
            <CartesianGrid vertical={false} stroke="#eef0f6" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={12} />
            <YAxis tickLine={false} axisLine={false} tickCount={5} />
            <ChartTooltip
              cursor={{ fill: '#f9fafb' }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="total"
              fill="var(--color-total)"
              radius={[6, 6, 0, 0]}
              activeBar={{ fill: '#7a86ff' }}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
        <div className={styles.chartNote}>
          Jan – Okt {year}
          <span>Data contoh · bukan data live</span>
        </div>
      </section>
      <section className={styles.card} id="program">
        <div className={styles.cardHeading}>
          <div>
            <h2>Penyaluran per program</h2>
            <p>Distribusi dari total dana tersalurkan</p>
          </div>
          <span className={styles.softBadge}>8 program</span>
        </div>
        <div className={styles.donut}>
          <ChartContainer
            config={{ value: { label: 'Persentase' } }}
            className="h-52 w-full aspect-auto"
          >
            <PieChart>
              <Pie
                data={programs}
                dataKey="value"
                nameKey="name"
                innerRadius={69}
                outerRadius={92}
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            </PieChart>
          </ChartContainer>
          <div className={styles.donutLabel}>
            <span>Total tersalurkan</span>
            <strong>Rp 18,45 M</strong>
          </div>
        </div>
        <div className={styles.programList}>
          {programs.map((p) => (
            <div key={p.name}>
              <span>
                <i style={{ background: p.fill }} />
                {p.name}
              </span>
              <strong>{p.value}%</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
