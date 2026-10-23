export type VerificationRecord = {
  id: string
  name: string
  program: string
  amount: number
  block: number
  cid: string
  hash: string
  issue?: 'nominal' | 'identitas' | 'cid' | 'hilang'
}
export const testRecords: VerificationRecord[] = [
  'Hj. Sitti Aminah Dg. Kebo',
  'Baharuddin Mattewakkang',
  'Muh. Syahrir Laompong',
  'Fatmawati Dg. Ngasseng',
  'Nurhayati Lateppa',
].map((name, i) => ({
  id: `PEN-2026-00${i + 1}`,
  name,
  program: ['BLT', 'PKH', 'BPNT', 'BST', 'BLT'][i],
  amount: [900000, 750000, 400000, 600000, 900000][i],
  block: [18421, 18425, 18428, 18429, 18432][i],
  cid: `CID-CONTOH-${i + 1}`,
  hash: `HASH-CONTOH-${i + 1}`,
}))
export const money = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
export const statusOf = (record: VerificationRecord) =>
  record.issue === 'hilang' ? 'Off-chain hilang' : record.issue ? 'Tidak cocok' : 'Cocok (Valid)'
export const securityRequirements = [
  [
    'Confidentiality',
    'NIK tetap dimasking. Pembukaan PII memerlukan otorisasi server dan pencatatan audit.',
    'Belum terhubung',
  ],
  [
    'Integrity',
    'Perbandingan tujuh atribut dan skenario perubahan / penghapusan tersedia untuk demonstrasi.',
    'Simulasi UI',
  ],
  [
    'Non-repudiation',
    'TxHash, previous block hash, receipt dan tanda tangan harus diverifikasi terhadap node Besu.',
    'Belum terhubung',
  ],
  [
    'Authenticity',
    'Verifikasi signer terhadap authorized wallet pada smart contract, terpisah dari node validator.',
    'Belum terhubung',
  ],
  [
    'Accountability',
    'Audit append-only permanen, identitas aktor, IP, wallet, dan pencatatan lintas modul.',
    'Belum terhubung',
  ],
]
