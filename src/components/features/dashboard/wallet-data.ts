export const signer = '0x8a4e92c170b3d801f492a019c84e11f012345678'
export const owner = '0x1d9c4082b7a4e610f892c301b77e44a912345678'
export const validators = [
  'Kelurahan Takkalasi',
  'Kecamatan Balusu',
  'Dinsos Kab. Barru',
  'Auditor / Inspektorat',
].map((name, i) => ({ name, address: `0x${String(i + 7).repeat(40)}` }))
export const wallets = [
  {
    name: 'Wallet Aplikasi Kelurahan Takkalasi',
    role: 'Signer penyaluran',
    modifier: 'onlyAuthorizedKelurahan',
    address: signer,
    status: 'ACTIVE / AUTHORIZED',
    block: 4891012,
    tx: '0x' + '7c91e4a0'.repeat(8),
    count: 842,
    description:
      'Satu-satunya signer untuk menandatangani pencatatan penyaluran melalui catatPenyaluran().',
  },
  {
    name: 'Contract Owner / Deployer',
    role: 'Konfigurasi & rotasi kunci',
    modifier: 'onlyOwner',
    address: owner,
    status: 'ACTIVE / AUTHORIZED',
    block: 4890001,
    tx: '0x' + '1a04b8e2'.repeat(8),
    count: 4,
    description:
      'Mengelola konfigurasi dan setAuthorizedWallet() melalui script administratif; bukan signer penyaluran.',
  },
  {
    name: 'Wallet Pengujian Awal Kelurahan',
    role: 'Telah dirotasi / dicabut',
    modifier: 'onlyAuthorizedKelurahan (dicabut)',
    address: '0x5f02b184d9c3e112a740b892d11c09e212345678',
    status: 'REVOKED',
    block: 4890550,
    tx: '0x' + '9e32d1c4'.repeat(8),
    count: 15,
    description: 'Wallet tahap kompilasi awal yang telah dicabut oleh Contract Owner.',
  },
]
export const events = [
  {
    id: 'EVT-004',
    time: '15 Okt 2026, 14:20:11 WITA',
    name: 'WalletAuthorizationUpdated',
    target: signer,
    status: 'AUTHORIZED',
    block: 4891012,
    tx: wallets[0].tx,
  },
  {
    id: 'EVT-003',
    time: '15 Okt 2026, 14:18:04 WITA',
    name: 'WalletAuthorizationUpdated',
    target: wallets[2].address,
    status: 'REVOKED',
    block: 4890550,
    tx: wallets[2].tx,
  },
  {
    id: 'EVT-002',
    time: '14 Okt 2026, 09:10:00 WITA',
    name: 'WalletAuthorizationUpdated',
    target: wallets[2].address,
    status: 'AUTHORIZED',
    block: 4890012,
    tx: '0x' + 'ab12cd34'.repeat(8),
  },
  {
    id: 'EVT-001',
    time: '14 Okt 2026, 09:00:00 WITA',
    name: 'ContractDeployed',
    target: owner,
    status: 'DEPLOYED',
    block: 4890001,
    tx: wallets[1].tx,
  },
]
export const actors = [
  'Operator Bansos Kelurahan',
  'Kecamatan Balusu',
  'Dinas Sosial Kab. Barru',
  'Auditor / Pengawas',
  'Masyarakat / Penerima',
]
export const matrix = [
  {
    group: 'Data draft & siklus hidup',
    name: 'Login portal dashboard internal',
    tag: 'Web2 Auth',
    access: [
      'Akun operator',
      'Monitoring wilayah',
      'Verifikator kabupaten',
      'Via explorer publik',
      'Via explorer publik',
    ],
  },
  {
    group: 'Data draft & siklus hidup',
    name: 'Buat & ubah draft KPM / program',
    tag: 'MongoDB off-chain',
    access: [
      'CRUD draft / PENDING',
      'Lihat saja',
      'Lihat saja',
      'Tidak memiliki akses',
      'Tidak memiliki akses',
    ],
  },
  {
    group: 'Data draft & siklus hidup',
    name: 'Soft delete draft (is_deleted = true)',
    tag: 'Siklus data',
    access: [
      'Hanya data draft',
      'Ditolak',
      'Ditolak',
      'Tidak memiliki akses',
      'Tidak memiliki akses',
    ],
  },
  {
    group: 'Data draft & siklus hidup',
    name: 'Hard delete data final on-chain',
    tag: 'Proteksi mutlak',
    access: Array(5).fill('Dilarang keras'),
  },
  {
    group: 'IPFS & smart contract',
    name: 'Unggah bukti penyerahan IPFS',
    tag: 'Fase 2 • Pinata CID',
    access: [
      'Unggah JPG / PDF & terima CID',
      'Pratinjau CID',
      'Verifikasi CID',
      'Verifikasi publik',
      'Verifikasi publik',
    ],
  },
  {
    group: 'IPFS & smart contract',
    name: 'Kirim transaksi catatPenyaluran()',
    tag: 'Fase 3 • Besu QBFT',
    access: [
      'Eksklusif wallet Kelurahan',
      'Ditolak: bukan signer',
      'Ditolak: bukan signer',
      'Ditolak: hanya validator',
      'Ditolak: akses publik',
    ],
  },
  {
    group: 'LPJ, registri & publik',
    name: 'LPJ & setoran STS / NTPN',
    tag: 'PMK 254/2015',
    access: [
      'Susun, catat & cetak LPJ',
      'Monitoring read-only',
      'Verifikasi & catatan korektif',
      'Audit via explorer',
      'Transparansi via explorer',
    ],
  },
  {
    group: 'LPJ, registri & publik',
    name: 'Registri wallet & matriks peran',
    tag: 'Read-only',
    access: [
      'Lihat saja',
      'Lihat saja',
      'Lihat saja',
      'Via explorer publik',
      'Via explorer publik',
    ],
  },
  {
    group: 'LPJ, registri & publik',
    name: 'Penelusuran bukti publik /explorer',
    tag: 'Transparansi',
    access: Array(5).fill('Lihat bukti publik tanpa NIK lengkap'),
  },
]
export const rotationScript = `// Contoh dokumentasi saja; tidak dieksekusi oleh halaman ini.
const { ethers } = require("hardhat");
async function main() {
  const [contractOwner] = await ethers.getSigners();
  const registry = await ethers.getContractAt(
    "BansosLpjRegistry", "<CONTRACT_ADDRESS>", contractOwner
  );
  const tx = await registry.setAuthorizedWallet(
    "<NEW_WALLET_ADDRESS>", true, "WALLET_KELURAHAN_TAKKALASI"
  );
  const receipt = await tx.wait(1);
  console.log(receipt.blockNumber, receipt.hash);
}
main().catch(console.error);`
export const contractCode = `// Cuplikan ilustratif, bukan kontrak yang telah diaudit.
error UnauthorizedSigner(address caller);
modifier onlyAuthorizedKelurahan() {
  if (!authorizedWallets[msg.sender])
    revert UnauthorizedSigner(msg.sender);
  _;
}
function setAuthorizedWallet(
  address wallet, bool status, string calldata label
) external onlyOwner {
  authorizedWallets[wallet] = status;
  emit WalletAuthorizationUpdated(
    wallet, status, label, block.number
  );
}`
