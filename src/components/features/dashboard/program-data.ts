export type Program = {
  id: string
  name: string
  type: string
  form: 'Tunai' | 'Barang'
  period: string
  unit: string
  amount: number
  quota: number
  criteria: string
  status: 'DRAFT' | 'AKTIF' | 'SELESAI'
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
  period: [
    'Juli – September 2026 (Tahap 3)',
    'September 2026',
    'Juli – September 2026',
    'April – Juni 2026 (Tahap 2)',
    'Oktober – Desember 2026',
    'November 2026',
  ][i],
  unit: t.form === 'Tunai' ? 'Pencairan tunai' : 'Paket pangan',
  amount: [750000, 200000, 900000, 600000, 500000, 500000][i],
  quota: [220, 350, 120, 120, 140, 100][i],
  used: [185, 290, 50, 120, 0, 0][i],
  criteria:
    'Keluarga prasejahtera Kelurahan Takkalasi, NIK valid, terdaftar dalam DTKS, belum menerima bantuan sejenis pada periode yang sama.',
  status: i < 3 ? 'AKTIF' : i === 3 ? 'SELESAI' : 'DRAFT',
}))
initialPrograms.push({
  ...initialPrograms[4],
  id: 'PRG-2026-07',
  name: 'Bantuan Pendidikan Arsip',
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
