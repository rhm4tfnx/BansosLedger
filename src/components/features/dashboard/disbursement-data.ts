'use client'
import useSWR from 'swr'
import { appendAudit } from './audit-store'
import { initialRecipients, commitment } from './recipient-data'

export const recipients = initialRecipients.filter((r) => !r.deleted)
export const programs = [
  {
    code: 'BLT',
    name: 'Bantuan Langsung Tunai Dana Kelurahan',
    amount: 900000,
    quota: 120,
    baseline: 96,
  },
  { code: 'PKH', name: 'Program Keluarga Harapan', amount: 750000, quota: 150, baseline: 132 },
  {
    code: 'BPNT',
    name: 'Bantuan Pangan Non-Tunai / Sembako',
    amount: 400000,
    quota: 200,
    baseline: 175,
  },
  { code: 'BST', name: 'Bantuan Sosial Tunai Kabupaten', amount: 600000, quota: 80, baseline: 64 },
]
export const periods = [
  'Tahap I / Triwulan I 2026',
  'Tahap II / Triwulan II 2026',
  'Tahap III / Triwulan III 2026',
]
export type Status = 'SUCCESS' | 'PENDING' | 'FAILED'
export type Distribution = {
  id: string
  recipient: string
  program: string
  period: string
  amount: number
  status: Status
  reason: string
  cid: string
  file: string
  fileUrl?: string
  hash?: string
  block?: number
  date: string
  wallet: string
}
export type DemoState = {
  rows: Distribution[]
  role: string
  online: boolean
  wallet: string
  logs: string[]
}
export const validWallet = '0x71C9a84E3b2F1094c8B2d14e90A21a65f89A89A2'
export const txHash = (id: string) => '0xd15b' + commitment(id).slice(6)
export const initialRows: Distribution[] = Array.from({ length: 7 }, (_, i) => {
  const p = programs[i < 4 ? i : i === 6 ? 1 : 0]
  const id = `PEN-2026-${String(i + 1).padStart(3, '0')}`
  return {
    id,
    recipient: recipients[i < 4 ? i : i === 5 ? 0 : 4].id,
    program: p.code,
    period: periods[i === 4 || i === 6 ? 1 : 0],
    amount: i === 6 ? 450000 : p.amount,
    status: i < 4 ? 'SUCCESS' : i === 4 ? 'PENDING' : 'FAILED',
    reason:
      i < 4
        ? 'Terkonfirmasi 4/4 validator QBFT (simulasi)'
        : i === 4
          ? 'Menunggu pemulihan RPC / tanda tangan ulang'
          : i === 5
            ? 'Penerima sudah menerima bantuan program ini di periode yang sama'
            : 'Nominal bantuan tidak sesuai dengan ketentuan program',
    cid: `SIM-CID-${id}`,
    file: `Berita_Acara_${id}.pdf`,
    hash: i === 4 ? undefined : txHash(id),
    block: i === 4 ? undefined : 18421 + i,
    date: `2026-10-21T${String(1 + i).padStart(2, '0')}:14:22Z`,
    wallet: validWallet,
  }
})
export const initialState: DemoState = {
  rows: initialRows,
  role: 'Operator Bansos',
  online: true,
  wallet: validWallet,
  logs: [],
}
export function useDisbursements() {
  const { data = initialState, mutate } = useSWR<DemoState>('disbursement-demo', null, {
    fallbackData: initialState,
  })
  function update(fn: (s: DemoState) => DemoState) {
    void mutate(
      (current) => {
        const previous = current ?? initialState
        const next = fn(previous)
        const added = next.logs.slice(0, Math.max(0, next.logs.length - previous.logs.length))
        for (const action of [...added].reverse()) {
          const row = next.rows.find((r) => action.includes(r.id))
          appendAudit({
            action,
            category: 'Transaksi',
            status: row?.status ?? 'INFO',
            wallet: next.wallet,
            dataId: row?.id ?? '—',
            cid: row?.cid ?? '—',
            txHash: row?.hash ?? '—',
            block: row?.block ? String(row.block) : '—',
            source: 'Halaman penyaluran · simulasi',
          })
        }
        if (previous.online && !next.online)
          appendAudit({
            action: 'RPC simulasi terputus',
            category: 'Keamanan',
            status: 'FAILSAFE_LOCKED',
          })
        if (previous.wallet !== next.wallet)
          appendAudit({
            action: 'Pergantian wallet simulasi',
            category: 'Autentikasi',
            wallet: next.wallet,
            diff: { before: previous.wallet, after: next.wallet },
          })
        return next
      },
      { revalidate: false },
    )
  }
  return { data, update, operator: true }
}
export function checks(
  row: Pick<Distribution, 'recipient' | 'program' | 'period' | 'amount' | 'id'>,
  rows: Distribution[],
  wallet: string,
) {
  const r = recipients.find((r) => r.id === row.recipient)
  return [
    {
      label: 'Duplikasi periode',
      ok: !rows.some(
        (x) =>
          x.id !== row.id &&
          x.status === 'SUCCESS' &&
          x.recipient === row.recipient &&
          x.program === row.program &&
          x.period === row.period,
      ),
      error: 'Penerima sudah menerima bantuan program ini di periode yang sama',
    },
    {
      label: 'Kesesuaian nominal',
      ok: row.amount === programs.find((p) => p.code === row.program)?.amount,
      error: 'Nominal bantuan tidak sesuai dengan ketentuan program',
    },
    {
      label: 'Status FINAL & hash penerima',
      ok: r?.status === 'FINAL' && !!r.identityHash,
      error: 'Data penerima belum berstatus FINAL pada daftar ketetapan',
    },
    {
      label: 'Kewenangan wallet kelurahan',
      ok: wallet === validWallet,
      error: 'Wallet pengirim tidak memiliki kewenangan pencatatan penyaluran',
    },
  ]
}
export function resolveRow(row: Distribution, state: DemoState): Distribution {
  if (!state.online)
    return {
      ...row,
      status: 'PENDING',
      reason: 'RPC 8545 terputus. Data dan bukti simulasi tetap tersedia untuk dikirim ulang.',
    }
  const failed = checks(row, state.rows, state.wallet).find((c) => !c.ok)
  return {
    ...row,
    wallet: state.wallet,
    status: failed ? 'FAILED' : 'SUCCESS',
    reason: failed?.error ?? 'Terkonfirmasi 4/4 validator QBFT (simulasi)',
    hash: row.hash ?? txHash(row.id),
    block: row.block ?? 18421 + state.rows.length,
  }
}
export const short = (v: string) => (v.length > 24 ? `${v.slice(0, 12)}…${v.slice(-8)}` : v)
export const wita = (date: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Makassar',
  }).format(new Date(date)) + ' WITA'
