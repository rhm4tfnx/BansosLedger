'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCw, Trash2 } from 'lucide-react'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import { StatusBadge } from '@/components/features/dashboard/disbursements/disbursement-detail'
import { WalletGate } from '@/components/shared/wallet-gate'
import { useRoleAccess } from '@/hooks/use-role-access'
import { formatApiError } from '@/lib/api/errors'
import {
  useConfirmDisbursementMutation,
  useCreateDisbursementMutation,
  useDeleteDisbursementMutation,
  useDisbursementPreflightMutation,
  useDisbursementTxIntentMutation,
  useRetryDisbursementMutation,
  useSubmitDisbursementTxMutation,
  useUploadEvidenceMutation,
} from '@/lib/api/hooks/disbursements'
import {
  useProgramEnrollmentsQuery,
  useProgramsQuery,
} from '@/lib/api/hooks/programs'
import { formatPeriodId } from '@/lib/format'
import { useWallet } from '@/lib/wallet'
import type {
  DisbursementPreflightViewModel,
  DisbursementViewModel,
  EvidenceViewModel,
} from '@/types'
import s from '@/components/features/dashboard/disbursements/disbursements.module.css'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const CONFIRM_POLL_MS = 3_000
const CONFIRM_TIMEOUT_MS = 180_000

const WIZARD_STEPS = [
  'Program & periode',
  'Pilih penerima',
  'Nominal bantuan',
  'Pre-flight check',
  'Simpan & bukti IPFS',
  'Tanda tangan',
  'Status transaksi',
] as const

const FR_DSB_07_STEPS = [
  'Data DRAFT tersimpan',
  'Bukti IPFS terunggah',
  'Pre-flight 7 aturan lolos',
  'Transaksi ditandatangani wallet',
  'Receipt blok Besu terverifikasi',
] as const

const PRIVACY_STATEMENTS = [
  'Berkas tidak memuat NIK, KK, nomor telepon, atau alamat lengkap yang terbaca.',
  'Wajah anak dan data sensitif lain tidak tampil.',
  'Penerima telah memberi persetujuan untuk difoto dan dipublikasikan.',
] as const

export function buildPeriodsInRange(startPeriod: number, endPeriod: number): number[] {
  const result: number[] = []
  let year = Math.floor(startPeriod / 100)
  let month = startPeriod % 100
  const endYear = Math.floor(endPeriod / 100)
  const endMonth = endPeriod % 100
  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push(year * 100 + month)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    if (result.length > 240) break
  }
  return result
}

export async function validateEvidenceMagicBytes(file: File): Promise<'image/jpeg' | 'application/pdf'> {
  if (!file.size || file.size > MAX_FILE_BYTES) {
    throw new Error('Setiap berkas wajib berukuran maksimal 5 MB.')
  }
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
  const isPdf =
    header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46
  if (!isJpeg && !isPdf) {
    throw new Error('Format berkas tidak valid. Hanya berkas JPEG atau PDF yang diizinkan.')
  }
  return isJpeg ? 'image/jpeg' : 'application/pdf'
}

interface LocalEvidenceCandidate {
  file: File
  previewUrl: string
  mime: 'image/jpeg' | 'application/pdf'
}

export interface DisbursementWizardProps {
  onClose: () => void
  initialDisbursement?: DisbursementViewModel
}

export function DisbursementWizard({ onClose, initialDisbursement }: DisbursementWizardProps) {
  const { can } = useRoleAccess()
  const wallet = useWallet()

  const initialStep = useMemo(() => {
    if (!initialDisbursement) return 1
    if (initialDisbursement.status === 'PENDING' || initialDisbursement.status === 'FAILED') {
      return 7
    }
    if (initialDisbursement.activeEvidenceCount > 0) {
      return 6
    }
    return 5
  }, [initialDisbursement])

  const [step, setStep] = useState<number>(initialStep)
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())
  const saveInFlightRef = useRef<boolean>(false)

  const programsQuery = useProgramsQuery({ page: 1, limit: 100, status: 'ACTIVE', sort: 'name' })
  const activePrograms = useMemo(() => programsQuery.data?.items ?? [], [programsQuery.data])

  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    initialDisbursement?.programId ?? '',
  )
  const effectiveProgramId = selectedProgramId || activePrograms[0]?.id || ''
  const selectedProgram = useMemo(
    () => activePrograms.find((p) => p.id === effectiveProgramId) ?? null,
    [activePrograms, effectiveProgramId],
  )

  const availablePeriods = useMemo(() => {
    if (!selectedProgram) return []
    return buildPeriodsInRange(selectedProgram.startPeriod, selectedProgram.endPeriod)
  }, [selectedProgram])

  const [selectedPeriod, setSelectedPeriod] = useState<number>(
    initialDisbursement?.periodId ?? 0,
  )
  const effectivePeriod =
    selectedPeriod && availablePeriods.includes(selectedPeriod)
      ? selectedPeriod
      : (availablePeriods[0] ?? initialDisbursement?.periodId ?? 202601)

  const [disbursedDate, setDisbursedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [note, setNote] = useState<string>(initialDisbursement?.note ?? '')

  // Step 2: Only REGISTERED_ONCHAIN enrollments
  const enrollmentsQuery = useProgramEnrollmentsQuery(effectiveProgramId, {
    page: 1,
    limit: 100,
    status: 'REGISTERED_ONCHAIN',
    enabled: Boolean(effectiveProgramId),
  })
  const registeredEnrollments = useMemo(
    () => enrollmentsQuery.data?.items ?? [],
    [enrollmentsQuery.data],
  )
  const [recipientQuery, setRecipientQuery] = useState<string>('')
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    initialDisbursement?.recipientId ?? '',
  )
  const selectedEnrollment = useMemo(
    () => registeredEnrollments.find((e) => e.recipientId === selectedRecipientId) ?? null,
    [registeredEnrollments, selectedRecipientId],
  )

  // Step 4: Preflight
  const preflightMutation = useDisbursementPreflightMutation()
  const [preflightResult, setPreflightResult] = useState<DisbursementPreflightViewModel | null>(
    null,
  )

  // Step 5: Save DRAFT + Evidence Upload
  const createMutation = useCreateDisbursementMutation()
  const uploadEvidenceMutation = useUploadEvidenceMutation()
  const deleteDraftMutation = useDeleteDisbursementMutation()

  const [disbursement, setDisbursement] = useState<DisbursementViewModel | null>(
    initialDisbursement ?? null,
  )
  const [localFiles, setLocalFiles] = useState<LocalEvidenceCandidate[]>([])
  const [uploadedEvidence, setUploadedEvidence] = useState<EvidenceViewModel[]>(
    initialDisbursement?.evidence.filter((e) => !e.isWithdrawn) ?? [],
  )
  const [privacyNoPii, setPrivacyNoPii] = useState(false)
  const [privacyNoSensitiveFaces, setPrivacyNoSensitiveFaces] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [previewConfirmed, setPreviewConfirmed] = useState(false)
  const [showCancelDraftReason, setShowCancelDraftReason] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  // Step 6: Sign
  const txIntentMutation = useDisbursementTxIntentMutation()
  const submitTxMutation = useSubmitDisbursementTxMutation()
  const [summaryConfirmed, setSummaryConfirmed] = useState(false)

  // Step 7: Confirm & Poll
  const confirmMutation = useConfirmDisbursementMutation()
  const retryMutation = useRetryDisbursementMutation()
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const [settledMessage, setSettledMessage] = useState<string | null>(null)
  const [uiError, setUiError] = useState<{ message: string; requestId?: string | null } | null>(
    null,
  )

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localFilesRef = useRef<LocalEvidenceCandidate[]>([])

  useEffect(() => {
    localFilesRef.current = localFiles
  }, [localFiles])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      localFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      wallet.clearPendingTx()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetDownstreamState() {
    setPreflightResult(null)
    setUiError(null)
  }

  async function runPreflight() {
    if (!effectiveProgramId || !selectedRecipientId || !effectivePeriod) return
    setUiError(null)
    try {
      const res = await preflightMutation.mutateAsync({
        programId: effectiveProgramId,
        recipientId: selectedRecipientId,
        period: effectivePeriod,
      })
      setPreflightResult(res)
    } catch (err) {
      const formatted = formatApiError(err)
      setUiError({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  async function handleSaveDraft() {
    if (saveInFlightRef.current || createMutation.isPending || disbursement) return
    if (!effectiveProgramId || !selectedRecipientId || !effectivePeriod) return
    saveInFlightRef.current = true
    setUiError(null)
    try {
      const created = await createMutation.mutateAsync({
        programId: effectiveProgramId,
        recipientId: selectedRecipientId,
        period: effectivePeriod,
        disbursedDate,
        ...(note.trim() ? { note: note.trim() } : {}),
        idempotencyKey: idempotencyKeyRef.current,
      })
      setDisbursement(created)
    } catch (err) {
      const formatted = formatApiError(err)
      setUiError({ message: formatted.message, requestId: formatted.requestId })
    } finally {
      saveInFlightRef.current = false
    }
  }

  async function handleAddFiles(selected: File[]) {
    if (!selected.length) return
    setUiError(null)
    if (localFiles.length + selected.length > 3) {
      setUiError({ message: 'Unggah 1–3 berkas bukti (JPEG atau PDF, maks. 5 MB per berkas).' })
      return
    }
    const additions: LocalEvidenceCandidate[] = []
    try {
      for (const f of selected) {
        const mime = await validateEvidenceMagicBytes(f)
        additions.push({
          file: f,
          previewUrl: URL.createObjectURL(f),
          mime,
        })
      }
      setLocalFiles((prev) => [...prev, ...additions])
      setPreviewConfirmed(false)
    } catch (err) {
      additions.forEach((a) => URL.revokeObjectURL(a.previewUrl))
      setUiError({
        message: err instanceof Error ? err.message : 'Berkas bukti tidak valid.',
      })
    }
  }

  function handleRemoveLocalFile(index: number) {
    setLocalFiles((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
    setPreviewConfirmed(false)
  }

  async function handleUploadEvidence() {
    if (!disbursement || !localFiles.length || uploadEvidenceMutation.isPending) return
    if (!privacyNoPii || !privacyNoSensitiveFaces || !privacyConsent || !previewConfirmed) {
      setUiError({
        message: 'Lengkapi semua pernyataan privasi dan konfirmasi pratinjau berkas.',
      })
      return
    }
    setUiError(null)
    try {
      const items = await uploadEvidenceMutation.mutateAsync({
        disbursementId: disbursement.id,
        files: localFiles.map((item) => item.file),
        privacyNoPii,
        privacyNoSensitiveFaces,
        privacyConsent,
        previewConfirmed,
      })
      setUploadedEvidence(items)
    } catch (err) {
      const formatted = formatApiError(err)
      setUiError({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  async function handleCancelDraft() {
    if (!disbursement || deleteDraftMutation.isPending) return
    if (cancelReason.trim().length < 3) {
      setUiError({ message: 'Alasan pembatalan draf wajib minimal 3 karakter.' })
      return
    }
    setUiError(null)
    try {
      await deleteDraftMutation.mutateAsync({
        id: disbursement.id,
        reason: cancelReason.trim(),
      })
      onClose()
    } catch (err) {
      const formatted = formatApiError(err)
      setUiError({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  async function pollDisbursementOnce(disbursementId: string, txHash?: string): Promise<boolean> {
    const res = await confirmMutation.mutateAsync({
      disbursementId,
      ...(txHash ? { txHash } : {}),
    })
    if (res.kind === 'SETTLED') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      wallet.clearPendingTx()
      setDisbursement(res.disbursement)
      if (res.message) setSettledMessage(res.message)
      return true
    }
    return false
  }

  function startConfirmPolling(disbursementId: string, txHash?: string) {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    setPollTimedOut(false)

    pollIntervalRef.current = setInterval(() => {
      void pollDisbursementOnce(disbursementId, txHash).catch((err) => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
        const formatted = formatApiError(err)
        setUiError({ message: formatted.message, requestId: formatted.requestId })
      })
    }, CONFIRM_POLL_MS)

    pollTimeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      setPollTimedOut(true)
    }, CONFIRM_TIMEOUT_MS)
  }

  useEffect(() => {
    if (step === 7 && disbursement && disbursement.status === 'PENDING') {
      startConfirmPolling(disbursement.id, disbursement.chain?.txHash ?? undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, disbursement?.id, disbursement?.status])

  async function handleSignAndSubmit() {
    if (!disbursement || !summaryConfirmed) return
    setUiError(null)
    try {
      const intent = await txIntentMutation.mutateAsync(disbursement.id)
      const txHash = await wallet.sendIntent({
        to: intent.to,
        data: intent.data,
        label: `Penyaluran ${disbursement.refIdShort}`,
      })
      const submitted = await submitTxMutation.mutateAsync({
        disbursementId: disbursement.id,
        txHash,
      })
      setDisbursement(submitted)
      setStep(7)
      const settledImmediately = await pollDisbursementOnce(submitted.id, txHash)
      if (!settledImmediately) {
        startConfirmPolling(submitted.id, txHash)
      }
    } catch (err) {
      const formatted = formatApiError(err)
      setUiError({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  async function handleManualConfirmCheck() {
    if (!disbursement) return
    setUiError(null)
    setPollTimedOut(false)
    try {
      const settled = await pollDisbursementOnce(
        disbursement.id,
        disbursement.chain?.txHash ?? undefined,
      )
      if (!settled) {
        startConfirmPolling(disbursement.id, disbursement.chain?.txHash ?? undefined)
      }
    } catch (err) {
      const formatted = formatApiError(err)
      setUiError({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  async function handleRetryFailed() {
    if (!disbursement || retryMutation.isPending) return
    setUiError(null)
    try {
      const resetRecord = await retryMutation.mutateAsync(disbursement.id)
      setDisbursement(resetRecord)
      setSettledMessage(null)
      setSummaryConfirmed(false)
      setStep(6)
    } catch (err) {
      const formatted = formatApiError(err)
      setUiError({ message: formatted.message, requestId: formatted.requestId })
    }
  }

  function handleNextStep() {
    setUiError(null)
    if (step === 1) {
      if (!selectedProgram || !effectivePeriod) {
        setUiError({ message: 'Pilih program aktif dan periode penyaluran terlebih dahulu.' })
        return
      }
      setStep(2)
      return
    }
    if (step === 2) {
      if (!selectedRecipientId) {
        setUiError({
          message: 'Pilih penerima yang telah terdaftar on-chain (REGISTERED_ONCHAIN).',
        })
        return
      }
      setStep(3)
      return
    }
    if (step === 3) {
      setStep(4)
      void runPreflight()
      return
    }
    if (step === 4) {
      if (!preflightResult?.ok) {
        setUiError({
          message: 'Semua 7 aturan pre-flight harus lolos sebelum melanjutkan.',
        })
        return
      }
      setStep(5)
      return
    }
    if (step === 5) {
      if (!disbursement || uploadedEvidence.length === 0) {
        setUiError({
          message: 'Simpan data penyaluran dan unggah minimal 1 bukti IPFS terlebih dahulu.',
        })
        return
      }
      setStep(6)
    }
  }

  const isBusy =
    preflightMutation.isPending ||
    createMutation.isPending ||
    uploadEvidenceMutation.isPending ||
    txIntentMutation.isPending ||
    submitTxMutation.isPending ||
    retryMutation.isPending ||
    deleteDraftMutation.isPending

  const displayProgramCode = disbursement?.programCode ?? selectedProgram?.code ?? '-'
  const displayProgramName = disbursement?.programName ?? selectedProgram?.name ?? '-'
  const displayPeriodLabel =
    disbursement?.periodLabel ?? formatPeriodId(effectivePeriod)
  const displayRecipientName =
    disbursement?.recipientName ?? selectedEnrollment?.recipientName ?? '-'
  const displayRecipientNikMasked =
    disbursement?.recipientNikMasked ?? selectedEnrollment?.recipientNikMasked ?? '-'
  const displayAmountFormatted =
    disbursement?.amountFormatted ?? selectedProgram?.amountPerRecipientFormatted ?? 'Rp 0'

  return (
    <RecipientDialog
      title="Catat Penyaluran Bantuan Sosial"
      subtitle="Alur terverifikasi: Pre-flight 7 aturan → Simpan DRAFT → Bukti IPFS → Tanda tangan Wallet → Verifikasi Blok Besu."
      onClose={() => {
        if (!isBusy) onClose()
      }}
    >
      <div className={`${s.page} ${s.body}`}>
        <div className={s.steps}>
          {WIZARD_STEPS.map((label, i) => (
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
                <h2>1. Pilih Program Aktif &amp; Periode Penyaluran</h2>
                <p>Nominal bantuan ditentukan secara otomatis oleh program di server.</p>
              </div>
              {programsQuery.isPending ? (
                <p role="status">Memuat daftar program aktif…</p>
              ) : !activePrograms.length ? (
                <p role="alert">Belum ada program berstatus ACTIVE.</p>
              ) : (
                <div className={s.grid}>
                  {activePrograms.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={`${s.choice} ${effectiveProgramId === p.id ? s.chosen : ''}`}
                      onClick={() => {
                        setSelectedProgramId(p.id)
                        setSelectedPeriod(p.startPeriod)
                        setSelectedRecipientId('')
                        resetDownstreamState()
                      }}
                    >
                      <div className={s.row}>
                        <b className={s.accent}>{p.code}</b>
                        <b>{p.amountPerRecipientFormatted} / KPM</b>
                      </div>
                      <strong>{p.name}</strong>
                      <div className={s.row}>
                        <small>Terdaftar: {p.enrolledCount} KPM</small>
                        <small>Tersalurkan: {p.disbursedCount} KPM</small>
                      </div>
                      <small>Pagu: {p.totalBudgetFormatted}</small>
                    </button>
                  ))}
                </div>
              )}
              <div className={s.grid}>
                <label>
                  Periode Penyaluran
                  <select
                    aria-label="Periode Penyaluran"
                    value={effectivePeriod}
                    onChange={(e) => {
                      setSelectedPeriod(Number(e.target.value))
                      resetDownstreamState()
                    }}
                  >
                    {availablePeriods.map((periodVal) => (
                      <option key={periodVal} value={periodVal}>
                        {formatPeriodId(periodVal)} ({periodVal})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tanggal Penyerahan
                  <input
                    aria-label="Tanggal Penyerahan"
                    type="date"
                    value={disbursedDate}
                    onChange={(e) => setDisbursedDate(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Catatan Penyaluran (Opsional)
                <input
                  aria-label="Catatan Penyaluran"
                  maxLength={500}
                  placeholder="Contoh: Penyaluran tahap berjalan di balai kelurahan"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <div className={s.banner}>
                <h2>2. Pilih Penerima Terdaftar On-Chain ({selectedProgram?.code})</h2>
                <p>
                  Hanya menampilkan penerima dengan status enrollment{' '}
                  <code>REGISTERED_ONCHAIN</code>.
                </p>
              </div>
              <input
                aria-label="Cari penerima terdaftar"
                placeholder="Cari nama penerima…"
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
              />
              {enrollmentsQuery.isPending ? (
                <p role="status">Memuat penerima terdaftar on-chain…</p>
              ) : !registeredEnrollments.length ? (
                <p role="alert">
                  Belum ada penerima berstatus REGISTERED_ONCHAIN pada program ini.
                </p>
              ) : (
                <div className={s.list}>
                  {registeredEnrollments
                    .filter((item) =>
                      `${item.recipientName} ${item.recipientNikMasked}`
                        .toLowerCase()
                        .includes(recipientQuery.toLowerCase()),
                    )
                    .map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`${s.choice} ${selectedRecipientId === item.recipientId ? s.chosen : ''}`}
                        onClick={() => {
                          setSelectedRecipientId(item.recipientId)
                          resetDownstreamState()
                        }}
                      >
                        <div className={s.row}>
                          <b>{item.recipientName}</b>
                          <span className={`${s.badge} ${s.SUCCESS}`}>{item.statusLabel}</span>
                        </div>
                        <small>NIK: {item.recipientNikMasked}</small>
                      </button>
                    ))}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className={s.banner}>
                <h2>3. Nominal Bantuan Terkunci Sesuai Program</h2>
                <p>
                  Nominal disalin langsung oleh server dari konfigurasi program dan tidak dapat
                  diubah oleh klien.
                </p>
              </div>
              <div className={s.grid}>
                <div className={s.card}>
                  <label>
                    Nominal Bantuan (Read-Only)
                    <input
                      aria-label="Nominal Bantuan"
                      readOnly
                      value={selectedProgram?.amountPerRecipientFormatted ?? 'Rp 0'}
                    />
                  </label>
                  <p>
                    Program: <strong>{selectedProgram?.code}</strong> — {selectedProgram?.name}
                  </p>
                  <p>
                    Penerima: <strong>{selectedEnrollment?.recipientName}</strong> (
                    <code>{selectedEnrollment?.recipientNikMasked}</code>)
                  </p>
                  <p>
                    Periode: <strong>{formatPeriodId(effectivePeriod)}</strong>
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className={s.banner}>
                <div className={s.row}>
                  <div>
                    <h2>4. Pemeriksaan Pre-Flight Server (7 Aturan)</h2>
                    <p>
                      Seluruh 7 pemeriksaan wajib lolos sebelum penyaluran dapat disimpan dan
                      ditandatangani.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={preflightMutation.isPending}
                    onClick={() => void runPreflight()}
                  >
                    <RotateCw size={14} /> Periksa Ulang Pre-Flight
                  </button>
                </div>
              </div>
              {preflightMutation.isPending ? (
                <p role="status" aria-live="polite">
                  Menjalankan pemeriksaan pre-flight…
                </p>
              ) : preflightResult ? (
                <div className={s.card}>
                  <h3>
                    Hasil Pre-Flight:{' '}
                    {preflightResult.checks.filter((c) => c.ok).length}/
                    {preflightResult.checks.length} aturan lolos
                  </h3>
                  <div className={s.grid}>
                    {preflightResult.checks.map((check) => (
                      <div
                        key={check.key}
                        className={`${s.check} ${check.ok ? s.SUCCESS : s.FAILED}`}
                      >
                        <b>
                          {check.ok ? '✓' : '×'} {check.label}
                        </b>
                        <p>{check.ok ? 'Memenuhi syarat' : check.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}

          {step === 5 && (
            <>
              <div className={s.banner}>
                <h2>5. Simpan Data DRAFT &amp; Unggah Bukti Penyerahan (IPFS)</h2>
                <p>
                  Langkah 5a menyimpan rekaman DRAFT dengan <code>Idempotency-Key</code>. Langkah 5b
                  mengunggah 1–3 berkas bukti (JPEG/PDF ≤ 5 MB) ke IPFS.
                </p>
              </div>
              <div className={s.grid}>
                <div className={s.card}>
                  <h3>5a. Rekaman DRAFT MongoDB</h3>
                  {disbursement ? (
                    <>
                      <p>
                        ID Referensi: <code>{disbursement.refIdShort}</code> · Status:{' '}
                        <strong>{disbursement.status}</strong>
                      </p>
                      <small>Idempotency-Key: {idempotencyKeyRef.current}</small>
                      {uploadedEvidence.length === 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowCancelDraftReason((v) => !v)}
                          >
                            <Trash2 size={13} /> Batalkan / Hapus Draf
                          </button>
                          {showCancelDraftReason && (
                            <div>
                              <input
                                aria-label="Alasan pembatalan draf"
                                placeholder="Alasan pembatalan draf (min. 3 karakter)"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                              />
                              <button
                                type="button"
                                disabled={deleteDraftMutation.isPending}
                                onClick={() => void handleCancelDraft()}
                              >
                                Konfirmasi Hapus Draf
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p>Simpan data penyaluran sebagai DRAFT sebelum mengunggah bukti IPFS.</p>
                      <button
                        type="button"
                        className={s.primary}
                        disabled={createMutation.isPending || !can('disbursement:create')}
                        onClick={() => void handleSaveDraft()}
                      >
                        {createMutation.isPending ? 'Menyimpan DRAFT…' : 'Simpan Data DRAFT'}
                      </button>
                    </>
                  )}
                </div>

                <div className={s.card}>
                  <h3>5b. Bukti Penyerahan IPFS (1–3 Berkas JPEG/PDF ≤ 5 MB)</h3>
                  {uploadedEvidence.length > 0 ? (
                    <div role="status" aria-live="polite">
                      <p>
                        <strong>✓ {uploadedEvidence.length} berkas bukti berhasil diunggah</strong>
                      </p>
                      {uploadedEvidence.map((item) => (
                        <div key={item.cid} className={s.row}>
                          <span>{item.name}</span>
                          <code>{item.cidShort}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <label>
                        Pilih Berkas Bukti (JPEG / PDF, maks. 5 MB)
                        <input
                          aria-label="Pilih Berkas Bukti"
                          type="file"
                          accept="image/jpeg,application/pdf"
                          multiple
                          disabled={!disbursement || uploadEvidenceMutation.isPending}
                          onChange={(e) => {
                            const selected = Array.from(e.target.files ?? [])
                            e.target.value = ''
                            void handleAddFiles(selected)
                          }}
                        />
                      </label>
                      {localFiles.map((item, idx) => (
                        <div key={item.previewUrl} className={s.row}>
                          <span>
                            {item.file.name} ({Math.round(item.file.size / 1024)} KB)
                          </span>
                          <a href={item.previewUrl} target="_blank" rel="noreferrer">
                            Pratinjau
                          </a>
                          <button
                            type="button"
                            disabled={uploadEvidenceMutation.isPending}
                            onClick={() => handleRemoveLocalFile(idx)}
                          >
                            Hapus {item.file.name}
                          </button>
                        </div>
                      ))}
                      <div className={s.banner}>
                        <label>
                          <input
                            type="checkbox"
                            checked={privacyNoPii}
                            onChange={(e) => setPrivacyNoPii(e.target.checked)}
                          />{' '}
                          {PRIVACY_STATEMENTS[0]}
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={privacyNoSensitiveFaces}
                            onChange={(e) => setPrivacyNoSensitiveFaces(e.target.checked)}
                          />{' '}
                          {PRIVACY_STATEMENTS[1]}
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={privacyConsent}
                            onChange={(e) => setPrivacyConsent(e.target.checked)}
                          />{' '}
                          {PRIVACY_STATEMENTS[2]}
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={previewConfirmed}
                            disabled={localFiles.length === 0}
                            onChange={(e) => setPreviewConfirmed(e.target.checked)}
                          />{' '}
                          Saya sudah memeriksa pratinjau berkas bukti dan menyetujui pengunggahan ke
                          IPFS.
                        </label>
                      </div>
                      <button
                        type="button"
                        className={s.primary}
                        disabled={
                          !disbursement ||
                          localFiles.length === 0 ||
                          !privacyNoPii ||
                          !privacyNoSensitiveFaces ||
                          !privacyConsent ||
                          !previewConfirmed ||
                          uploadEvidenceMutation.isPending
                        }
                        onClick={() => void handleUploadEvidence()}
                      >
                        {uploadEvidenceMutation.isPending
                          ? 'Mengunggah ke IPFS…'
                          : 'Unggah Bukti ke IPFS'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 6 && (
            <div className={s.grid}>
              <div className={s.card}>
                <h2>6. Konfirmasi Ringkasan &amp; Tanda Tangan Wallet</h2>
                <div className={s.banner}>
                  <p>
                    Program: <strong>{displayProgramName}</strong> ({displayProgramCode})
                  </p>
                  <p>
                    Periode: <strong>{displayPeriodLabel}</strong>
                  </p>
                  <p>
                    Penerima: <strong>{displayRecipientName}</strong> · NIK{' '}
                    <code>{displayRecipientNikMasked}</code>
                  </p>
                  <p>
                    Nominal: <strong>{displayAmountFormatted}</strong>
                  </p>
                  <p>
                    CID Bukti IPFS:{' '}
                    <code>{uploadedEvidence[0]?.cidShort ?? disbursement?.evidence[0]?.cidShort ?? '-'}</code>
                  </p>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={summaryConfirmed}
                    onChange={(e) => setSummaryConfirmed(e.target.checked)}
                  />{' '}
                  Saya telah memeriksa ringkasan program, periode, penerima tersamar, dan nominal di
                  atas sebelum menandatangani transaksi on-chain.
                </label>
              </div>
              <div className={s.card}>
                <h3>Otorisasi Wallet Kelurahan</h3>
                <WalletGate>
                  <button
                    type="button"
                    className={s.primary}
                    disabled={
                      !summaryConfirmed ||
                      txIntentMutation.isPending ||
                      submitTxMutation.isPending
                    }
                    onClick={() => void handleSignAndSubmit()}
                  >
                    {txIntentMutation.isPending || submitTxMutation.isPending
                      ? 'Menyiapkan & Mengirim Transaksi…'
                      : 'Tanda Tangani & Kirim ke Blockchain'}
                  </button>
                </WalletGate>
              </div>
            </div>
          )}

          {step === 7 && (
            <>
              <div className={s.dark}>
                <h3>Progres Siklus Penyaluran (5 Tahap FR-DSB-07)</h3>
                <div className={s.steps} aria-live="polite">
                  {FR_DSB_07_STEPS.map((label, i) => {
                    const isFailed = disbursement?.status === 'FAILED' && i === 4
                    const isDone =
                      disbursement?.status === 'SUCCESS' ||
                      i < 4
                    return (
                      <div key={label} className={s.step}>
                        <span>{isFailed ? '×' : isDone ? '✓' : '◷'}</span>
                        {label}
                      </div>
                    )
                  })}
                </div>
              </div>

              {disbursement && (
                <div className={`${s.card} ${s[disbursement.status] ?? ''}`} role="status" aria-live="polite">
                  <div className={s.row}>
                    <StatusBadge status={disbursement.status} />
                    <b>{disbursement.refIdShort}</b>
                  </div>
                  {disbursement.status === 'PENDING' && !pollTimedOut && (
                    <p>
                      Menunggu verifikasi receipt blok Hyperledger Besu oleh server (diperiksa
                      otomatis setiap 3 detik)…
                    </p>
                  )}
                  {disbursement.status === 'PENDING' && pollTimedOut && (
                    <p role="alert">
                      Transaksi masih menunggu konfirmasi blok setelah 3 menit. Silakan periksa
                      ulang secara manual.
                    </p>
                  )}
                  {disbursement.status === 'SUCCESS' && (
                    <p>
                      ✓ Penyaluran telah terkonfirmasi di blok #{disbursement.chain?.blockNumber ?? '—'} dan diverifikasi oleh server.
                    </p>
                  )}
                  {disbursement.status === 'FAILED' && (
                    <p role="alert">
                      {settledMessage ??
                        disbursement.lastErrorMessage ??
                        'Transaksi gagal diverifikasi pada blok.'}
                    </p>
                  )}
                  {disbursement.chain?.txHash && (
                    <p>
                      TxHash:{' '}
                      <HashLink
                        hash={disbursement.chain.txHash}
                        short={disbursement.chain.txHashShort}
                      />
                    </p>
                  )}
                  <div className={s.actions}>
                    {disbursement.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={confirmMutation.isPending}
                        onClick={() => void handleManualConfirmCheck()}
                      >
                        <RotateCw size={14} /> Periksa ulang
                      </button>
                    )}
                    {disbursement.status === 'FAILED' && can('transaction:sign') && (
                      <button
                        type="button"
                        className={s.primary}
                        disabled={retryMutation.isPending}
                        onClick={() => void handleRetryFailed()}
                      >
                        {retryMutation.isPending ? 'Menyiapkan ulang…' : 'Coba lagi'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {uiError && (
            <div role="alert" className={s.FAILED}>
              <p>{uiError.message}</p>
              {uiError.requestId && <small>ID Permintaan: {uiError.requestId}</small>}
            </div>
          )}
        </div>

        <div className={s.footer}>
          <small>
            Langkah {step} dari {WIZARD_STEPS.length} · {WIZARD_STEPS[step - 1]}
          </small>
          <div className={s.actions}>
            {step < 7 && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => (step === 1 || initialDisbursement ? onClose() : setStep(step - 1))}
              >
                {step === 1 || initialDisbursement ? 'Batal' : 'Kembali'}
              </button>
            )}
            {step < 6 && (
              <button
                type="button"
                className={s.primary}
                disabled={
                  isBusy ||
                  (step === 4 && !preflightResult?.ok) ||
                  (step === 5 && (!disbursement || uploadedEvidence.length === 0))
                }
                onClick={handleNextStep}
              >
                Lanjut ke langkah {step + 1}
              </button>
            )}
            {step === 7 && (
              <button type="button" className={s.primary} onClick={onClose}>
                Selesai &amp; lihat tabel
              </button>
            )}
          </div>
        </div>
      </div>
    </RecipientDialog>
  )
}
