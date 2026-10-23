'use client'
import { useEffect, useRef, useState } from 'react'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import {
  checks,
  programs,
  periods,
  recipients,
  resolveRow,
  useDisbursements,
  validWallet,
  type Distribution,
} from '@/mocks/disbursement-data'
import { masked, money } from '@/mocks/recipient-data'
import s from '@/components/features/dashboard/disbursements/disbursements.module.css'

const steps = [
  'Program & periode',
  'Pilih penerima',
  'Nominal bantuan',
  'MongoDB & IPFS',
  'Pre-flight check',
  'Tanda tangan',
  'Status transaksi',
]
export function DisbursementWizard({
  onClose,
  scenario = 0,
  retry,
}: {
  onClose: () => void
  scenario?: number
  retry?: Distribution
}) {
  const { data, update, operator } = useDisbursements()
  const [step, setStep] = useState(retry ? (retry.cid ? 5 : 4) : 1)
  const [program, setProgram] = useState(retry?.program ?? 'BLT')
  const [period, setPeriod] = useState(retry?.period ?? periods[scenario === 2 ? 0 : 1])
  const [recipient, setRecipient] = useState(retry?.recipient ?? '')
  const [force, setForce] = useState(scenario === 2 || scenario === 5)
  const [manipulate, setManipulate] = useState(scenario === 3)
  const [amount, setAmount] = useState(retry?.amount ?? (scenario === 3 ? 500000 : 900000))
  const [query, setQuery] = useState('')
  const [file, setFile] = useState(retry?.file ?? '')
  const [fileUrl, setFileUrl] = useState(retry?.fileUrl)
  const [cid, setCid] = useState(retry?.cid ?? '')
  const [saved, setSaved] = useState<Distribution | undefined>(retry)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<Distribution>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lock = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  const p = programs.find((p) => p.code === program)!
  const r = recipients.find((r) => r.id === recipient)
  const draft = { id: saved?.id ?? '', program, period, recipient, amount }
  const indicators = checks(draft, data.rows, data.wallet)
  const good = indicators.every((c) => c.ok)
  const used =
    p.baseline + data.rows.filter((t) => t.program === program && t.status === 'SUCCESS').length
  function invalidate() {
    setCid('')
  }
  function stage() {
    if (!operator || lock.current) return
    if (!file) {
      setError('Pilih berkas bukti atau sampel terlebih dahulu.')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    const id =
      saved?.id ??
      `PEN-2026-${String(Math.max(7, ...data.rows.map((x) => Number(x.id.split('-').at(-1)) || 0)) + 1).padStart(3, '0')}`
    const pending: Distribution = {
      ...draft,
      id,
      status: 'PENDING',
      reason: 'Menunggu unggah bukti dan tanda tangan (simulasi)',
      file,
      fileUrl,
      cid: '',
      date: new Date().toISOString(),
      wallet: data.wallet,
    }
    setSaved(pending)
    update((state) => ({
      ...state,
      rows: [pending, ...state.rows.filter((x) => x.id !== id)],
      logs: [`Simpan PENDING ${id}`, ...state.logs],
    }))
    timer.current = setTimeout(() => {
      const complete = {
        ...pending,
        cid: `SIM-CID-${id}`,
        reason: 'Bukti siap; menunggu tanda tangan (simulasi)',
      }
      setSaved(complete)
      setCid(complete.cid)
      setBusy(false)
      lock.current = false
      update((state) => ({ ...state, rows: state.rows.map((x) => (x.id === id ? complete : x)) }))
    }, 650)
  }
  function sign(reject = false) {
    if (!saved || !operator || lock.current) return
    lock.current = true
    setStep(7)
    setBusy(true)
    setProgress(1)
    timer.current = setTimeout(() => {
      setProgress(2)
      timer.current = setTimeout(() => {
        const final = reject
          ? {
              ...saved,
              status: 'PENDING' as const,
              reason: 'Tanda tangan ditolak pengguna. Aman untuk ditandatangani ulang.',
            }
          : resolveRow(saved, data)
        setResult(final)
        setBusy(false)
        setProgress(3)
        lock.current = false
        update((state) => ({
          ...state,
          rows: state.rows.map((x) => (x.id === final.id ? final : x)),
          logs: [`${final.id}: ${final.status} — ${final.reason}`, ...state.logs],
        }))
      }, 700)
    }, 600)
  }
  function next() {
    setError('')
    if (step === 1 && used >= p.quota) return setError('Kuota program habis.')
    if (
      step === 2 &&
      (!r ||
        (!force &&
          !checks(draft, data.rows, data.wallet)
            .filter((_, i) => i === 0 || i === 2)
            .every((c) => c.ok)))
    )
      return setError('Pilih penerima yang memenuhi syarat.')
    if (step === 3 && (!Number.isSafeInteger(amount) || amount <= 0))
      return setError('Nominal harus berupa bilangan bulat positif.')
    if (step === 4 && !cid)
      return setError('Selesaikan penyimpanan dan unggah simulasi terlebih dahulu.')
    if (step === 5 && !good && !force)
      return setError('Pre-flight gagal. Perbaiki data atau aktifkan mode uji paksa.')
    setStep(step + 1)
  }
  return (
    <RecipientDialog
      title="Catat Penyaluran Bantuan Sosial Baru"
      subtitle="Wizard 7 langkah · Simulasi frontend, tidak mengirim transaksi atau berkas ke jaringan."
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className={`${s.page} ${s.body}`}>
        <div className={s.steps}>
          {steps.map((label, i) => (
            <div
              key={label}
              className={`${s.step} ${step === i + 1 ? s.current : ''}`}
              aria-current={step === i + 1 ? 'step' : undefined}
            >
              <span>{step > i + 1 ? '✓' : i + 1}</span>
              {label}
            </div>
          ))}
        </div>
        <div className={s.content}>
          {step === 1 && (
            <>
              <div className={s.banner}>
                <h2>Pilih program & periode penyaluran aktif</h2>Nominal mengikuti aturan program.
                Kuota dan pagu di bawah adalah data contoh.
              </div>
              <div className={s.grid}>
                {programs.map((x) => (
                  <button
                    key={x.code}
                    className={`${s.choice} ${program === x.code ? s.chosen : ''}`}
                    onClick={() => {
                      setProgram(x.code)
                      setAmount(x.amount)
                      invalidate()
                    }}
                  >
                    <div className={s.row}>
                      <b className={s.accent}>{x.code}</b>
                      <b>{money(x.amount)} / KPM</b>
                    </div>
                    <strong>{x.name}</strong>
                    <div className={s.row}>
                      <small>Total kuota: {x.quota} KPM</small>
                      <small>
                        Sisa:{' '}
                        {x.quota -
                          x.baseline -
                          data.rows.filter((r) => r.program === x.code && r.status === 'SUCCESS')
                            .length}{' '}
                        KPM
                      </small>
                    </div>
                    <small>Pagu: {money(x.quota * x.amount)}</small>
                  </button>
                ))}
              </div>
              <label>
                Periode aktif
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value)
                    invalidate()
                  }}
                >
                  {periods.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <div className={s.banner}>
                <h2>Pilih warga penerima untuk {program}</h2>
                <label>
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                  />
                  Mode uji paksa skenario penyelewengan
                </label>
              </div>
              <input
                aria-label="Cari penerima"
                placeholder="Cari nama, NIK, atau RT/RW…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className={s.list}>
                {recipients
                  .filter((x) =>
                    `${x.name} ${x.nik} ${x.region}`.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((x) => {
                    const c = checks({ ...draft, recipient: x.id }, data.rows, data.wallet)
                    const eligible = c[0].ok && c[2].ok
                    return (
                      <button
                        key={x.id}
                        disabled={!eligible && !force}
                        className={`${s.choice} ${recipient === x.id ? s.chosen : ''}`}
                        onClick={() => {
                          setRecipient(x.id)
                          invalidate()
                        }}
                      >
                        <div className={s.row}>
                          <b>{x.name}</b>
                          <span className={`${s.badge} ${eligible ? s.SUCCESS : s.FAILED}`}>
                            {eligible
                              ? 'Memenuhi syarat · FINAL'
                              : !c[0].ok
                                ? 'Duplikat periode'
                                : `Belum FINAL · ${x.status}`}
                          </span>
                        </div>
                        <small>
                          {masked(x.nik)} · {x.region}
                        </small>
                        <code>{x.identityHash ?? 'Belum memiliki hash komitmen'}</code>
                      </button>
                    )
                  })}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className={s.banner}>
                <h2>Nominal bantuan terkunci sesuai program</h2>
                <label>
                  <input
                    type="checkbox"
                    checked={manipulate}
                    onChange={(e) => {
                      setManipulate(e.target.checked)
                      setForce(e.target.checked || force)
                      if (!e.target.checked) setAmount(p.amount)
                      invalidate()
                    }}
                  />
                  Simulasi manipulasi nominal
                </label>
              </div>
              <div className={s.grid}>
                <div className={s.card}>
                  <label>
                    Nominal bantuan (Rp)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      readOnly={!manipulate}
                      onChange={(e) => {
                        setAmount(Number(e.target.value))
                        invalidate()
                      }}
                    />
                  </label>
                  <p>
                    {money(amount)} ·{' '}
                    {manipulate ? 'Mode uji manipulasi' : 'Terkunci sesuai ketentuan'}
                  </p>
                </div>
                <div className={s.card}>
                  <h3>Ketentuan resmi program (contoh)</h3>
                  {programs.map((x) => (
                    <p className={s.row} key={x.code}>
                      <span>{x.code}</span>
                      <b>{money(x.amount)}</b>
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <div className={s.banner}>
                <h2>Simpan data awal & siapkan bukti penyerahan</h2>Fase 1: PENDING → Fase 2: CID
                simulasi. Berkas tidak dikirim ke Pinata.
              </div>
              <div className={s.grid}>
                <div className={s.card}>
                  <label>
                    Unggah JPG / PDF (maks. 5 MB)
                    <input
                      type="file"
                      accept="image/jpeg,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        if (
                          !['image/jpeg', 'application/pdf'].includes(f.type) ||
                          f.size > 5 * 1024 * 1024
                        ) {
                          setError('Hanya JPG/PDF maksimal 5 MB.')
                          return
                        }
                        setFile(f.name)
                        setFileUrl(URL.createObjectURL(f))
                        invalidate()
                        setError('')
                      }}
                    />
                  </label>
                  <p>Atau gunakan sampel demonstrasi:</p>
                  <button
                    onClick={() => {
                      setFile('Berita_Acara_Contoh.pdf')
                      setFileUrl(undefined)
                      invalidate()
                    }}
                  >
                    Pilih sampel berita acara
                  </button>
                  <p>{file || 'Belum ada berkas'}</p>
                  <button disabled={busy || !!cid} className={s.primary} onClick={stage}>
                    {busy
                      ? 'Memproses…'
                      : cid
                        ? 'Fase 1 & 2 selesai'
                        : 'Simpan & proses bukti simulasi'}
                  </button>
                </div>
                <div className={s.card}>
                  <h3>Status fase 1 & 2</h3>
                  <p>MongoDB: {saved ? `${saved.id} · PENDING (simulasi)` : 'Belum diproses'}</p>
                  <p>IPFS: {cid || 'Menunggu bukti'}</p>
                  <small>CID berawalan SIM bukan CID IPFS nyata.</small>
                  {fileUrl && (
                    <p>
                      <a href={fileUrl} target="_blank" rel="noreferrer">
                        Pratinjau berkas lokal
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <div className={s.three}>
                <div className={s.card}>
                  <h3>Data off-chain</h3>
                  <code>{saved?.id}</code>
                  <p>{r?.name}</p>
                  <p>{r && masked(r.nik)}</p>
                  <span className={`${s.badge} ${s.PENDING}`}>PENDING</span>
                </div>
                <div className={s.card}>
                  <h3>Bukti IPFS simulasi</h3>
                  <p>{file}</p>
                  <code>{cid}</code>
                </div>
                <div className={s.dark}>
                  <h3>Payload on-chain</h3>
                  <code>{r?.identityHash ?? 'Hash tidak tersedia'}</code>
                  <p>
                    {program} · {period}
                  </p>
                  <code>
                    amount: {amount}
                    <br />
                    wallet: {data.wallet}
                    <br />
                    timestamp: {saved?.date}
                  </code>
                </div>
              </div>
              <div className={s.card}>
                <h2>Pre-flight check · {indicators.filter((x) => x.ok).length}/4 lolos</h2>
                <div className={s.grid}>
                  {indicators.map((c) => (
                    <div key={c.label} className={`${s.check} ${c.ok ? s.SUCCESS : s.FAILED}`}>
                      <b>
                        {c.ok ? '✓' : '×'} {c.label}
                      </b>
                      <p>{c.ok ? 'Lolos pemeriksaan simulasi' : c.error}</p>
                    </div>
                  ))}
                </div>
                {!good && (
                  <label>
                    <input
                      type="checkbox"
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                    />
                    Tetap paksa kirim ke smart contract (khusus pengujian)
                  </label>
                )}
              </div>
            </>
          )}
          {step === 6 && (
            <div className={s.grid}>
              <div>
                <h2>Konfirmasi & tanda tangan MetaMask</h2>
                <p>
                  Simulasi persetujuan Wallet Aplikasi Kelurahan. Tidak membuka wallet asli atau
                  menarik gas.
                </p>
                <div className={s.card}>
                  <p>RPC 8545: {data.online ? 'ONLINE' : 'OFFLINE'}</p>
                  <p>Pre-flight: {indicators.filter((c) => c.ok).length}/4 lolos</p>
                </div>
              </div>
              <div className={s.dark}>
                <h2>Konfirmasi transaksi · SIMULASI</h2>
                <code>{data.wallet}</code>
                <hr />
                <code>{`recordDisbursement(\n recipientHash: ${r?.identityHash ?? 'TIDAK ADA'},\n programId: ${program},\n periodId: ${period},\n amount: ${amount},\n ipfsCid: ${cid}\n)`}</code>
                <p>Estimasi gas: 142.800 · Biaya contoh: 0 ETH</p>
                <div className={s.actions}>
                  <button onClick={() => sign(true)}>Tolak</button>
                  <button className={s.primary} onClick={() => sign()}>
                    Approve / Tanda tangani
                  </button>
                </div>
              </div>
            </div>
          )}
          {step === 7 && (
            <>
              <div className={s.dark}>
                <h3>Progres eksekusi simulasi</h3>
                <code>[1/3] Payload JSON-RPC 8545 {progress >= 1 ? '· siap' : ''}</code>
                <code>
                  [2/3] Smart contract & QBFT: Pre-prepare → Prepare → Commit{' '}
                  {progress >= 2 ? '· diperiksa' : ''}
                </code>
                <code>
                  [3/3] Sinkronisasi status off-chain {progress === 3 ? '· selesai' : '· menunggu'}
                </code>
              </div>
              {result ? (
                <div className={`${s.card} ${s[result.status]}`} role="status">
                  <h2>{result.status}</h2>
                  <p>{result.reason}</p>
                  <code>{result.hash || 'Belum ada TxHash'}</code>
                  <p>
                    {result.block
                      ? `Blok #${result.block} · ${result.status === 'SUCCESS' ? '4/4 validator · konfirmasi simulasi 1.300 ms' : 'Reverted'}`
                      : 'Data dipertahankan sebagai PENDING.'}
                  </p>
                  <small>
                    {result.status === 'SUCCESS'
                      ? 'Realisasi kuota dan total diperbarui.'
                      : 'Pagu tidak berkurang. Pemulihan tersedia di tabel.'}
                  </small>
                </div>
              ) : (
                <p role="status">Memproses transaksi simulasi…</p>
              )}
            </>
          )}
          {error && (
            <p role="alert" className={s.FAILED}>
              {error}
            </p>
          )}
        </div>
        <div className={s.footer}>
          <small>
            Langkah {step} dari 7 · {steps[step - 1]}
          </small>
          <div className={s.actions}>
            {step < 7 && (
              <button disabled={busy} onClick={() => (step === 1 ? onClose() : setStep(step - 1))}>
                {step === 1 ? 'Batal' : 'Kembali'}
              </button>
            )}
            {step < 6 && (
              <button disabled={busy || !operator} className={s.primary} onClick={next}>
                Lanjut ke langkah {step + 1}
              </button>
            )}
            {step === 7 && (
              <button disabled={busy} className={s.primary} onClick={onClose}>
                Selesai & lihat tabel
              </button>
            )}
          </div>
        </div>
      </div>
    </RecipientDialog>
  )
}
