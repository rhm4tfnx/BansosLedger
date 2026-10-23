'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Dashboard } from './dashboard'
import { recipients, short, useDisbursements, wita, type Distribution } from './disbursement-data'
import { commitment, masked, money } from './recipient-data'
import s from './disbursements.module.css'

export function DisbursementDetail({ row, onSelect, onBack }: { row: Distribution; onSelect?: (id: string) => void; onBack?: () => void }) {
  const { data, operator, update } = useDisbursements()
  const [tampered, setTampered] = useState(false)
  const [verified, setVerified] = useState(false)
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState('')
  const r = recipients.find((r) => r.id === row.recipient)!
  const fields = [
    ['Data_ID', row.id, row.id],
    ['Hash penerima', r.identityHash ?? 'Tidak tersedia', r.identityHash ?? 'Tidak tersedia'],
    ['Program & periode', `${row.program} · ${row.period}`, `${row.program} · ${row.period}`],
    ['Nominal bantuan', money(tampered ? row.amount + 100000 : row.amount), money(row.amount)],
    ['CID bukti IPFS', row.cid, row.cid],
  ]
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage('Berhasil disalin.')
    } catch {
      setMessage('Salin manual: ' + value)
    }
  }
  return (
    <div className={s.page}>
      <div className={s.dark}>
        <div className={s.grid}>
          <div>
            <small>BESU QBFT EXPLORER</small>
            <h2>In-App Blockchain Transaction Explorer & Live Verifier</h2>
            <p>Pelacakan catatan penyaluran dan pengecekan silang keutuhan data MongoDB.</p>
            <code>{row.hash ? `/explorer/tx/${row.hash}` : 'Transaksi belum memiliki hash on-chain'}</code>
          </div>
          <div>
            {onSelect && <label>Pilih transaksi<select aria-label="Pilih transaksi explorer" value={row.id} onChange={(e) => onSelect(e.target.value)} style={{ width: '100%', color: '#243047', background: '#ffffff', marginTop: 8 }}>{data.rows.map((t) => <option key={t.id} value={t.id}>{t.id} — {recipients.find((r) => r.id === t.recipient)?.name} ({t.status})</option>)}</select></label>}
            {onBack && <button onClick={onBack} style={{ marginTop: 12 }}>Kembali ke tabel penyaluran</button>}
          </div>
        </div>
      </div>
      <div className={`${s.card} ${s[row.status]}`}>
        <div className={s.row}>
          <div>
            <span className={`${s.badge} ${s[row.status]}`}>{row.status}</span> <b>{row.id}</b>
            <p>{wita(row.date)}</p>
          </div>
          <div>
            <b>{money(row.amount)}</b>
            <p>
              {row.program} · {row.period}
            </p>
          </div>
        </div>
        <p>{row.reason}</p>
      </div>
      <div className={s.card}>
        <h2>Timeline status 3 fase · langkah 1–20</h2>
        <div className={s.grid}>
          {[
            'Fase 1: MongoDB off-chain (L1–L7)',
            'Fase 2: Pinata / IPFS (L8–L11)',
            'Fase 3a: MetaMask & kontrak (L12–L16)',
            'Fase 3b: Konsensus 4 validator QBFT (L17–L20)',
          ].map((label, i) => (
            <div className={s.phase} key={label}>
              <b>{label}</b>
              <p>
                {i === 0
                  ? 'Data awal tersimpan · PENDING'
                  : i === 1
                    ? row.cid
                      ? 'Bukti tersedia · CID simulasi'
                      : 'Menunggu unggah'
                    : i === 2
                      ? row.hash ? 'Pre-flight & tanda tangan selesai · recordDisbursement()' : 'Menunggu tanda tangan / pengiriman'
                      : row.status === 'SUCCESS'
                        ? `Pre-prepare, Prepare, Commit · 4/4 validator · Blok #${row.block}`
                        : row.reason}
              </p>
              <small>{i < 2 || row.hash ? wita(row.date) : 'Belum dikonfirmasi'} · ilustrasi</small>
            </div>
          ))}
        </div>
      </div>
      <div className={s.grid}>
        <div className={s.dark}>
          <h2>Rincian kriptografi & blok</h2>
          <code>TxHash: {row.hash ?? 'Belum terekam'}</code>
          <code>Nomor blok: {row.block ?? '—'}</code>
          <code>Timestamp: {row.hash ? wita(row.date) : '—'}</code>
          <code>Previous block hash: {row.block ? commitment(`block-${row.block - 1}`) : '—'}</code>
          <code>Wallet pengirim: {row.wallet}</code>
          <code>Hash penerima: {r.identityHash ?? 'Belum FINAL'}</code>
          <code>Penggunaan gas: {row.hash ? '118.420 (contoh)' : '—'}</code>
          {row.hash && <button onClick={() => copy(row.hash!)}>Salin TxHash</button>}
        </div>
        <div className={s.card}>
          <h2>Bukti penyaluran</h2>
          <p>{row.file}</p>
          <code>{row.cid || 'Belum ada CID'}</code>
          <div className={s.receipt}>
            <b>Berita acara serah terima · contoh</b>
            <p>Penerima: {r.name}</p>
            <p>NIK: {masked(r.nik)}</p>
            <p>Lokasi: {r.region}, Kelurahan Takkalasi</p>
            <small>Bukan bukti pinning IPFS nyata. Sampel hanya untuk demonstrasi frontend.</small>
          </div>
          <div className={s.actions}>
            {row.fileUrl ? (
              <a href={row.fileUrl} target="_blank" rel="noreferrer">
                Buka berkas lokal
              </a>
            ) : (
              <button onClick={() => setPreview(!preview)}>
                {preview ? 'Tutup' : 'Buka'} pratinjau sampel
              </button>
            )}
            <button disabled={!row.cid} onClick={() => copy(row.cid)}>
              Salin CID
            </button>
          </div>
          {preview && (
            <div className={s.receipt}>
              <h3>Dokumen sampel · {row.id}</h3>
              <p>
                Penyerahan {row.program} kepada {r.name}, sejumlah {money(row.amount)} untuk{' '}
                {row.period}.
              </p>
              <p>Dokumen simulasi, tanpa tanda tangan sah.</p>
            </div>
          )}
        </div>
      </div>
      <div className={s.card}>
        <div className={s.row}>
          <div>
            <h2>Verifikasi silang keutuhan data</h2>
            <p>Perbandingan salinan off-chain dan catatan on-chain simulasi.</p>
          </div>
          <div className={s.actions}>
            {operator && (
              <button
                disabled={row.status !== 'SUCCESS'}
                onClick={() => {
                  setTampered(!tampered)
                  setVerified(false)
                }}
              >
                {tampered ? 'Pulihkan data contoh' : 'Simulasikan manipulasi MongoDB'}
              </button>
            )}
            <button
              className={s.primary}
              disabled={row.status !== 'SUCCESS'}
              onClick={() => {
                setVerified(true)
                update((state) => ({
                  ...state,
                  logs: [
                    `Verifikasi ${row.id}: ${tampered ? 'MISMATCH' : 'MATCH'} (simulasi)`,
                    ...state.logs,
                  ],
                }))
              }}
            >
              Verifikasi di blockchain
            </button>
          </div>
        </div>
        {row.status !== 'SUCCESS' ? (
          <p>Verifikasi tidak tersedia: belum ada catatan penyaluran SUCCESS on-chain.</p>
        ) : (
          <div className={s.scroll}>
            <table className={s.table} style={{ minWidth: 650 }}>
              <thead>
                <tr>
                  <th>Atribut</th>
                  <th>MongoDB (off-chain)</th>
                  <th>Smart contract (on-chain)</th>
                  <th>Kecocokan</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(([label, off, on]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>
                      <code>{off}</code>
                    </td>
                    <td>
                      <code>{on}</code>
                    </td>
                    <td>
                      <span className={verified ? (off === on ? s.SUCCESS : s.FAILED) : ''}>
                        {verified ? (off === on ? '✓ MATCH' : '× MISMATCH') : 'Belum diperiksa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {message && (
        <p role="status" className={s.banner}>
          {message}
        </p>
      )}
    </div>
  )
}
export function DistributionExplorer({ hash }: { hash: string }) {
  const { data } = useDisbursements()
  const row = data.rows.find((r) => r.hash?.toLowerCase() === hash.toLowerCase())
  return (
    <Dashboard section="Penyaluran & IPFS">
      <div className={s.page}>
        <div className={s.heading}>
          <div>
            <small className={s.accent}>Operasional Bansos / Explorer</small>
            <h1>Blockchain Transaction Explorer</h1>
            <p>Verifikasi penyaluran · simulasi frontend</p>
          </div>
          <Link href="/dashboard/penyaluran">Kembali ke tabel penyaluran</Link>
        </div>
        {row ? (
          <DisbursementDetail key={row.id} row={row} />
        ) : (
          <div className={s.card}>
            <h2>Transaksi simulasi tidak tersedia</h2>
            <p>
              Data baru hanya bertahan selama sesi aplikasi. Refresh halaman akan mengembalikan data
              contoh awal.
            </p>
          </div>
        )}
      </div>
    </Dashboard>
  )
}
