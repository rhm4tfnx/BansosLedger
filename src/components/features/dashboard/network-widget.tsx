import s from './monitoring.module.css'
export const institutions = [
  'Kelurahan Takkalasi',
  'Kecamatan Balusu',
  'Dinas Sosial Kab. Barru',
  'Auditor / Inspektorat',
]
export type NetworkBlock = {
  height: number
  proposer: number
  tx: number
  votes: number
  time: string
}
export const initialBlocks: NetworkBlock[] = [0, 1, 2, 3].map((i) => ({
  height: 4892104 - i,
  proposer: 3 - i,
  tx: [2, 1, 3, 1][i],
  votes: 4,
  time: ['09:19:04', '09:19:02', '09:19:00', '09:18:58'][i],
}))
export function NetworkWidget({
  blocks = initialBlocks,
  online = [true, true, true, true],
}: {
  blocks?: NetworkBlock[]
  online?: boolean[]
}) {
  return (
    <section className={s.card} aria-label="Ringkasan jaringan publik">
      <header className={s.heading}>
        <div>
          <span className={s.eyebrow}>TRANSPARANSI KONSENSUS · PUBLIK & AUDITOR</span>
          <h2>Kesehatan jaringan BansosLedger</h2>
          <p>Kabupaten Barru · Data ilustrasi, bukan telemetri langsung.</p>
        </div>
        <span className={s.badge}>
          {online.filter(Boolean).length}/4 validator aktif · Simulasi
        </span>
      </header>
      <div className={s.institutions}>
        {institutions.map((name, i) => (
          <span key={name}>
            <i className={online[i] ? s.dot : s.offDot} />
            {name}
          </span>
        ))}
      </div>
      <p className={s.meta}>
        Blok terakhir #{blocks[0].height} · Target interval 2 detik · Finalitas langsung saat kuorum
        terpenuhi
      </p>
      <div className={s.scroll}>
        <table>
          <thead>
            <tr>
              {[
                'Nomor blok',
                'Validator pengusul (round-robin)',
                'Jumlah TX',
                'Gas used',
                'Suara QBFT',
                'Waktu blok (WITA)',
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blocks.slice(0, 6).map((b) => (
              <tr key={b.height}>
                <td className={s.mono}>#{b.height}</td>
                <td>{institutions[b.proposer]}</td>
                <td>{b.tx} Tx</td>
                <td className={s.mono}>{(b.tx * 68420).toLocaleString('id-ID')}</td>
                <td>
                  <span className={s.good}>{b.votes}/4 validator</span>
                </td>
                <td className={s.mono}>{b.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
