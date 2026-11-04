import s from '@/components/features/dashboard/verification/verification.module.css'

const SECURITY_REQUIREMENTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    'Confidentiality',
    'NIK selalu dienkripsi AES-256-GCM dan disamarkan pada respons API maupun tampilan.',
    'Diterapkan server',
  ],
  [
    'Integrity',
    'Rekonsiliasi membandingkan catatan penyaluran SUCCESS di MongoDB dengan event on-chain Besu.',
    'Verifikasi nyata',
  ],
  [
    'Non-repudiation',
    'Status SUCCESS hanya ditulis setelah server memverifikasi receipt transaksi dan argumen event.',
    'Diterapkan server',
  ],
  [
    'Authenticity',
    'Hanya authorizedWallet Kelurahan yang dapat mencatat penyaluran pada kontrak pintar.',
    'Modifier kontrak',
  ],
  [
    'Accountability',
    'Jejak audit append-only berantai hash mencatat setiap aksi pengguna tanpa menyimpan NIK.',
    'Diterapkan server',
  ],
]

const ROLE_POLICIES: ReadonlyArray<readonly [string, string]> = [
  [
    'Operator Bansos · Kelurahan Takkalasi',
    'Menjalankan operasional penyaluran dan memantau hasil rekonsiliasi data off-chain dan on-chain.',
  ],
  [
    'Kecamatan Balusu & Dinas Sosial Kab. Barru',
    'Akses baca-saja untuk verifikasi laporan realisasi, rekonsiliasi, dan log audit tanpa NIK asli.',
  ],
  [
    'Auditor / Inspektorat',
    'Pemeriksaan independen melalui Blockchain Explorer dan halaman transparansi publik.',
  ],
  [
    'Masyarakat / Penerima Bantuan',
    'Memeriksa status penyaluran dan TxHash publik secara mandiri tanpa mengekspos data pribadi.',
  ],
]

export function VerificationSecurity() {
  return (
    <div className={s.columns}>
      <section className={s.card}>
        <span className={s.eyebrow}>ISO/IEC 25010:2023 · SECURITY</span>
        <h2>Arsitektur jaminan keamanan &amp; integritas</h2>
        <p>Ringkasan kontrol keamanan yang diterapkan pada backend dan kontrak pintar.</p>
        <div className={s.scroll}>
          <table>
            <thead>
              <tr>
                <th>Aspek</th>
                <th>Mekanisme sistem</th>
                <th>Cakupan</th>
              </tr>
            </thead>
            <tbody>
              {SECURITY_REQUIREMENTS.map(([name, text, scope]) => (
                <tr key={name}>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td>{text}</td>
                  <td>
                    <span className={s.badge}>{scope}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={s.card}>
        <span className={s.eyebrow}>KEBIJAKAN AKSES LINTAS PERAN</span>
        <h2>Pemisahan wewenang verifikasi</h2>
        <p>Seluruh kontrol akses ditegakkan pada server melalui izin berbasis peran.</p>
        {ROLE_POLICIES.map(([title, text]) => (
          <article className={s.inset} key={title}>
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
