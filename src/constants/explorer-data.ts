export const validators = [
  'Kelurahan Takkalasi',
  'Kecamatan Balusu',
  'Dinas Sosial Barru',
  'Auditor Pengawas',
]
export const blocks = Array.from({ length: 12 }, (_, i) => ({
  id: 12542 - i,
  signer: validators[i % 4],
  transactions: [24, 18, 32, 12, 21, 16][i % 6],
  gas: 2450000 - i * 12000,
}))
export const transactions = blocks.map((b, i) => ({
  ...b,
  hash: `0x${(735123 + i).toString(16).padStart(64, '0')}`,
  address: `0x${(82410 + (i % 4)).toString(16).padStart(40, '0')}`,
  method: ['recordBatch', 'verifyDistribution', 'registerRecipient', 'auditBatch'][i % 4],
  program: ['Sembako / BPNT', 'Bantuan Tunai', 'Pencatatan penerima', 'Audit penyaluran'][i % 4],
}))
export const blockHash = (id: number) => `0x${id.toString(16).padStart(64, '0')}`
