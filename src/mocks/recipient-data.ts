import { keccak256, toUtf8Bytes } from 'ethers'

export type Recipient = {
  id: string
  nik: string
  name: string
  kk: string
  region: string
  address: string
  job: string
  income: number
  program: string
  dependents: number
  status: 'DRAFT' | 'FINAL'
  deleted: boolean
  received: number
  identityHash?: string
  history?: { date: string; program: string; amount: number; reference: string }[]
}
export const programs = ['BLT', 'PKH', 'BPNT', 'BST']
export const regions = [
  'RT 001 / RW 001',
  'RT 002 / RW 001',
  'RT 001 / RW 002',
  'RT 002 / RW 002',
  'RT 003 / RW 002',
]
export const jobs = [
  'Nelayan Tangkap Kecil',
  'Buruh Harian Lepas',
  'Ibu Rumah Tangga (Rentan)',
  'Lansia / Tidak Bekerja',
  'Buruh Tani / Perkebunan',
  'Pedagang Mikro / Warung',
]
// DEMO ONLY - never derive a hash from a NIK in the browser
export const demoHash = (recordId: string) => keccak256(toUtf8Bytes('demo-record:' + recordId))
export const masked = (nik: string) => nik.slice(0, 4) + '********' + nik.slice(-4)
export const money = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
const names = [
  'Baharuddin Dg. Tiro',
  'St. Rahmawati Lampe',
  'H. Syamsuddin Paellori',
  'Muh. Rusdi Lamappoloware',
  'Nurhayati Binti Kasim',
  'Abdul Kadir Mappatunru',
  'Hasnah Dg. Kanang',
  'Andi Ilham Tanri',
  'Salmah Binti Latief',
  'M. Saleh Pattaropura',
  'Sitti Aminah Masse',
]
export const initialRecipients: Recipient[] = names.map((name, i) => ({
  id: `demo-${i}`,
  name,
  nik: `000000000000${String(i + 1).padStart(4, '0')}`,
  kk: `000000000001${String(i + 1).padStart(4, '0')}`,
  region: regions[i % regions.length],
  address: `Jl. Contoh Takkalasi No. ${i + 1}`,
  job: jobs[i % jobs.length],
  income: [650000, 500000, 350000, 700000, 750000, 600000, 450000, 680000, 550000, 600000, 450000][
    i
  ],
  program: ['BLT', 'PKH', 'BPNT', 'BST', 'PKH', 'BLT', 'BPNT', 'BST', 'PKH', 'BLT', 'PKH'][i],
  dependents: [4, 5, 2, 3, 4, 3, 4, 2, 5, 3, 2][i],
  status: i < 7 ? 'FINAL' : 'DRAFT',
  deleted: i === 10,
  received: i === 0 ? 2 : i < 4 ? 1 : 0,
  identityHash: i < 7 ? demoHash(`demo-${i}`) : undefined,
  history: Array.from({ length: i === 0 ? 2 : i < 4 ? 1 : 0 }, (_, index) => ({
    date: `2026-${index === 0 ? '07' : '09'}-15`,
    program: ['BLT', 'PKH', 'BPNT', 'BST'][i % 4],
    amount: 300000,
    reference: `SIM-${i + 1}-${index + 1}`,
  })),
}))
export function validateRecipient(r: Recipient, existing: Recipient[], seen: string[] = []) {
  if (!/^\d{16}$/.test(r.nik)) return 'NIK harus 16 digit numerik'
  if (existing.some((x) => x.nik === r.nik && x.id !== r.id) || seen.includes(r.nik))
    return 'NIK duplikat'
  if (!/^\d{16}$/.test(r.kk)) return 'Nomor KK harus 16 digit'
  if (!r.name.trim() || !r.address.trim()) return 'Nama dan alamat wajib diisi'
  if (!regions.includes(r.region) || !programs.includes(r.program) || !jobs.includes(r.job))
    return 'Wilayah, program, atau pekerjaan tidak valid'
  if (
    !Number.isFinite(r.income) ||
    r.income < 0 ||
    !Number.isInteger(r.dependents) ||
    r.dependents < 0
  )
    return 'Penghasilan atau tanggungan tidak valid'
  return ''
}
