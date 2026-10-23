import { categories, type AuditEntry } from '@/stores/audit-store'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
export function AuditPanels({
  logs,
  select,
}: {
  logs: AuditEntry[]
  select: (category: string) => void
}) {
  return (
    <>
      <div className={s.columns}>
        <section className={s.card}>
          <span className={s.eyebrow}>WHO DID WHAT AND WHEN</span>
          <h2>Cakupan aktivitas operasional & siklus data</h2>
          <div className={s.grid}>
            {categories.map((category) => (
              <button className={s.metric} key={category} onClick={() => select(category)}>
                <span>{category}</span>
                <strong>
                  {logs.filter((l) => l.category === category).length} <small>aktivitas</small>
                </strong>
                <small>Filter catatan sesi berdasarkan kategori</small>
              </button>
            ))}
          </div>
        </section>
        <section className={s.card}>
          <span className={s.eyebrow}>ISO/IEC 25010:2023 · SECURITY & SAFETY</span>
          <h2>Pemetaan kebutuhan keamanan</h2>
          <p>Indikator kebutuhan, bukan bukti kelulusan pengujian.</p>
          <div className={s.grid}>
            {[
              ['Confidentiality', 'Audit akses NIK tanpa menyimpan NIK penuh dalam log.'],
              [
                'Integrity',
                'UI tidak menyediakan edit atau hapus log. Proteksi server belum tersedia.',
              ],
              ['Authenticity', 'Verifikasi akun dan wallet signer memerlukan backend.'],
              ['Non-repudiation', 'Bukti TxHash, CID, dan tanda tangan belum diverifikasi.'],
              [
                'Accountability',
                'Aksi dan waktu WITA tercatat selama sesi. Identitas/IP belum terverifikasi.',
              ],
              ['Safety (Fail-Safe)', 'Simulasi penguncian; belum terhubung ke RPC dan kuorum.'],
            ].map(([title, text]) => (
              <article className={s.inset} key={title}>
                <b>{title}</b>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <div className={s.columns}>
        <section className={s.card}>
          <span className={s.eyebrow}>TABEL 3.3 · LIMA SKENARIO</span>
          <h2>Penolakan & peringatan keamanan</h2>
          {[
            'Duplikasi penyaluran',
            'Ketidaksesuaian nominal',
            'Wallet tidak berwenang',
            'KPM tidak valid',
            'Manipulasi riwayat',
          ].map((name, i) => (
            <div className={s.statRow} key={name}>
              <span>
                0{i + 1} · {name}
              </span>
              <b>{logs.filter((l) => l.action.includes(`Skenario ${i + 1}:`)).length} catatan</b>
            </div>
          ))}
        </section>
        <section className={s.card}>
          <span className={s.eyebrow}>KORELASI TIGA LAPISAN PENYIMPANAN</span>
          <h2>Dari data operasional ke bukti permanen</h2>
          {[
            ['F1', 'Off-chain · MongoDB', 'Data_ID · identitas, status PENDING, perubahan nilai'],
            ['F2', 'Terdistribusi · Pinata / IPFS', 'CID · bukti JPG/PDF dan referensi dokumen'],
            [
              'F3',
              'On-chain · Hyperledger Besu QBFT',
              'TxHash · nomor blok, signer dan hasil SUCCESS / FAILED',
            ],
          ].map(([n, title, desc]) => (
            <article className={s.phase} key={n}>
              <span className={s.badge}>{n}</span>
              <div>
                <b>{title}</b>
                <p>{desc}</p>
              </div>
            </article>
          ))}
          <small>Referensi SIM-* pada simulator bukan bukti kriptografis.</small>
        </section>
      </div>
    </>
  )
}
