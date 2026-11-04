export { useDisbursements } from '@/components/features/public/use-disbursement-state'
import { initialRecipients, demoHash } from '@/mocks/recipient-data'
import { initialPrograms, type Program } from '@/mocks/program-data'
import type { Enrollment } from '@/mocks/enrollment-data'
import { formatPeriod } from '@/lib/utils'

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
export function programPeriods(start: number, end: number): number[] {
  const result: number[] = []
  for (let value = start; value <= end; value = value % 100 === 12 ? value + 89 : value + 1) result.push(value)
  return result
}
export const periods = programPeriods(202601, 202612)
export const transactionSteps = ['Simpan data', 'Unggah bukti', 'Tanda tangan', 'Menunggu blok', 'Selesai']
export const statusIcon = { SUCCESS: '✓', PENDING: '◷', FAILED: '×', DRAFT: '·' }
export const failureMessages = [
  'Periode di luar masa program atau program sudah ditutup.',
  'Periode di luar masa program atau program sudah ditutup.',
  'Penerima belum terdaftar pada program ini di blockchain.',
  'Penerima ini sudah menerima bantuan untuk program dan periode yang sama.',
  'Nominal tidak sesuai ketentuan program.',
  'Penerima belum FINAL atau belum memiliki commitment.',
  'Wallet yang dipakai bukan wallet resmi Kelurahan. Ganti akun di MetaMask.',
]
export const failureReason = (error: string) => failureMessages.includes(error) ? error : `Transaksi ditolak jaringan. Kode: ${error}. Hubungi administrator.`
export type Status = 'SUCCESS' | 'PENDING' | 'FAILED'
export type Distribution = {
  id: string
  recipient: string
  program: string
  programId: `0x${string}`
  periodId: number
  period: string
  amount: number
  status: Status
  reason: string
  cid: string
  file: string
  fileUrl?: string
  evidenceFiles?: { name: string; url: string }[]
  evidenceWithdrawn?: boolean
  evidenceWithdrawalReason?: string
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
export const txHash = (id: string) => '0xd15b' + demoHash(id).slice(6)
export const initialRows: Distribution[] = Array.from({ length: 7 }, (_, i) => {
  const p = programs[i < 4 ? i : i === 6 ? 1 : 0]
  const id = `PEN-2026-${String(i + 1).padStart(3, '0')}`
  return {
    id,
    recipient: recipients[i < 4 ? i : i === 5 ? 0 : 4].id,
    program: p.code,
    programId: initialPrograms.find(program => program.code === p.code)!.programId,
    periodId: i === 4 || i === 6 ? 202604 : 202601,
    period: formatPeriod(i === 4 || i === 6 ? 202604 : 202601),
    amount: i === 6 ? 450000 : p.amount,
    status: i < 4 ? 'SUCCESS' : i === 4 ? 'PENDING' : 'FAILED',
    reason:
      i < 4
        ? 'Terkonfirmasi 4/4 validator QBFT (simulasi)'
        : i === 4
          ? 'Menunggu pemulihan RPC / tanda tangan ulang'
          : i === 5
            ? failureMessages[3]
            : failureMessages[4],
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
export function checks(
  row: Pick<Distribution, 'recipient' | 'program' | 'periodId' | 'amount' | 'id'>,
  rows: Distribution[],
  wallet: string,
  catalog: Program[] = initialPrograms,
  enrollments: Enrollment[] = initialRows.filter(r => r.status === 'SUCCESS').map(r => ({ programCode: r.program, recipientId: r.recipient, status: 'REGISTERED_ONCHAIN' })),
) {
  const r = recipients.find(r => r.id === row.recipient)
  const p = catalog.find(p => p.code === row.program && !p.deleted)
  const results = [
    ['Program aktif', p?.status === 'ACTIVE'],
    ['Periode dalam rentang program', !!p && Number.isInteger(row.periodId) && row.periodId % 100 >= 1 && row.periodId % 100 <= 12 && row.periodId >= p.startPeriod && row.periodId <= p.endPeriod],
    ['Penerima terdaftar on-chain', enrollments.some(e => e.programCode === row.program && e.recipientId === row.recipient && e.status === 'REGISTERED_ONCHAIN')],
    ['Duplikasi periode', !rows.some(x => x.id !== row.id && (x.status === 'PENDING' || x.status === 'SUCCESS') && x.program === row.program && x.periodId === row.periodId && x.recipient === row.recipient)],
    ['Kesesuaian nominal', !!p && row.amount === p.amount],
    ['Status FINAL & commitment penerima', r?.status === 'FINAL' && !r.deleted && /^0x[0-9a-fA-F]{64}$/.test(r.identityHash ?? '')],
    ['Kewenangan wallet Kelurahan', wallet.toLowerCase() === (process.env.NEXT_PUBLIC_AUTHORIZED_KELURAHAN_WALLET || validWallet).toLowerCase()],
  ] as const
  return results.map(([label, ok], index) => ({ label, ok, error: failureMessages[index] }))
}
export function resolveRow(row: Distribution, state: DemoState, catalog?: Program[], enrollments?: Enrollment[]): Distribution {
  if (!state.online)
    return {
      ...row,
      status: 'PENDING',
      reason: 'RPC 8545 terputus. Data dan bukti simulasi tetap tersedia untuk dikirim ulang.',
    }
  const failed = checks(row, state.rows, state.wallet, catalog, enrollments).find((c) => !c.ok)
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
