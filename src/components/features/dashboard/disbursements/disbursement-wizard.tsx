'use client'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { initialPrograms, type Program } from '@/mocks/program-data'
import { initialEnrollments, type Enrollment } from '@/mocks/enrollment-data'
import { formatPeriod } from '@/lib/utils'
import { appendAudit } from '@/stores/audit-store'
import { programPeriods, transactionSteps, statusIcon, failureReason, resolveRow } from '@/mocks/disbursement-data'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useConnectedWallet } from '@/hooks/use-connected-wallet'
import { verifyConnectedWalletAccess } from '@/lib/blockchain/web3-auth'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import {
  checks,
  recipients,
  useDisbursements,
  validWallet,
  type Distribution,
} from '@/mocks/disbursement-data'
import { masked, money } from '@/mocks/recipient-data'
import s from '@/components/features/dashboard/disbursements/disbursements.module.css'

const TEST_MODE = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === 'true'
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
  scenario: requestedScenario = 0,
  retry,
}: {
  onClose: () => void
  scenario?: number
  retry?: Distribution
}) {
  const { data: catalog = initialPrograms } = useSWR<Program[]>('programs-demo', null, { fallbackData: initialPrograms })
  const { data: enrollments = initialEnrollments } = useSWR<Enrollment[]>('program-enrollments-demo', null, { fallbackData: initialEnrollments })
  const programs = catalog.filter(p => !p.deleted).map(p => ({ ...p, baseline: p.used }))
  const scenario = TEST_MODE ? requestedScenario : 0
  const { data, update, operator } = useDisbursements()
  const { role, can } = useRoleAccess()
  const wallet = useConnectedWallet()
  const access = verifyConnectedWalletAccess({ role, connectedAddress: wallet.address, expectedWalletAddress: process.env.NEXT_PUBLIC_AUTHORIZED_KELURAHAN_WALLET, chainIdHex: wallet.chainId })
  const [step, setStep] = useState(retry ? 4 : 1)
  const [program, setProgram] = useState(retry?.program ?? programs.find(p => p.status === 'ACTIVE')?.code ?? programs[0].code)
  const [periodId, setPeriodId] = useState(retry?.periodId ?? programs.find(p => p.code === program)!.startPeriod)
  const period = formatPeriod(periodId)
  const [recipient, setRecipient] = useState(retry?.recipient ?? '')
  const [forceState, setForce] = useState(scenario === 2 || scenario === 5)
  const [manipulateState, setManipulate] = useState(scenario === 3)
  const force = TEST_MODE && forceState
  const manipulate = TEST_MODE && manipulateState
  const [amount, setAmount] = useState(TEST_MODE ? retry?.amount ?? (scenario === 3 ? 500000 : 900000) : programs.find(p => p.code === program)!.amount)
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState<{ name: string; url: string; viewed: boolean }[]>([])
  const [privacy, setPrivacy] = useState([false, false, false])
  const [approved, setApproved] = useState(false)
  const file = files.map(f => f.name).join(', ')
  const fileUrl = files[0]?.url
  const evidenceReady = files.length > 0 && files.every(f => f.viewed) && privacy.every(Boolean) && approved
  const processing = useRef(false)
  const privacyStatements = ['Berkas tidak memuat NIK, KK, nomor telepon, atau alamat lengkap yang terbaca.', 'Wajah anak dan data sensitif lain tidak tampil.', 'Penerima telah memberi persetujuan untuk difoto dan dipublikasikan.']
  async function addFiles(selected: File[]) {
    if (processing.current || busy) return
    if (files.length + selected.length > 3) { setError('Pilih 1–3 berkas, masing-masing maksimal 5 MB.'); return }
    processing.current = true; setBusy(true); setError('')
    const additions: typeof files = []
    try {
      for (const f of selected) {
        if (f.size > 5 * 1024 * 1024) throw new Error('Hanya JPG/PDF maksimal 5 MB.')
        const bytes = new Uint8Array(await f.slice(0, 4).arrayBuffer())
        const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        const pdf = bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70
        if ((!jpg && !pdf) || (jpg && !/\.jpe?g$/i.test(f.name)) || (pdf && !/\.pdf$/i.test(f.name))) throw new Error('Berkas bukan JPG/PDF yang valid.')
        let blob: Blob = new Blob([await f.arrayBuffer()], { type: pdf ? 'application/pdf' : 'image/jpeg' })
        if (jpg) {
          const bitmap = await createImageBitmap(blob)
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
          const context = canvas.getContext('2d'); if (!context) { bitmap.close(); throw new Error('Berkas bukan JPG/PDF yang valid.') }
          context.drawImage(bitmap, 0, 0); bitmap.close()
          blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Berkas bukan JPG/PDF yang valid.')), 'image/jpeg', 0.92))
          if (blob.size > 5 * 1024 * 1024) throw new Error('Hasil berkas melebihi 5 MB.')
        }
        additions.push({ name: f.name, url: URL.createObjectURL(blob), viewed: false })
      }
      setFiles(current => [...current, ...additions]); setPrivacy([false, false, false]); setApproved(false); invalidate()
    } catch (e) { additions.forEach(f => URL.revokeObjectURL(f.url)); setError(e instanceof Error ? e.message : 'Berkas bukan JPG/PDF yang valid.') }
    finally { processing.current = false; setBusy(false) }
  }
  const [cid, setCid] = useState('')
  const [saved, setSaved] = useState<Distribution | undefined>(retry)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Distribution>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lock = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  const p = programs.find((p) => p.code === program)!
  const r = recipients.find((r) => r.id === recipient)
  const draft = { id: saved?.id ?? '', program, period, recipient, amount, programId: p.programId, periodId }
  const check = (value: typeof draft) => checks(value, data.rows, wallet.address ?? data.wallet, catalog, enrollments)
  const indicators = check(draft)
  const good = indicators.every((c) => c.ok)
  const used =
    p.baseline + data.rows.filter((t) => t.program === program && t.status === 'SUCCESS').length
  function invalidate() {
    setCid('')
  }
  function stage() {
    if (!operator || !can('evidence:upload') || lock.current) return
    if (!evidenceReady) {
      setError('Pratinjau semua berkas dan lengkapi persetujuan privasi terlebih dahulu.')
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
      evidenceFiles: files.map(({ name, url }) => ({ name, url })),
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
  async function sign(reject = false) {
    if (!saved || !can('transaction:sign') || !access.allowed || lock.current) return
    if (!TEST_MODE && !good) { setError(indicators.filter(c => !c.ok).map(c => c.error).join(' ')); return }
    if (reject) { setError('Tanda tangan dibatalkan. Tidak ada transaksi dikirim.'); return }
    lock.current = true
    setBusy(true)
    setStep(7)
    timer.current = setTimeout(() => {
      const failed = indicators.find(c => !c.ok)
      const resolved = resolveRow({ ...saved, ...draft, id: saved.id }, { ...data, wallet: wallet.address ?? data.wallet }, catalog, enrollments)
      const completed = failed && data.online ? { ...resolved, status: 'FAILED' as const, reason: failed.error } : resolved
      setResult(completed)
      update(state => ({ ...state, rows: state.rows.map(row => row.id === completed.id ? completed : row), logs: [`Transaksi ${completed.id}: ${completed.status} (simulasi)`, ...state.logs] }))
      lock.current = false; setBusy(false)
    }, 800)
  }
  function next() {
    setError('')
    if (step === 1 && (!indicators[0].ok || !indicators[1].ok)) return setError(indicators[0].error)
    if (step === 1 && used >= p.quota) return setError('Target penerima program sudah terpenuhi.')
    if (
      step === 2 &&
      (!r ||
        (!force &&
          !check(draft)
            .filter((_, i) => [2, 3, 5].includes(i))
            .every((c) => c.ok)))
    )
      return setError('Pilih penerima yang memenuhi syarat.')
    if (step === 3 && (!Number.isSafeInteger(amount) || amount <= 0))
      return setError('Nominal harus berupa bilangan bulat positif.')
    if (step === 4 && (!cid || !evidenceReady))
      return setError('Selesaikan pratinjau, persetujuan privasi, dan pemrosesan bukti simulasi terlebih dahulu.')
    if (step === 4) appendAudit({ action: 'Pernyataan privasi bukti disetujui', category: 'IPFS', dataId: saved?.id, cid, diff: { files: files.map(f => f.name), statements: privacy, previewConfirmed: approved }, source: 'Wizard penyaluran · simulasi' })
    if (step === 5 && !good && !force)
      return setError(TEST_MODE ? 'Pre-flight gagal. Perbaiki data atau aktifkan mode uji paksa.' : indicators.filter(c => !c.ok).map(c => c.error).join(' '))
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
                Target penerima dan pagu di bawah adalah data contoh.
              </div>
              <div className={s.grid}>
                {programs.map((x) => (
                  <button
                    key={x.code}
                    className={`${s.choice} ${program === x.code ? s.chosen : ''}`}
                    onClick={() => {
                      setProgram(x.code)
                      setPeriodId(x.startPeriod)
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
                  value={periodId}
                  onChange={(e) => {
                    setPeriodId(Number(e.target.value))
                    invalidate()
                  }}
                >
                  {programPeriods(p.startPeriod, p.endPeriod).map((x) => (
                    <option key={x} value={x}>{formatPeriod(x)}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <div className={s.banner}>
                <h2>Pilih warga penerima untuk {program}</h2>
                {TEST_MODE && <label>
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                  />
                  Mode uji paksa skenario penyelewengan
                </label>}
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
                    const c = check({ ...draft, recipient: x.id })
                    const eligible = c[2].ok && c[3].ok && c[5].ok
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
                              : c.filter((_, i) => [2, 3, 5].includes(i)).find(item => !item.ok)?.error}
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
                {TEST_MODE && <label>
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
                </label>}
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
                      multiple
                      disabled={busy}
                      onChange={e => { const selected = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(selected) }}
                    />
                  </label>
                  <p>1–3 berkas · Metadata EXIF/GPS dihapus otomatis sebelum diunggah.</p>
                  <small>Simulasi: JPG diproses ulang secara lokal. PDF hanya divalidasi dan dipratinjau; tidak ada berkas yang diunggah.</small>
                  {files.map((f, index) => <div className={s.row} key={f.url}><span>{f.name}</span><a href={f.url} target="_blank" rel="noreferrer" onClick={() => setFiles(current => current.map((item, i) => i === index ? { ...item, viewed: true } : item))}>Pratinjau berkas lokal</a><button disabled={busy} onClick={() => { setFiles(current => current.filter((_, i) => i !== index)); setPrivacy([false, false, false]); setApproved(false); invalidate() }}>Hapus {f.name}</button></div>)}
                  <p>{!files.length && 'Belum ada berkas'}</p>
                  <button disabled={busy || !!cid || !evidenceReady || !can('evidence:upload')} className={s.primary} onClick={stage}>
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
                  <div className={s.banner}>
                    <p>Bukti dipublikasikan di IPFS publik dan bersifat permanen.</p>
                    {privacyStatements.map((statement, i) => <label key={statement}><input type="checkbox" required disabled={busy} checked={privacy[i]} onChange={e => { setPrivacy(current => current.map((value, index) => index === i ? e.target.checked : value)); invalidate() }} />{statement}</label>)}
                    <p>Bukti yang disarankan: tanda terima dengan nama tersamar, atau foto penyerahan tanpa wajah yang jelas.</p>
                    <label><input type="checkbox" required disabled={busy || !files.length || !files.every(f => f.viewed)} checked={approved} onChange={e => { setApproved(e.target.checked); invalidate() }} />Saya sudah melihat berkas final dan menyetujuinya.</label>
                  </div>
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
                <h2>Pre-flight check · {indicators.filter((x) => x.ok).length}/7 lolos</h2>
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
                {TEST_MODE && !good && (
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
                <div className={s.banner}><p>Program: {p.name} ({program})</p><p>Periode: {formatPeriod(periodId)}</p><p>Penerima: {r?.name} · {r && masked(r.nik)}</p><p>Nominal: {money(amount)}</p></div>
                <p>
                  Simulasi persetujuan Wallet Aplikasi Kelurahan. Tidak membuka wallet asli atau
                  menarik gas.
                </p>
                <div className={s.card}>
                  <p>RPC 8545: {data.online ? 'ONLINE' : 'OFFLINE'}</p>
                  <p>Pre-flight: {indicators.filter((c) => c.ok).length}/7 lolos</p>
                </div>
              </div>
              <div className={s.dark}>
                <h2>Konfirmasi transaksi · SIMULASI</h2>
                <code>{data.wallet}</code>
                <hr />
                <code>{`recordDisbursement(\n recipientHash: ${r?.identityHash ?? 'TIDAK ADA'},\n programId: ${p.programId},\n periodId: ${periodId},\n amount: ${amount},\n ipfsCid: ${cid}\n)`}</code>
                <p>Estimasi gas: 142.800 · Biaya contoh: 0 ETH</p>
                <div className={s.actions}>
                  <p role="status">{wallet.error || access.reason}</p>
                  <button onClick={wallet.connect}>Periksa MetaMask aktual</button>
                  <button disabled={!access.allowed} onClick={() => sign(true)}>Tolak</button>
                  <button disabled={!access.allowed} title={access.reason} className={s.primary} onClick={() => sign()}>
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
                <div className={s.steps} aria-live="polite">{transactionSteps.map((label, i) => <div className={s.step} key={label}><span>{result?.status === 'FAILED' && i === 3 ? '×' : result?.status === 'SUCCESS' || i < 3 ? '✓' : i === 3 ? '◷' : '·'}</span>{label}</div>)}</div>
              </div>
              {result ? (
                <div className={`${s.card} ${s[result.status]}`} role="status">
                  <h2 aria-live="polite">{statusIcon[result.status]} {result.status}</h2>
                  <p>{result.status === 'FAILED' ? failureReason(result.reason) : result.reason}</p>
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
              <button disabled={busy || !operator || (step === 4 && (!evidenceReady || !cid))} className={s.primary} onClick={next}>
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
