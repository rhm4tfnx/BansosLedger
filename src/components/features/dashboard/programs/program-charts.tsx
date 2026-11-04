'use client'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ProgramViewModel } from '@/types'
import s from '@/components/features/dashboard/programs/programs.module.css'
function millionsLabel(value: number): string {
  return `Rp ${(value / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
}
export function ProgramCharts({ programs }: { programs: ProgramViewModel[] }) {
  const [quota, setQuota] = useState(false)
  const colors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4338ca', '#e0e7ff']
  const data = programs.map((p) => ({
    name: p.code,
    used: quota ? p.disbursedCount : p.disbursedAmount / 1e6,
    remaining: quota ? Math.max(p.enrolledCount - p.disbursedCount, 0) : p.remainingBudget / 1e6,
  }))
  const distribution = Object.entries(
    programs.reduce<Record<string, number>>((a, p) => {
      a[p.kindLabel] = (a[p.kindLabel] || 0) + p.totalBudget
      return a
    }, {}),
  ).map(([name, value]) => ({ name, value }))
  return (
    <div className={s.charts}>
      <section className={s.card}>
        <header>
          <div>
            <h2>Progres Realisasi terhadap Anggaran & Target penerima</h2>
            <p>Perbandingan realisasi dan sisa per program</p>
          </div>
          <select
            aria-label="Satuan grafik"
            value={quota ? 'quota' : 'funds'}
            onChange={(e) => setQuota(e.target.value === 'quota')}
          >
            <option value="funds">Dana (Juta Rp)</option>
            <option value="quota">Target penerima (KPM)</option>
          </select>
        </header>
        <p>
          <span className={s.dot} /> Tersalurkan <span className={s.dotLight} /> Sisa{' '}
          {quota ? 'target' : 'pagu'}
        </p>
        <ChartContainer
          className="h-64 w-full aspect-auto"
          config={{
            used: {
              label: quota ? 'KPM terpakai' : 'Dana tersalurkan (Juta Rp)',
              color: '#6366f1',
            },
            remaining: { label: quota ? 'Sisa KPM' : 'Sisa pagu (Juta Rp)', color: '#c7d2fe' },
          }}
        >
          <BarChart accessibilityLayer data={data} margin={{ left: -15, right: 10 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="used" stackId="a" fill="var(--color-used)" maxBarSize={45} />
            <Bar
              dataKey="remaining"
              stackId="a"
              fill="var(--color-remaining)"
              radius={[5, 5, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ChartContainer>
      </section>
      <section className={s.card}>
        <header>
          <div>
            <h2>Distribusi Anggaran per Bentuk Bantuan</h2>
            <p>Proporsi pagu bantuan tunai & barang</p>
          </div>
        </header>
        <ChartContainer
          className="h-52 w-full aspect-auto"
          config={{ value: { label: 'Pagu (Rp)', color: '#6366f1' } }}
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={distribution}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={90}
            >
              {distribution.map((d, i) => (
                <Cell key={d.name} fill={colors[i % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className={s.legend}>
          {distribution.map((d, i) => (
            <span key={d.name}>
              <i style={{ background: colors[i % colors.length] }} />
              {d.name}
            </span>
          ))}
        </div>
        <div className={s.two}>
          {['Tunai', 'Barang'].map((f) => (
            <div className={s.inset} key={f}>
              <small>Bantuan {f}</small>
              <strong>
                {programs.filter((p) => p.kindLabel === f).length} Program (
                {millionsLabel(
                  programs.filter((p) => p.kindLabel === f).reduce((a, p) => a + p.totalBudget, 0),
                )}
                )
              </strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
