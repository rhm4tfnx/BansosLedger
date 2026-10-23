'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, Plus, Copy, Activity, Server, CheckCircle2 } from 'lucide-react'
import { Dashboard } from '@/components/features/dashboard/overview/dashboard'
import { NetworkWidget, institutions, initialBlocks } from '@/components/features/dashboard/monitoring/network-widget'
import s from '@/components/features/dashboard/monitoring/monitoring.module.css'
const addresses = [
  '0x71C9591147D097A7402A15166126aA79450438A1',
  '0x3E82B1907C865a22FAaaD2Ef45DDbC7644D191B4',
  '0x9F14D2E811Ad12dACefc521ff765aBBa32B227C8',
  '0x5A60E9C114CefAe612AEf48ee4222Eacf0E363D9',
]
const wallet = '0x8A4E92c170B3d801F492a019C84E11F012345678'
export function NetworkMonitoring() {
  const [online, setOnline] = useState([true, true, true, true])
  const [slow, setSlow] = useState(false)
  const [mongo, setMongo] = useState(true)
  const [blocks, setBlocks] = useState(initialBlocks)
  const [next, setNext] = useState(0)
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(0)
  const count = online.filter(Boolean).length,
    quorum = count >= 3,
    locked = !quorum || !mongo,
    warning = slow || count === 3
  const proposer = online.map((_, i) => (next + i) % 4).find((i) => online[i]) ?? 0
  function scenario(type: number) {
    setOnline(
      type === 1
        ? [true, true, true, false]
        : type === 3
          ? [true, true, false, false]
          : [true, true, true, true],
    )
    setSlow(type === 2)
    setMongo(true)
    setNotice('')
    setPending(0)
  }
  function propose() {
    if (locked) return
    const time = new Date()
      .toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour12: false })
      .replaceAll('.', ':')
    setBlocks((b) =>
      [{ height: b[0].height + 1, proposer, tx: pending, votes: count, time }, ...b].slice(0, 6),
    )
    setNext((proposer + 1) % 4)
    setPending(0)
    setNotice('Blok simulasi difinalisasi. Pengusul beralih ke validator online berikutnya.')
  }
  return (
    <Dashboard section="Status jaringan">
      <div className={s.page}>
        <header className={s.hero}>
          <div>
            <span className={s.eyebrow}>
              <Activity size={14} /> INFRASTRUKTUR / MONITORING
            </span>
            <h1>Status jaringan</h1>
            <p>Monitoring jaringan & kesehatan konsensus Hyperledger Besu QBFT.</p>
          </div>
          <div className={s.actions}>
            <Link href="/explorer">
              Widget publik <span aria-hidden>↗</span>
            </Link>
            <button className={s.primary} disabled={locked} onClick={propose}>
              <Plus size={15} />
              Usulkan blok baru
            </button>
          </div>
        </header>
        <div className={s.disclaimer}>
          Data ilustrasi · Seluruh kontrol di halaman ini hanya mengubah simulasi sesi, bukan node
          VPS atau transaksi nyata.
        </div>
        <section className={s.card}>
          <header className={s.heading}>
            <div>
              <span className={s.eyebrow}>PENGUJIAN JARINGAN</span>
              <h2>Simulator kondisi operasional</h2>
            </div>
            <span className={s.badge}>Besu QBFT · 4 validator</span>
          </header>
          <div className={s.actions}>
            {[
              'Normal optimal · 38 ms',
              'Satu validator offline',
              'RPC tinggi & IPFS lambat',
              'Kuorum gagal & fail-safe',
            ].map((x, i) => (
              <button
                key={x}
                onClick={() => scenario(i)}
                aria-pressed={
                  i === 0
                    ? count === 4 && !slow && mongo
                    : i === 1
                      ? count === 3 && !slow
                      : i === 2
                        ? slow
                        : !quorum
                }
              >
                {x}
              </button>
            ))}
            <button onClick={() => setMongo((v) => !v)} aria-pressed={!mongo}>
              {mongo ? 'Simulasi MongoDB terganggu' : 'Pulihkan MongoDB'}
            </button>
          </div>
        </section>
        <section
          className={`${s.safety} ${locked ? s.critical : warning ? s.warning : ''}`}
          aria-live="polite"
        >
          {locked ? <ShieldAlert size={30} /> : <ShieldCheck size={30} />}
          <div>
            <span className={s.eyebrow}>
              SAFETY ·{' '}
              {locked ? 'FAIL-SAFE AKTIF' : warning ? 'PERINGATAN RISIKO' : 'OPERASIONAL NORMAL'}
            </span>
            <h2>
              {!quorum
                ? 'Kuorum tidak terpenuhi — penyaluran dikunci'
                : !mongo
                  ? 'MongoDB terganggu — penyaluran dikunci'
                  : slow
                    ? 'Latensi RPC & IPFS melewati ambang aman'
                    : count === 3
                      ? 'Satu node offline — konsensus tetap berjalan'
                      : 'Seluruh validator dan layanan beroperasi normal'}
            </h2>
            <p>
              {locked
                ? 'Pengiriman payload dan pengusulan blok simulasi dihentikan sampai layanan pulih.'
                : slow
                  ? 'RPC 920 ms, IPFS 1.450 ms. Transaksi berisiko mengalami keterlambatan.'
                  : 'Kuorum minimal 3/4 terpenuhi. Pengiriman transaksi simulasi diizinkan.'}
            </p>
          </div>
          <button
            disabled={locked}
            className={s.primary}
            onClick={() => {
              setPending((v) => v + 1)
              setNotice(
                'Transaksi simulasi masuk mempool. Usulkan blok untuk memfinalisasi; tidak ada transaksi dikirim ke Besu.',
              )
            }}
          >
            <CheckCircle2 size={15} />
            Uji kirim transaksi
          </button>
        </section>
        {notice && (
          <p className={s.notice} role="status">
            {notice}
          </p>
        )}
        <section className={s.card}>
          <header className={s.heading}>
            <div>
              <span className={s.eyebrow}>KONSENSUS HYPERLEDGER BESU QBFT</span>
              <h2>Validator institusional & kesehatan kuorum</h2>
              <p>
                Empat node, toleransi satu kegagalan · Minimal tiga tanda tangan untuk finalitas.
              </p>
            </div>
            <span className={quorum ? s.good : s.bad}>
              {count} / 4 validator · {quorum ? 'Kuorum terpenuhi' : 'Kuorum gagal'}
            </span>
          </header>
          <div className={s.pipeline}>
            <span>Pre-prepare</span> → <span>Prepare</span> → <span>Commit (3/4)</span> →{' '}
            <strong>{quorum ? 'Immediate finality' : 'Konsensus terhenti'}</strong>
            <small>
              Pengusul berikutnya: {quorum ? institutions[proposer] : 'Menunggu kuorum'}
            </small>
          </div>
          <div className={s.validators}>
            {institutions.map((name, i) => {
              const last = blocks.find((b) => b.proposer === i)
              return (
                <article className={s.node} key={name}>
                  <div className={s.heading}>
                    <Server size={19} />
                    <span className={online[i] ? s.good : s.bad}>
                      {online[i] ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <span className={s.eyebrow}>BESU-VAL{i + 1}</span>
                  <h3>{name}</h3>
                  <p>
                    {
                      [
                        'Operasional & signer',
                        'Monitoring administratif',
                        'Verifikasi LPJ & program',
                        'Audit independen via explorer',
                      ][i]
                    }
                  </p>
                  <dl>
                    <dt>Alamat node</dt>
                    <dd title={addresses[i]}>
                      {addresses[i].slice(0, 10)}…{addresses[i].slice(-6)}
                    </dd>
                    <dt>Peer terhubung</dt>
                    <dd>{online[i] ? count - 1 : 0} / 3</dd>
                    <dt>Blok diusulkan</dt>
                    <dd>#{last?.height ?? '—'}</dd>
                    <dt>Waktu (WITA)</dt>
                    <dd>{last?.time ?? '—'}</dd>
                  </dl>
                  <button
                    className={online[i] ? s.danger : ''}
                    onClick={() => setOnline((v) => v.map((x, j) => (j === i ? !x : x)))}
                  >
                    {online[i] ? 'Matikan' : 'Aktifkan'} node {i + 1} (simulasi)
                  </button>
                </article>
              )
            })}
          </div>
        </section>
        <div className={s.metrics}>
          {[
            ['Block height terbaru', `#${blocks[0].height}`, 'Blok terakhir terfinalisasi'],
            [
              'Waktu antar blok',
              quorum ? (slow ? '4,80 dtk' : '2,04 dtk') : 'Terhenti',
              'Target interval: 2 detik',
            ],
            [
              'Peer aktif per node',
              `${Math.max(0, count - 1)} / 3`,
              `${(count * (count - 1)) / 2} link antar-node · P2P 30303`,
            ],
            ['Antrean transaksi', `${pending} Tx`, 'Mempool · kapasitas contoh 4.096'],
          ].map(([title, value, sub]) => (
            <article className={s.card} key={title}>
              <p>{title}</p>
              <strong className={s.value}>{value}</strong>
              <small>{sub}</small>
            </article>
          ))}
        </div>
        <section className={s.card}>
          <header className={s.heading}>
            <div>
              <span className={s.eyebrow}>ARSITEKTUR KEAMANAN WEB3</span>
              <h2>Pemisahan kunci konsensus & otorisasi aplikasi</h2>
            </div>
            <span className={s.badge}>Rancangan kriptografis</span>
          </header>
          <div className={s.columns}>
            <article className={s.inset}>
              <h3>Kunci identitas node validator Besu</h3>
              <p>
                Khusus block sealing dan voting konsensus. Tidak memberikan hak menjalankan fungsi
                smart contract.
              </p>
              <code>/var/lib/besu/nodekey</code>
            </article>
            <article className={s.inset}>
              <h3>Wallet otorisasi Kelurahan</h3>
              <p>
                Signer aplikasi · Rancangan modifier onlyAuthorizedKelurahan pada
                BansosLpjRegistry.sol.
              </p>
              <code>{wallet}</code>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(wallet)
                    setNotice('Alamat wallet contoh disalin.')
                  } catch {
                    setNotice('Tidak dapat menyalin. Silakan salin alamat secara manual.')
                  }
                }}
              >
                <Copy size={13} />
                Salin alamat contoh
              </button>
            </article>
          </div>
        </section>
        <div className={s.columns}>
          <section className={s.card}>
            <header className={s.heading}>
              <div>
                <span className={s.eyebrow}>PERFORMANCE EFFICIENCY</span>
                <h2>Kesehatan JSON-RPC</h2>
                <p>Port 8545 · Metrik ilustrasi, bukan hasil benchmark ISO.</p>
              </div>
              <span className={slow ? s.bad : s.good}>{slow ? 'Lambat' : 'Sehat'}</span>
            </header>
            <div className={s.metricPairs}>
              {[
                ['Latensi ping JSON-RPC', slow ? '920 ms' : '38 ms', 'Ambang aman < 250 ms'],
                [
                  'Konfirmasi end-to-end',
                  quorum ? (slow ? '4.800 ms' : '1.840 ms') : '—',
                  'Payload → transaction receipt',
                ],
                ['Rata-rata penggunaan gas', '68.420 Gas', 'Resource utilization'],
                [
                  'Throughput',
                  quorum ? (slow ? '9,2 TPS' : '24,5 TPS') : '0 TPS',
                  'Kapasitas contoh',
                ],
              ].map(([label, value, sub]) => (
                <article className={s.inset} key={label}>
                  <p>{label}</p>
                  <strong className={s.value}>{value}</strong>
                  <small>{sub}</small>
                </article>
              ))}
            </div>
            <h3 className={s.chartTitle}>Latensi konfirmasi · 10 blok terakhir</h3>
            <div className={s.latencies}>
              {[1790, 1820, 1850, 1810, 1890, 1830, 1840, 1860, 1820, 1840].map((n, i) => (
                <div key={i}>
                  <span>{n}</span>
                  <meter
                    min={0}
                    max={2500}
                    value={n}
                    aria-label={`Blok ${4892095 + i}: ${n} milidetik`}
                  />
                  <small>#{2095 + i}</small>
                </div>
              ))}
            </div>
            <p>Riwayat ilustrasi tetap · milidetik</p>
          </section>
          <section className={s.card}>
            <header className={s.heading}>
              <div>
                <span className={s.eyebrow}>RELIABILITY & COMPATIBILITY</span>
                <h2>Konektivitas lintas layanan</h2>
                <p>Interoperabilitas Web2–Web3</p>
              </div>
            </header>
            <div className={s.inset}>
              <h3>Rasio transaksi berhasil vs gagal</h3>
              <p>Sampel ilustrasi: 852 transaksi historis</p>
              <progress max={852} value={842} aria-label="842 dari 852 transaksi berhasil" />
              <div className={s.actions}>
                <span className={s.good}>842 success · 98,8%</span>
                <span className={s.badge}>10 revert · 1,2%</span>
                <span>0 timeout</span>
              </div>
            </div>
            <div className={s.scroll}>
              <table>
                <thead>
                  <tr>
                    <th>Komponen</th>
                    <th>Protokol</th>
                    <th>Latensi</th>
                    <th>Status simulasi</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Next.js Route Handler', 'HTTPS / REST', '14 ms', true],
                    ['MongoDB', '27017', mongo ? '9 ms' : '—', mongo],
                    ['Pinata / IPFS', 'HTTPS / CID', slow ? '1.450 ms' : '112 ms', !slow],
                    [
                      'Hyperledger Besu',
                      'JSON-RPC 8545',
                      slow ? '920 ms' : '38 ms',
                      !slow && quorum,
                    ],
                  ].map(([name, protocol, latency, healthy]) => (
                    <tr key={String(name)}>
                      <td>{name}</td>
                      <td>{protocol}</td>
                      <td>{latency}</td>
                      <td>
                        <span className={healthy ? s.good : s.bad}>
                          {healthy ? 'Connected' : 'Terganggu'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <NetworkWidget blocks={blocks} online={online} />
        <p className={s.meta}>
          Cakupan referensi: validator, kuorum, round-robin, metrik jaringan, pemisahan kunci,
          performa RPC, interoperabilitas, fail-safe, dan widget publik. Telemetri real-time, RBAC,
          serta penguncian transaksi di server memerlukan integrasi backend.
        </p>
      </div>
    </Dashboard>
  )
}
