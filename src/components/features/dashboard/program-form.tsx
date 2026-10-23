'use client'
import { useState } from 'react'
import { RecipientDialog } from './recipient-dialog'
import { type Program, type AidType, rupiah } from './program-data'
import s from './programs.module.css'
export function ProgramForm({
  initial,
  types,
  onClose,
  onSave,
}: {
  initial?: Program
  types: AidType[]
  onClose: () => void
  onSave: (p: Program) => void
}) {
  const [value, setValue] = useState<Program>(
    initial || {
      id: '',
      name: '',
      type: types[0].code,
      form: types[0].form,
      period: '',
      unit: '',
      amount: 0,
      quota: 0,
      criteria: '',
      status: 'DRAFT',
      used: 0,
    },
  )
  const [error, setError] = useState('')
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
          if (
            !value.name.trim() ||
            !value.period.trim() ||
            !value.criteria.trim() ||
            !Number.isSafeInteger(value.amount) ||
            value.amount <= 0 ||
            !Number.isSafeInteger(value.quota) ||
            value.quota <= 0 ||
            !Number.isSafeInteger(value.amount * value.quota)
          ) {
            setError(
              'Lengkapi semua data. Nominal dan kuota harus bilangan bulat positif dengan total pagu yang valid.',
            )
            return
          }
          onSave({
            ...value,
            name: value.name.trim(),
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
        <label>
          Periode Penyaluran *
          <input
            required
            maxLength={100}
            value={value.period}
            onChange={(e) => update('period', e.target.value)}
            placeholder="Oktober – Desember 2026"
          />
        </label>
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
            value={value.amount || ''}
            onChange={(e) => update('amount', Number(e.target.value))}
          />
          <small>Acuan otomatis pada wizard penyaluran.</small>
        </label>
        <label>
          Kuota Penerima (KPM) *
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
        <div className={`${s.inset} ${s.full}`}>
          <span>Total Pagu Anggaran (Otomatis)</span>
          <strong>{rupiah(value.amount * value.quota)}</strong>
          <small>Nominal per penerima × kuota KPM.</small>
        </div>
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
          <input readOnly value="DRAFT (Editable & Soft Delete)" />
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
