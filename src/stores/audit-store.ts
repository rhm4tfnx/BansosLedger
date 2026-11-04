'use client'
import useSWR, { mutate } from 'swr'
export type AuditEntry = {
  id: string
  time: string
  user: string
  role: string
  category: string
  action: string
  status: string
  wallet: string
  authorization: string
  ip: string
  device: string
  dataId: string
  cid: string
  txHash: string
  block: string
  diff: Record<string, unknown>
  source: string
}
export const categories = [
  'Autentikasi',
  'Akses NIK / PII',
  'CRUD & draft',
  'IPFS',
  'Transaksi',
  ...(process.env.NEXT_PUBLIC_ENABLE_LPJ_MODULE === 'true' ? ['LPJ'] : []),
  'Keamanan',
  'Rekonsiliasi',
]
export const roles = ['Operator Kelurahan', 'Kecamatan Balusu', 'Dinas Sosial Kab. Barru']
const key = 'central-audit-session'
export function appendAudit(input: Partial<AuditEntry> & Pick<AuditEntry, 'action'>) {
  const entry: AuditEntry = {
    id: `LOG-${crypto.randomUUID()}`,
    time: new Date().toISOString(),
    user: 'Pengguna simulator',
    role: roles[0],
    category: 'Keamanan',
    status: 'SUCCESS',
    wallet: 'Tidak terhubung',
    authorization: 'Belum diverifikasi',
    ip: 'Tidak dikumpulkan',
    device: navigator.userAgent,
    dataId: '—',
    cid: '—',
    txHash: '—',
    block: '—',
    diff: {},
    source: 'Simulasi frontend',
    ...input,
  }
  void mutate<AuditEntry[]>(key, (current = []) => [entry, ...current], { revalidate: false })
}
export function useAudit() {
  const entries = useSWR<AuditEntry[]>(key, null, { fallbackData: [] }).data ?? []
  return process.env.NEXT_PUBLIC_ENABLE_LPJ_MODULE === 'true' ? entries : entries.filter(entry => entry.category !== 'LPJ')
}
export const wita = (time: string) =>
  new Date(time).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA'
export const localDate = (time: string) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(time))
export function downloadAudit(rows: AuditEntry[]) {
  const cells: unknown[][] = [
    [
      'Laporan simulasi audit',
      'Cap cetak WITA',
      wita(new Date().toISOString()),
      'Jumlah',
      rows.length,
      'Blok terakhir',
      'Belum terhubung',
    ],
    Object.keys(rows[0] ?? { id: '', time: '', action: '', status: '' }),
    ...rows.map((row) =>
      Object.values({ ...row, time: wita(row.time), diff: JSON.stringify(row.diff) }),
    ),
  ]
  const csv = cells
    .map((row) =>
      row
        .map((value) => {
          let text = String(value)
          if (/^[=+\-@\t\r]/.test(text)) text = "'" + text
          return '"' + text.replaceAll('"', '""') + '"'
        })
        .join(','),
    )
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'log-aktivitas-simulasi.csv'
  a.click()
  URL.revokeObjectURL(url)
}
