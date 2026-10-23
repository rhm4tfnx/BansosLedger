'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Settings2,
  Copy,
  ArrowUpRight,
  Database,
  Clock3,
  CircleCheck,
  CircleX,
  FileCheck2,
} from 'lucide-react'
import { Dashboard } from '@/components/features/dashboard/overview/dashboard'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { DisbursementWizard } from '@/components/features/dashboard/disbursements/disbursement-wizard'
import { DisbursementDetail } from '@/components/features/dashboard/disbursements/disbursement-detail'
import {
  periods,
  programs,
  recipients,
  short,
  useDisbursements,
  validWallet,
  wita,
  type Distribution,
  type Status,
} from '@/mocks/disbursement-data'
import { masked, money } from '@/mocks/recipient-data'
import s from '@/components/features/dashboard/disbursements/disbursements.module.css'

export function Disbursements() {
  const { data, update, operator } = useDisbursements()
  const [status, setStatus] = useState('Semua')
  const [program, setProgram] = useState('Semua')
  const [period, setPeriod] = useState('Semua')
  const [query, setQuery] = useState('')
  const [wizard, setWizard] = useState<{ scenario?: number; retry?: Distribution } | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [simulation, setSimulation] = useState(false)
  const [revealed, setRevealed] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const rows = data.rows.filter((t) => {
    const r = recipients.find((r) => r.id === t.recipient)!
    return (
      (status === 'Semua' || t.status === status) &&
      (program === 'Semua' || t.program === program) &&
      (period === 'Semua' || t.period === period) &&
      `${t.id} ${r.name} ${r.nik} ${t.cid} ${t.hash ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
  })
  const success = data.rows.filter((r) => r.status === 'SUCCESS')
  const metrics = [
    {
      title: 'Penyaluran terealisasi',
      status: 'SUCCESS',
      count: success.length,
      caption: money(success.reduce((a, r) => a + r.amount, 0)),
      note: 'Memiliki receipt & blok QBFT simulasi',
      icon: CircleCheck,
    },
    {
      title: 'Menunggu / tertahan',
      status: 'PENDING',
      count: data.rows.filter((r) => r.status === 'PENDING').length,
      caption: 'Fail-safe aktif',
      note: 'Menunggu pemulihan RPC / tanda tangan',
      icon: Clock3,
    },
    {
      title: 'Transaksi ditolak / revert',
      status: 'FAILED',
      count: data.rows.filter((r) => r.status === 'FAILED').length,
      caption: 'Rp 0 terealisasi dari transaksi gagal',
      note: 'Duplikat, nominal, atau wallet tidak sah',
      icon: CircleX,
    },
    {
      title: 'Bukti terdistribusi',
      status: '',
      count: data.rows.filter((r) => r.cid).length,
      caption: 'Berkas bukti contoh',
      note: 'CID simulasi · bukan pinning IPFS nyata',
      icon: FileCheck2,
    },
  ]
  function scenario(n: number) {
    if (!operator) return
    update((state) => ({
      ...state,
      online: n !== 4,
      wallet: n === 5 ? '0x0000000000000000000000000000000000000001' : validWallet,
    }))
    setSimulation(false)
    setWizard({ scenario: n })
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice('Hash berhasil disalin.')
    } catch {
      setNotice('Gagal menyalin. Silakan salin hash melalui detail.')
    }
  }
  function recheck(row: Distribution) {
    if (!operator) return
    const message = !data.online
      ? 'RPC offline: receipt belum dapat diperiksa.'
      : row.status === 'FAILED'
        ? 'Receipt simulasi: transaksi reverted. Periksa alasan gagal sebelum mengirim ulang.'
        : 'Belum ada receipt. Gunakan Kirim Ulang untuk meminta tanda tangan; status tidak diubah otomatis.'
    setNotice(`${row.id}: ${message}`)
    update((state) => ({ ...state, logs: [`Cek ulang ${row.id}: ${message}`, ...state.logs] }))
  }
  const selected = data.rows.find((r) => r.id === detail)
  return (
    <Dashboard section="Penyaluran & IPFS">
      <div className={s.page}>
        <div className={s.heading}>
          <div>
            <small className={s.accent}>Operasional Bansos / Penyaluran & IPFS</small>
            <h1>Pencatatan Penyaluran Bantuan Sosial</h1>
            <p>Bukti terdistribusi & pencatatan transparan · MongoDB → IPFS → Hyperledger Besu</p>
          </div>
          <div className={s.tabs} role="group" aria-label="Tampilan penyaluran">
            <button
              className={!detail ? s.selected : ''}
              aria-pressed={!detail}
              onClick={() => setDetail(null)}
            >
              Daftar & pencatatan penyaluran
            </button>
            <button
              className={detail ? s.selected : ''}
              aria-pressed={!!detail}
              disabled={!data.rows.length}
              onClick={() =>
                setDetail(
                  data.rows.find((r) => r.status === 'SUCCESS')?.id ?? data.rows[0]?.id ?? null,
                )
              }
            >
              Explorer & verifikasi
            </button>
          </div>
        </div>
        {selected ? (
          <DisbursementDetail
            key={selected.id}
            row={selected}
            onSelect={setDetail}
            onBack={() => setDetail(null)}
          />
        ) : (
          <>
            <div className={s.card}>
              <div className={s.row}>
                <label className={s.search}>
                  <Search size={17} />
                  <input
                    ref={input}
                    style={{ width: '100%' }}
                    placeholder="Cari ID, nama/NIK, CID, atau TxHash…"
                    aria-label="Pencarian penyaluran"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <kbd>⌘K</kbd>
                </label>
              </div>
              <div className={s.row} style={{ marginTop: 14 }}>
                <small>
                  Wallet Aplikasi Kelurahan <code>{short(data.wallet)}</code> · RPC 8545{' '}
                  <b>{data.online ? 'Online' : 'Offline'}</b>
                </small>
                <small>Konsensus QBFT: ambang 3/4 · 4 validator simulasi aktif</small>
              </div>
            </div>
            {notice && (
              <div role="status" className={s.banner}>
                {notice} <button onClick={() => setNotice('')}>Tutup</button>
              </div>
            )}
            <div className={s.grid}>
              <section className={s.card}>
                <div className={s.row}>
                  <h2>Statistik eksekusi penyaluran</h2>
                  <small>Periode 2026</small>
                </div>
                <p>Ringkasan status off-chain, bukti IPFS, dan transaksi.</p>
                <div className={s.grid} style={{ marginTop: 20 }}>
                  {metrics.map((m) => (
                    <div
                      key={m.title}
                      className={`${s.metric} ${m.status ? s[m.status] : s.banner}`}
                    >
                      <div className={s.row}>
                        <b>{m.title}</b>
                        <m.icon size={20} />
                      </div>
                      <strong>{m.count}</strong>
                      <b>{m.caption}</b>
                      <small>{m.note}</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className={s.card}>
                <div className={s.row}>
                  <h2>Alur 3 fase & realisasi program</h2>
                  {operator && (
                    <button onClick={() => setWizard({})}>
                      Lihat 7 langkah <ArrowUpRight size={14} />
                    </button>
                  )}
                </div>
                <p>Arsitektur hibrida off-chain, IPFS, dan smart contract.</p>
                <div className={s.three} style={{ marginTop: 20 }}>
                  {['MongoDB Off-Chain', 'Pinata / IPFS CID', 'MetaMask & QBFT'].map((x, i) => (
                    <div key={x} className={s.phase}>
                      <small className={s.accent}>FASE {i + 1}</small>
                      <strong>{x}</strong>
                      <small>
                        {
                          [
                            'Simpan PENDING & terbitkan Data_ID',
                            'Unggah bukti JPG/PDF & peroleh CID',
                            'Pre-flight, tanda tangan & konsensus',
                          ][i]
                        }
                      </small>
                    </div>
                  ))}
                </div>
                <div className={s.quota}>
                  <h3>Realisasi kuota & pagu program</h3>
                  <div className={s.grid}>
                    {programs.map((p) => {
                      const n = p.baseline + success.filter((r) => r.program === p.code).length
                      return (
                        <div className={s.phase} key={p.code}>
                          <div className={s.row}>
                            <b>{p.code}</b>
                            <small>{money(p.amount)} / KPM</small>
                          </div>
                          <progress max={p.quota} value={n} aria-label={`Realisasi ${p.code}`} />
                          <div className={s.row}>
                            <small>
                              {n}/{p.quota} KPM
                            </small>
                            <b>{Math.round((n / p.quota) * 100)}%</b>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p>
                    <small>
                      Baseline contoh periode berjalan; hanya SUCCESS menambah realisasi.
                    </small>
                  </p>
                </div>
              </section>
            </div>
            <section className={s.tableCard}>
              <div className={s.toolbar}>
                <div className={s.row}>
                  <div className={s.tabs} role="group" aria-label="Filter status">
                    {['Semua', 'SUCCESS', 'PENDING', 'FAILED'].map((x) => (
                      <button
                        key={x}
                        aria-pressed={status === x}
                        className={status === x ? s.selected : ''}
                        onClick={() => setStatus(x)}
                      >
                        {x} (
                        {x === 'Semua'
                          ? data.rows.length
                          : data.rows.filter((r) => r.status === x).length}
                        )
                      </button>
                    ))}
                  </div>
                  {operator && (
                    <div className={s.actions}>
                      <button onClick={() => setSimulation(true)}>
                        <Settings2 size={15} /> Simulasi pengujian
                      </button>
                      <button className={s.primary} onClick={() => setWizard({})}>
                        <Plus size={16} /> Catat penyaluran baru
                      </button>
                    </div>
                  )}
                </div>
                <div className={s.row}>
                  <div className={s.actions}>
                    <label>
                      Program
                      <select value={program} onChange={(e) => setProgram(e.target.value)}>
                        <option value="Semua">Semua program</option>
                        {programs.map((p) => (
                          <option key={p.code}>{p.code}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Periode
                      <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                        <option value="Semua">Semua periode</option>
                        {periods.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={() => {
                        setStatus('Semua')
                        setProgram('Semua')
                        setPeriod('Semua')
                        setQuery('')
                      }}
                    >
                      Reset filter
                    </button>
                  </div>
                  <small>Menampilkan {rows.length} transaksi</small>
                </div>
              </div>
              <div className={s.scroll}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      {[
                        'ID & waktu (WITA)',
                        'Penerima & hash komitmen',
                        'Program, periode & nominal',
                        'Bukti IPFS',
                        'Status eksekusi',
                        'TxHash on-chain',
                        'Aksi & pemulihan',
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => {
                      const r = recipients.find((r) => r.id === t.recipient)!
                      return (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.id}</strong>
                            <small>_id: sim-{t.id.slice(-3)}</small>
                            <small>{wita(t.date)}</small>
                          </td>
                          <td>
                            <strong>{r.name}</strong>
                            <small>
                              NIK: {operator && revealed.includes(t.id) ? r.nik : masked(r.nik)}
                            </small>
                            {operator && (
                              <button
                                onClick={() => {
                                  setRevealed((v) =>
                                    v.includes(t.id) ? v.filter((x) => x !== t.id) : [...v, t.id],
                                  )
                                  update((state) => ({
                                    ...state,
                                    logs: [
                                      `${revealed.includes(t.id) ? 'Tutup' : 'Buka'} masking NIK ${t.id} · Operator · ${wita(new Date().toISOString())}`,
                                      ...state.logs,
                                    ],
                                  }))
                                }}
                              >
                                {revealed.includes(t.id) ? 'Tutup' : 'Buka'} NIK
                              </button>
                            )}
                            <small>{r.region}</small>
                            <code>{short(r.identityHash ?? 'Belum FINAL')}</code>
                          </td>
                          <td>
                            <span className={`${s.badge} ${s.banner}`}>{t.program}</span>
                            <small>{t.period}</small>
                            <b>{money(t.amount)}</b>
                          </td>
                          <td>
                            <code>{short(t.cid) || 'Menunggu bukti'}</code>
                            <button disabled={!t.cid} onClick={() => setDetail(t.id)}>
                              Pratinjau bukti
                            </button>
                            <small>Simulasi</small>
                          </td>
                          <td>
                            <span className={`${s.badge} ${s[t.status]}`}>{t.status}</span>
                            <p>{t.reason}</p>
                            {t.block && <small>Blok #{t.block}</small>}
                          </td>
                          <td>
                            {t.hash ? (
                              <>
                                <Link href={`/explorer/tx/${t.hash}`}>
                                  <code>{short(t.hash)}</code>
                                </Link>
                                <button
                                  aria-label={`Salin hash ${t.id}`}
                                  onClick={() => copy(t.hash!)}
                                >
                                  <Copy size={12} />
                                </button>
                              </>
                            ) : (
                              <small>Belum terekam pada blok</small>
                            )}
                          </td>
                          <td>
                            <button onClick={() => setDetail(t.id)}>
                              <Search size={12} /> Detail & verifikasi
                            </button>
                            {operator && t.status !== 'SUCCESS' && (
                              <div className={s.actions}>
                                <button onClick={() => recheck(t)}>Cek ulang status</button>
                                <button
                                  className={s.primary}
                                  onClick={() => setWizard({ retry: t })}
                                >
                                  {t.cid ? 'Kirim ulang' : 'Lanjutkan bukti'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!rows.length && (
                  <p className={s.empty}>Tidak ada penyaluran yang sesuai filter.</p>
                )}
              </div>
            </section>
            <div className={s.grid}>
              <section className={s.card} id="jaringan">
                <h2>
                  <Database size={16} style={{ display: 'inline' }} /> Konsensus institusional QBFT
                </h2>
                {['Kel. Takkalasi', 'Kec. Balusu', 'Dinsos Kab. Barru', 'Auditor / Pengawas'].map(
                  (v, i) => (
                    <p className={s.row} key={v}>
                      <span>
                        Validator {i + 1} · {v}
                      </span>
                      <span className={s.SUCCESS}>Aktif (simulasi)</span>
                    </p>
                  ),
                )}
                <small>
                  Minimal 3 dari 4 validator · N=4, f=1. Wallet operator terpisah dari validator
                  key.
                </small>
              </section>
            </div>
          </>
        )}
        {wizard && operator && (
          <DisbursementWizard
            scenario={wizard.scenario}
            retry={wizard.retry}
            onClose={() => setWizard(null)}
          />
        )}

        {simulation && operator && (
          <RecipientDialog
            title="Simulasi Pengujian Skenario"
            subtitle="Black-box · Tabel 3.3 · Seluruh hasil merupakan simulasi frontend."
            onClose={() => setSimulation(false)}
          >
            <div className={`${s.page} ${s.body}`}>
              <div className={s.card}>
                <h2>Kontrol jaringan & wallet</h2>
                <label>
                  <input
                    type="checkbox"
                    checked={data.online}
                    onChange={(e) => update((state) => ({ ...state, online: e.target.checked }))}
                  />
                  RPC 8545 online
                </label>
                <p>Putuskan koneksi untuk menguji fail-safe PENDING.</p>
                <label>
                  Wallet
                  <select
                    value={data.wallet}
                    onChange={(e) => update((state) => ({ ...state, wallet: e.target.value }))}
                  >
                    <option value={validWallet}>Wallet Kelurahan (sah)</option>
                    <option value="0x0000000000000000000000000000000000000001">
                      Wallet tidak sah
                    </option>
                  </select>
                </label>
              </div>
              <h2>Jalankan skenario di wizard</h2>
              {[
                'Penyaluran normal — SUCCESS',
                'Duplikasi periode — pilih penerima pertama, BLT Tahap I',
                'Manipulasi nominal — Rp 500.000 bukan Rp 900.000',
                'Gangguan RPC — PENDING & pemulihan',
                'Wallet tidak sah / penerima belum FINAL — FAILED',
              ].map((x, i) => (
                <button className={s.choice} key={x} onClick={() => scenario(i + 1)}>
                  <b>Skenario {i + 1}</b>
                  <span>{x}</span>
                </button>
              ))}
              <p>
                Untuk uji keutuhan data, buka detail transaksi SUCCESS lalu pilih Simulasikan
                manipulasi MongoDB dan Verifikasi di blockchain.
              </p>
            </div>
          </RecipientDialog>
        )}
      </div>
    </Dashboard>
  )
}
