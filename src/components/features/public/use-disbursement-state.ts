'use client'
import useSWR from 'swr'
import { useRoleAccess } from '@/hooks/use-role-access'
import { appendAudit } from '@/stores/audit-store'
import { initialState, type DemoState } from '@/mocks/disbursement-data'

export function useDisbursements() {
  const { can } = useRoleAccess()
  const { data = initialState, mutate } = useSWR<DemoState>('disbursement-demo', null, { fallbackData: initialState })
  function update(fn: (s: DemoState) => DemoState) {
    void mutate((current) => {
      const previous = current ?? initialState
      const next = fn(previous)
      const added = next.logs.slice(0, Math.max(0, next.logs.length - previous.logs.length))
      for (const action of [...added].reverse()) {
        const row = next.rows.find((r) => action.includes(r.id))
        appendAudit({ action, category: 'Transaksi', status: row?.status ?? 'INFO', wallet: next.wallet, dataId: row?.id ?? '—', cid: row?.cid ?? '—', txHash: row?.hash ?? '—', block: row?.block ? String(row.block) : '—', source: 'Halaman penyaluran · simulasi' })
      }
      if (previous.online && !next.online) appendAudit({ action: 'RPC simulasi terputus', category: 'Keamanan', status: 'FAILSAFE_LOCKED' })
      if (previous.wallet !== next.wallet) appendAudit({ action: 'Pergantian wallet simulasi', category: 'Autentikasi', wallet: next.wallet, diff: { before: previous.wallet, after: next.wallet } })
      return next
    }, { revalidate: false })
  }
  return { data, update, operator: can('disbursement:create') }
}
