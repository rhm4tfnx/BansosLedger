'use client'
import { Suspense, useRef, useState } from 'react'
import { LockKeyhole, X } from 'lucide-react'
import { AuditPanels } from '@/components/features/dashboard/audit-log/audit-panels'
import { useUrlParams } from '@/hooks/use-url-params'
import { useAuditLogsQuery } from '@/lib/api/hooks/audit'
import {
  EmptyState,
  ErrorState,
  Pager,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import type { AuditLogViewModel } from '@/types'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'

const PAGE_SIZE = 20
const OBJECT_ID = /^[a-f0-9]{24}$/i

/** Start / end of a WITA calendar day as ISO instants. */
function dayStart(date: string): string | undefined {
  return date ? new Date(`${date}T00:00:00+08:00`).toISOString() : undefined
}
function dayEnd(date: string): string | undefined {
  return date ? new Date(`${date}T23:59:59.999+08:00`).toISOString() : undefined
}

function ActivityLogContent() {
  const { get, getPage, set } = useUrlParams()
  const action = get('action')
  const user = get('user')
  const from = get('from')
  const to = get('to')
  const userValid = user === '' || OBJECT_ID.test(user)
  const [selected, setSelected] = useState<AuditLogViewModel | null>(null)
  const detail = useRef<HTMLDialogElement>(null)

  const list = useAuditLogsQuery({
    page: getPage(),
    limit: PAGE_SIZE,
    sort: get('sort') || '-seq',
    action: action || undefined,
    user: user && userValid ? user : undefined,
    from: dayStart(from),
    to: dayEnd(to),
  })
  const latestSeq = list.data?.items.reduce((max, l) => Math.max(max, l.seq), 0) ?? 0

  return (
    <div className={s.page}>
      <div className={s.breadcrumb}>Dashboard / Monitoring / Log aktivitas</div>
      <section className={s.card}>
        <div className={s.heading}>
          <div>
            <div className={s.labels}>
              <span className={s.badge}>/dashboard/log-aktivitas</span>
              <span className={s.badge}>
                <LockKeyhole size={12} /> Tanpa edit / hapus
              </span>
            </div>
            <h1>Log aktivitas &amp; jejak audit keamanan</h1>
            <p>Pusat pencatatan operasional, siklus transaksi, dan pemeriksaan integritas.</p>
          </div>
        </div>
      </section>
      <AuditPanels latestSeq={latestSeq} />
      <section className={s.card}>
        <span className={s.eyebrow}>PUSAT JEJAK AUDIT · TANPA NIK</span>
        <h2>Daftar rincian log aktivitas &amp; jejak audit</h2>
        <div className={s.filters}>
          <label>
            Aksi
            <input
              aria-label="Filter aksi"
              placeholder="Nama aksi (persis)"
              value={action}
              onChange={(e) => set({ action: e.target.value })}
            />
          </label>
          <label>
            ID pengguna
            <input
              aria-label="Filter ID pengguna"
              placeholder="ID pengguna (24 karakter heksadesimal)"
              value={user}
              aria-invalid={!userValid}
              onChange={(e) => set({ user: e.target.value })}
            />
          </label>
          <label>
            Dari (WITA)
            <input type="date" value={from} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label>
            Sampai (WITA)
            <input type="date" min={from} value={to} onChange={(e) => set({ to: e.target.value })} />
          </label>
          <button onClick={() => set({ action: null, user: null, from: null, to: null })}>Reset filter</button>
        </div>
        {!userValid && (
          <p role="alert">ID pengguna harus berupa 24 karakter heksadesimal; filter ini belum diterapkan.</p>
        )}
        {list.isPending ? (
          <TableSkeleton rows={8} label="Memuat log audit" />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState>Belum ada log yang sesuai.</EmptyState>
        ) : (
          <>
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    {['Seq & waktu WITA', 'Pengguna, peran & IP', 'Aktivitas', 'Entitas', 'Hash', 'Payload'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <code>#{l.seq}</code>
                        <small>{l.atWita}</small>
                        {l.hasGap && <small>⚠ Celah rantai</small>}
                      </td>
                      <td>
                        <b title={l.actorId}>{l.actorId.slice(-8)}</b>
                        <small>{l.role}</small>
                        <small>IP: {l.ip}</small>
                      </td>
                      <td>
                        <span className={s.badge}>{l.action}</span>
                      </td>
                      <td>
                        <code>{l.entity}</code>
                        <code title={l.entityId}>{l.entityId.slice(-8)}</code>
                      </td>
                      <td>
                        <code title={l.hash}>{l.hashShort}</code>
                        <small title={l.prevHash}>Sebelumnya: {l.prevHashShort}</small>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSelected(l)
                            detail.current?.showModal()
                          }}
                        >
                          Payload JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={list.data.page}
              totalPages={list.data.totalPages}
              total={list.data.total}
              onPage={(next) => set({ page: next }, false)}
            />
          </>
        )}
      </section>
      <dialog ref={detail} className={s.dialog} aria-labelledby="payload-title">
        <div className={s.heading}>
          <h2 id="payload-title">Detail jejak audit &amp; payload JSON</h2>
          <button aria-label="Tutup payload" onClick={() => detail.current?.close()}>
            <X size={18} />
          </button>
        </div>
        <p>NIK tidak pernah disertakan pada log audit.</p>
        <pre>{selected ? JSON.stringify({ seq: selected.seq, requestId: selected.requestId, userAgent: selected.userAgent, diff: selected.diff }, null, 2) : ''}</pre>
      </dialog>
    </div>
  )
}

export function ActivityLog() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ActivityLogContent />
    </Suspense>
  )
}
