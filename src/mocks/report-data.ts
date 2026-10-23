export const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
export const percent = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '%'
export const programs = ['PKH', 'BPNT', 'BLT', 'BST']
export const recap = [
  {
    program: 'PKH',
    period: 'Tahap I - Q1 2026',
    area: 'RT 001 / RW 001',
    recipients: 136,
    quota: 140,
    budget: 340000000,
    realized: 328000000,
  },
  {
    program: 'PKH',
    period: 'Tahap IV - Okt 2026',
    area: 'RT 002 / RW 001',
    recipients: 108,
    quota: 110,
    budget: 210000000,
    realized: 204500000,
  },
  {
    program: 'BPNT',
    period: 'Tahap II - Q2 2026',
    area: 'RT 001 / RW 002',
    recipients: 175,
    quota: 180,
    budget: 240000000,
    realized: 231000000,
  },
  {
    program: 'BPNT',
    period: 'Tahap IV - Okt 2026',
    area: 'RT 002 / RW 001',
    recipients: 115,
    quota: 120,
    budget: 140000000,
    realized: 132000000,
  },
  {
    program: 'BLT',
    period: 'Tahap III - Q3 2026',
    area: 'RT 003 / RW 002',
    recipients: 148,
    quota: 160,
    budget: 180000000,
    realized: 161000000,
  },
  {
    program: 'BST',
    period: 'Tahap IV - Okt 2026',
    area: 'RT 002 / RW 003',
    recipients: 130,
    quota: 140,
    budget: 140000000,
    realized: 128000000,
  },
]
export type Recap = (typeof recap)[number]
const names = [
  'St. Aminah Masse',
  'M. Saleh Mallarangeng',
  'H. Baharuddin Lamo',
  'Rosdiana Tlarengrengi',
  'Abdul Kadir Jaelani',
  'Nurhayati Amir',
  'La Ode Muh. Ikhsan',
  'Sitti Rahmawati',
]
export const recipients = names.map((name, i) => {
  const row = recap[[1, 3, 4, 0, 5, 4, 2, 5][i]]
  return {
    ...row,
    name,
    id: i + 1,
    nik: '731102000000' + String(i + 1).padStart(4, '0'),
    amount: [1200000, 600000, 900000, 1500000, 600000, 900000, 400000, 600000][i],
    status: i === 4 ? 'PENDING' : i === 7 ? 'FAILED' : 'SUCCESS',
    hash: '0x' + (i + 1).toString(16).repeat(64),
    cid: 'Contoh CID IPFS ' + (i + 1),
    block: 4892071 + i * 4,
  }
})
export const deposits = [
  {
    sts: 'STS-7311/PKH/X/2026/001',
    ntpn: '7429104482190012',
    program: 'PKH',
    amount: 29500000,
    period: recap[0].period,
    area: recap[0].area,
  },
  {
    sts: 'STS-7311/BPNT/X/2026/002',
    ntpn: '8192037465109283',
    program: 'BPNT',
    amount: 22500000,
    period: recap[2].period,
    area: recap[2].area,
  },
]
export const wita = () =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'medium',
    timeZone: 'Asia/Makassar',
  }).format(new Date()) + ' WITA'
export const metadata = () => [
  ['Jenis data', 'CONTOH — bukan dokumen resmi / data live'],
  ['Cap waktu', wita()],
  ['Referensi blok contoh', '#4892104'],
  ['Otoritas', 'Kelurahan Takkalasi, Kecamatan Balusu'],
]
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const safe = (v: string | number) => {
    const s = String(v)
    return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'
  }
  const url = URL.createObjectURL(
    new Blob(
      ['\ufeff' + [...metadata(), [], ...rows].map((r) => r.map(safe).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    ),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = name + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
export function documentHTML(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  official = false,
) {
  const esc = (v: string | number) =>
    String(v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    )
  return `<!doctype html><html lang="id"><head><title>${esc(title)}</title><style>body{font:12px Arial;color:#182230;margin:32px;line-height:1.6}header{text-align:center;border-bottom:2px solid;padding-bottom:16px}h1{font-size:19px}h2{font-size:14px;text-align:center;margin-top:24px}table{border-collapse:collapse;width:100%;margin:24px 0}td,th{border:1px solid #98a2b3;padding:9px;text-align:left}th{background:#f2f4f7}.signatures{display:flex;justify-content:space-between;gap:24px;text-align:center;margin:40px 0}.signatures div{flex:1}.signatures p{margin-top:60px}footer{border:1px solid #d0d5dd;padding:15px;margin-top:24px;font-size:10px}.sample{text-align:center;color:#b54708}@page{size:A4 landscape;margin:12mm}@media print{body{margin:0}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><header>PEMERINTAH KABUPATEN BARRU · KECAMATAN BALUSU<h1>KANTOR KELURAHAN TAKKALASI</h1>Jl. Poros Barru – Makassar KM. 12, Kelurahan Takkalasi, Sulawesi Selatan</header><p class="sample">CONTOH DOKUMEN — BELUM DIVERIFIKASI / BUKAN BUKTI ON-CHAIN</p><h2>${esc(title)}</h2><p>Dasar acuan: PMK No. 254/PMK.05/2015 · Pasal 32 ayat (2)</p><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${official ? '<div class="signatures"><div>Disusun oleh<br>Operator Bansos Kelurahan<p>(___________________)<br>Nama / NIP</p></div><div>Dipantau oleh<br>Kecamatan Balusu<p>(___________________)<br>Nama / NIP</p></div><div>Diverifikasi oleh<br>Dinas Sosial Kab. Barru<p>(___________________)<br>Nama / NIP</p></div></div>' : ''}<footer>${metadata()
    .map((r) => r.map(esc).join(': '))
    .join('<br>')}</footer></body></html>`
}
