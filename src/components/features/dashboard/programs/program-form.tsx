'use client'
import { useState } from 'react'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { type Program, type AidType, programStatusLabel } from '@/mocks/program-data'
import { programIdFromCode, periodIdFromYYYYMM } from '@/lib/blockchain/chain-keys'
import s from '@/components/features/dashboard/programs/programs.module.css'
export function ProgramForm({
  initial,
  types,
  programs,
  onClose,
  onSave,
}: {
  initial?: Program
  types: AidType[]
  programs: Program[]
  onClose: () => void
  onSave: (p: Program) => void
}) {
  const [value, setValue] = useState<Program>(
    initial || {
      id: '',
      name: '',
      type: types[0].code,
      form: types[0].form,
      code: '',
      programId: programIdFromCode(''),
      fundSource: '', totalBudget: 0,
      startPeriod: 202601, endPeriod: 202603,
      unit: '',
      amount: 0,
      quota: 0,
      criteria: '',
      status: 'DRAFT',
      used: 0,
    },
  )
  const [error, setError] = useState('')
  const locked = !!initial && initial.status !== 'DRAFT'
  const monthValue = (n: number) => `${Math.floor(n / 100)}-${String(n % 100).padStart(2, '0')}`
  const update = (key: keyof Program, v: string | number) => setValue({ ...value, [key]: v })
  return (
    <RecipientDialog
      title={initial ? 'Edit Program Bantuan' : 'Tambah Program Bantuan Sosial Baru'}
      subtitle="Program baru disimpan sebagai DRAFT. Parameter inti dikunci setelah diaktifkan."
      onClose={onClose}
    >
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          try { periodIdFromYYYYMM(value.startPeriod); periodIdFromYYYYMM(value.endPeriod) } catch { setError('Periode harus bulan yang valid antara 2000 dan 2099.'); return }
          if (!/^[A-Z0-9-]{3,20}$/.test(value.code) || programs.some(p => p.id !== initial?.id && p.code === value.code)) { setError('Kode program harus unik, 3–20 huruf kapital, angka, atau tanda hubung.'); return }
          if (
            !value.name.trim() ||
            !value.fundSource.trim() || value.startPeriod > value.endPeriod ||
            !Number.isSafeInteger(value.totalBudget) || value.totalBudget <= 0 || value.totalBudget < value.used * value.amount || value.quota < value.used ||
            !value.criteria.trim() ||
            !Number.isSafeInteger(value.amount) ||
            value.amount <= 0 ||
            !Number.isSafeInteger(value.quota) ||
            value.quota <= 0 ||
            !Number.isSafeInteger(value.amount * value.quota)
          ) {
            setError(
              'Lengkapi semua data dan urutkan periode. Nominal, target penerima, dan pagu harus bilangan bulat positif; target dan pagu tidak boleh kurang dari realisasi.',
            )
            return
          }
          onSave({
            ...value,
            name: value.name.trim(),
            programId: programIdFromCode(value.code),
            ...(locked ? { code: initial.code, programId: initial.programId, amount: initial.amount, startPeriod: initial.startPeriod, endPeriod: initial.endPeriod } : {}),
            id: initial?.id || `PRG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          })
        }}
      >
        <label className={s.full}>
          Nama Program Bantuan *
          <input
            required
            maxLength={160}
            value={value.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Contoh: BLT Kelurahan Tahap IV"
          />
        </label>
        <label>
          Jenis Bantuan Sosial *
          <select
            value={value.type}
            onChange={(e) =>
              setValue({
                ...value,
                type: e.target.value,
                form: types.find((t) => t.code === e.target.value)!.form,
              })
            }
          >
            {types.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} — {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bentuk Bantuan *
          <select value={value.form} onChange={(e) => update('form', e.target.value)}>
            <option>Tunai</option>
            <option>Barang</option>
          </select>
        </label>
        <label>Kode program<input required pattern="[A-Z0-9-]{3,20}" maxLength={20} readOnly={locked} value={value.code} onChange={e => update('code', e.target.value.toUpperCase())} /></label>
        <label>Sumber dana<input required value={value.fundSource} onChange={e => update('fundSource', e.target.value)} /></label>
        <label>Periode mulai<input required type="month" min="2000-01" max="2099-12" readOnly={locked} value={monthValue(value.startPeriod)} onChange={e => update('startPeriod', Number(e.target.value.replace('-', '')))} /></label>
        <label>Periode akhir<input required type="month" min={monthValue(value.startPeriod)} max="2099-12" readOnly={locked} value={monthValue(value.endPeriod)} onChange={e => update('endPeriod', Number(e.target.value.replace('-', '')))} /></label>
        <label>
          Keterangan Satuan / Paket
          <input
            maxLength={120}
            value={value.unit}
            onChange={(e) => update('unit', e.target.value)}
            placeholder="Paket beras 10 kg"
          />
        </label>
        <label>
          Nominal / Nilai per Penerima (Rp) *
          <input
            required
            type="number"
            min="1"
            step="1"
            max="1000000000000"
            readOnly={locked}
            value={value.amount || ''}
            onChange={(e) => update('amount', Number(e.target.value))}
          />
          <small>Acuan otomatis pada wizard penyaluran.</small>
        </label>
        <label>
          Target penerima Penerima (KPM) *
          <input
            required
            type="number"
            min="1"
            step="1"
            max="10000000"
            value={value.quota || ''}
            onChange={(e) => update('quota', Number(e.target.value))}
          />
        </label>
        <label className={s.full}>Total Pagu Anggaran (Rp)<input required type="number" min="1" step="1" max={Number.MAX_SAFE_INTEGER} value={value.totalBudget || ''} onChange={e => update('totalBudget', Number(e.target.value))} /></label>
        <label className={s.full}>
          Kriteria Kelayakan Penerima *
          <textarea
            required
            rows={3}
            maxLength={1000}
            value={value.criteria}
            onChange={(e) => update('criteria', e.target.value)}
          />
        </label>
        <label>
          Status Awal Program
          <input readOnly value={programStatusLabel[value.status]} />
        </label>
        {error && (
          <p role="alert" className={s.full}>
            {error}
          </p>
        )}
        <footer className={s.full}>
          <button type="button" onClick={onClose}>
            Batal
          </button>
          <button className={s.primary}>Simpan Program Bantuan</button>
        </footer>
      </form>
    </RecipientDialog>
  )
}
