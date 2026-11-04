import { programIdFromCode } from '@/lib/blockchain/chain-keys'

export type ProgramStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
export const programStatusLabel: Record<ProgramStatus, string> = { DRAFT: 'DRAFT', ACTIVE: 'AKTIF', CLOSED: 'SELESAI' }
export type Program = {
  id: string
  code: string
  programId: `0x${string}`
  fundSource: string
  totalBudget: number
  startPeriod: number
  endPeriod: number
  activationTx?: string
  name: string
  type: string
  form: 'Tunai' | 'Barang'
  unit: string
  amount: number
  quota: number
  criteria: string
  status: ProgramStatus
  used: number
  deleted?: boolean
}
export type AidType = { code: string; name: string; form: 'Tunai' | 'Barang' }
export const aidTypes: AidType[] = [
  { code: 'PKH', name: 'Program Keluarga Harapan', form: 'Tunai' },
  { code: 'BPNT', name: 'Bantuan Pangan Non Tunai', form: 'Barang' },
  { code: 'BLT-DD', name: 'BLT Dana Desa / Kelurahan', form: 'Tunai' },
  { code: 'BLT', name: 'Bantuan Langsung Tunai', form: 'Tunai' },
  { code: 'PIP', name: 'Program Indonesia Pintar', form: 'Tunai' },
  { code: 'BENCANA', name: 'Bantuan Pangan Darurat', form: 'Barang' },
]
export const initialPrograms: Program[] = aidTypes.map((t, i) => ({
  id: `PRG-2026-0${i + 1}`,
  code: t.code,
  programId: programIdFromCode(t.code),
  fundSource: t.code === 'BLT-DD' ? 'Dana Kelurahan' : 'APBD / APBN',
  totalBudget: [750000 * 220, 200000 * 350, 900000 * 120, 600000 * 120, 500000 * 140, 500000 * 100][i],
  startPeriod: [202607, 202609, 202607, 202604, 202610, 202611][i],
  endPeriod: [202609, 202609, 202609, 202606, 202612, 202611][i],
  name: [
    'Program Keluarga Harapan (PKH) Tahap III',
    'Bantuan Pangan Non Tunai (BPNT) Kartu Sembako',
    'BLT Dana Kelurahan Takkalasi Triwulan III',
    'Bantuan Langsung Tunai Mitigasi Pangan',
    'Program Indonesia Pintar Siswa Prasejahtera',
    'Bantuan Pangan Darurat Cuaca Ekstrem Pesisir Barru',
  ][i],
  type: t.code,
  form: t.form,

  unit: t.form === 'Tunai' ? 'Pencairan tunai' : 'Paket pangan',
  amount: [750000, 200000, 900000, 600000, 500000, 500000][i],
  quota: [220, 350, 120, 120, 140, 100][i],
  used: [185, 290, 50, 120, 0, 0][i],
  criteria:
    'Keluarga prasejahtera Kelurahan Takkalasi, NIK valid, terdaftar dalam DTKS, belum menerima bantuan sejenis pada periode yang sama.',
  status: i < 3 ? 'ACTIVE' : i === 3 ? 'CLOSED' : 'DRAFT',
}))
initialPrograms.push({
  ...initialPrograms[3], id: 'PRG-2026-BST', type: 'BST', code: 'BST', programId: programIdFromCode('BST'),
  name: 'Bantuan Sosial Tunai Kabupaten', startPeriod: 202601, endPeriod: 202603,
})
initialPrograms.push({
  ...initialPrograms[4],
  id: 'PRG-2026-07',
  name: 'Bantuan Pendidikan Arsip',
  code: 'PIP-ARSIP', programId: programIdFromCode('PIP-ARSIP'),
  deleted: true,
})
export const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
export const millions = (n: number) =>
  `Rp ${(n / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Jt`
