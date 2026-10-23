import { blocks, validators } from '@/mocks/explorer-data'
import type { ExplorerAddress } from '@/types/explorer'

export const contractAddress = `0x${'9abcdef0'.repeat(5)}`
export const wallets: ExplorerAddress[] = validators.map((name, i) => ({
  name,
  address: `0x${(82410 + i).toString(16).padStart(40, '0')}`,
  type: 'Validator',
  role: [
    'Administrasi kelurahan',
    'Verifikasi kecamatan',
    'Penyaluran bantuan',
    'Pengawasan & audit',
  ][i],
  uptime: ['99.98%', '99.96%', '99.99%', '99.97%'][i],
  signed: 12534 - i * 173,
  reputation: 98 - i,
  lastBlock: blocks.find((b) => b.signer === name)!.id,
}))
export const addresses: ExplorerAddress[] = [
  ...wallets,
  {
    name: 'BansosLedger: BansosContract',
    address: contractAddress,
    type: 'Smart contract',
    role: 'Pencatatan bantuan sosial',
    uptime: '—',
    signed: 0,
    reputation: 0,
    lastBlock: blocks[0].id,
  },
]
