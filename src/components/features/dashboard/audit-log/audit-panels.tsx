'use client'
import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useVerifyAuditLogsQuery } from '@/lib/api/hooks/audit'
import { ErrorState, TableSkeleton } from '@/components/features/dashboard/shared/states'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'

const MAX_SPAN = 4999

function SeqList({ label, values }: { label: string; values: number[] }) {
  return (
    <article className={s.inset}>
      <b>{label}</b>
      <p>{values.length === 0 ? 'Tidak ada' : values.join(', ')}</p>
    </article>
  )
}

/** On-demand hash chain verification (runs only when the button is clicked). */
export function AuditPanels({ latestSeq }: { latestSeq: number }) {
  const [fromText, setFromText] = useState('1')
  const [toText, setToText] = useState('')
  const [range, setRange] = useState<{ from: number; to: number } | null>(null)
  const effectiveTo = toText || String(Math.max(latestSeq, 1))
  const from = Number(fromText)
  const to = Number(effectiveTo)
  const valid = Number.isInteger(from) && Number.isInteger(to) && from >= 1 && to >= from && to - from <= MAX_SPAN
  const verify = useVerifyAuditLogsQuery(range?.from ?? 1, range?.to ?? 1, range !== null)

  return (
    <div className={s.columns}>
      <section className={s.card}>
        <span className={s.eyebrow}>INTEGRITAS HASH-CHAIN</span>
        <h2>Verifikasi rantai audit</h2>
        <p>Periksa urutan dan hash entri log audit pada rentang nomor urut tertentu (maksimal 5.000 entri).</p>
        <div className={s.filters}>
          <label>
            Dari seq
            <input type="number" min={1} value={fromText} onChange={(e) => setFromText(e.target.value)} />
          </label>
          <label>
            Sampai seq
            <input type="number" min={1} value={effectiveTo} onChange={(e) => setToText(e.target.value)} />
          </label>
          <button
            className={s.primary}
            disabled={!valid || verify.isFetching}
            onClick={() => {
              if (range && range.from === from && range.to === to) void verify.refetch()
              else setRange({ from, to })
            }}
          >
            <ShieldCheck size={15} /> {verify.isFetching ? 'Memverifikasi…' : 'Verifikasi rantai'}
          </button>
        </div>
        {!valid && <p role="alert">Rentang tidak valid: seq awal ≥ 1, seq akhir ≥ awal, selisih maksimal 4.999.</p>}
        <div aria-live="polite">
          {range && verify.isFetching && !verify.data ? (
            <TableSkeleton rows={2} label="Memverifikasi rantai audit" />
          ) : range && verify.isError ? (
            <ErrorState error={verify.error} onRetry={() => void verify.refetch()} />
          ) : range && verify.data ? (
            <div className={s.grid}>
              <article className={s.inset}>
                <b>{verify.data.valid ? '✓ Rantai valid' : '× Rantai tidak valid'}</b>
                <p>
                  Rentang {range.from}–{range.to}
                  {verify.data.failedAt !== null && ` · gagal pada seq ${verify.data.failedAt}`}
                </p>
              </article>
              <SeqList label="Seq hilang" values={verify.data.missingSequences} />
              <SeqList label="Seq tidak valid" values={verify.data.invalidSequences} />
              <SeqList label="Entri dengan celah" values={verify.data.gapEntries} />
            </div>
          ) : null}
        </div>
      </section>
      <section className={s.card}>
        <span className={s.eyebrow}>ISO/IEC 25010:2023 · SECURITY</span>
        <h2>Prinsip log audit</h2>
        <div className={s.grid}>
          {[
            ['Confidentiality', 'NIK tidak pernah dicatat pada log audit.'],
            ['Integrity', 'Log append-only dengan rantai hash; tidak ada jalur ubah atau hapus.'],
            ['Accountability', 'Setiap aksi tercatat dengan pengguna, peran, IP, dan waktu.'],
          ].map(([title, text]) => (
            <article className={s.inset} key={title}>
              <b>{title}</b>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
