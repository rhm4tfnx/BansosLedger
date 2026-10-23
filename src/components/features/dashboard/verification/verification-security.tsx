import { securityRequirements } from '@/mocks/verification-data'
import s from '@/components/features/dashboard/verification/verification.module.css'
export function VerificationSecurity() {
  return (
    <div className={s.columns}>
      <section className={s.card}>
        <span className={s.eyebrow}>TABEL 3.9 · ISO/IEC 25010:2023</span>
        <h2>Bukti pemenuhan aspek Security</h2>
        <p>Status implementasi, bukan hasil sertifikasi atau skor pengujian resmi.</p>
        <div className={s.scroll}>
          <table>
            <thead>
              <tr>
                <th>Subkarakteristik</th>
                <th>Implementasi & bukti yang diperlukan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {securityRequirements.map(([name, text, status]) => (
                <tr key={name}>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td>{text}</td>
                  <td>
                    <span className={s.badge}>{status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={s.card}>
        <span className={s.eyebrow}>TABEL 3.1 · USER ROLE MATRIX</span>
        <h2>Akses lintas peran</h2>
        <p>Kebijakan yang ditargetkan; belum merupakan kontrol akses server.</p>
        {[
          [
            'Operator Bansos · Kelurahan Takkalasi',
            'Rekonsiliasi, pembukaan NIK tercatat, dan pemulihan dokumen melalui otorisasi server.',
          ],
          [
            'Kecamatan Balusu & Dinas Sosial Kab. Barru',
            'Read-only: verifikasi laporan, pencarian, filter, dan ekspor log. NIK tetap dimasking.',
          ],
          [
            'Auditor / pihak pengawas',
            'Pemeriksaan independen melalui explorer, tanpa akses dashboard operasional.',
          ],
          [
            'Masyarakat / penerima',
            'Transparansi penyaluran dan pemeriksaan TxHash publik tanpa data pribadi.',
          ],
        ].map(([title, text]) => (
          <article className={s.inset} key={title}>
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
