'use client'
import { useState } from 'react'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import {
  type Recipient,
  regions,
  jobs,
  programs,
  commitment,
  validateRecipient,
} from '@/mocks/recipient-data'
import s from '@/components/features/dashboard/recipients/recipients.module.css'
export function RecipientForm({
  existing,
  editing,
  onSave,
  onClose,
}: {
  existing: Recipient[]
  editing?: Recipient
  onSave: (r: Recipient) => void
  onClose: () => void
}) {
  const [data, setData] = useState<Recipient>(
    editing || {
      id: crypto.randomUUID(),
      nik: '',
      name: '',
      kk: '',
      region: '',
      address: '',
      job: '',
      income: 0,
      program: '',
      dependents: 0,
      status: 'DRAFT',
      deleted: false,
      received: 0,
    },
  )
  const [error, setError] = useState('')
  const update = (key: keyof Recipient, value: string | number) =>
    setData((d) => ({ ...d, [key]: value }))
  function sample() {
    const suffix = String(Date.now()).slice(-12)
    setData((d) => ({
      ...d,
      nik: '0000' + suffix,
      kk: '0001' + suffix,
      name: 'Penerima Contoh Baru',
      region: regions[0],
      address: 'Jl. Contoh No. 18',
      job: jobs[0],
      income: 650000,
      program: programs[0],
      dependents: 4,
    }))
  }
  return (
    <RecipientDialog
      title={editing ? 'Edit Data Penerima' : 'Tambah Data Penerima Baru (Status Awal: DRAFT)'}
      subtitle="Validasi NIK 16 digit, duplikasi data simulasi, dan kelengkapan data demografi."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const err = validateRecipient(data, existing)
          setError(err)
          if (!err) onSave(data)
        }}
      >
        <div className={s.formBody}>
          <div className={s.testTools}>
            <strong>Alat Bantu Uji Validasi Form</strong>
            <button type="button" onClick={sample}>
              Isi Contoh Valid
            </button>
            <button
              type="button"
              onClick={() => update('nik', existing.find((r) => r.id !== data.id)?.nik || '')}
            >
              Uji NIK Duplikat
            </button>
          </div>
          <label>
            NIK <span className={s.required}>*</span>
            <small>{data.nik.length} / 16 digit</small>
            <input
              required
              inputMode="numeric"
              maxLength={16}
              pattern="[0-9]{16}"
              value={data.nik}
              onChange={(e) => update('nik', e.target.value.replace(/\D/g, ''))}
              placeholder="Masukkan 16 digit NIK"
            />
          </label>
          <p className={s.helper}>
            Wajib 16 digit angka dan belum terdaftar. Gunakan identitas dummy saja.
          </p>
          <div className={s.formGrid}>
            <label>
              Nama Lengkap Sesuai KTP *
              <input
                required
                maxLength={100}
                value={data.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </label>
            <label>
              Nomor Kartu Keluarga (16 Digit) *
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{16}"
                maxLength={16}
                value={data.kk}
                onChange={(e) => update('kk', e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label>
              Wilayah RT / RW (Kel. Takkalasi) *
              <select
                required
                value={data.region}
                onChange={(e) => update('region', e.target.value)}
              >
                <option value="">Pilih RT / RW</option>
                {regions.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Detail Alamat Domisili *
              <input
                required
                maxLength={200}
                value={data.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </label>
            <label>
              Pekerjaan Utama *
              <select required value={data.job} onChange={(e) => update('job', e.target.value)}>
                <option value="">Pilih Pekerjaan</option>
                {jobs.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Estimasi Penghasilan (Rp/Bulan) *
              <input
                type="number"
                required
                min={0}
                value={data.income}
                onChange={(e) => update('income', e.target.valueAsNumber)}
              />
            </label>
            <label>
              Program Bantuan Sasaran *
              <select
                required
                value={data.program}
                onChange={(e) => update('program', e.target.value)}
              >
                <option value="">Pilih Program</option>
                {programs.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Jumlah Tanggungan Keluarga *
              <input
                type="number"
                required
                min={0}
                step={1}
                value={data.dependents}
                onChange={(e) => update('dependents', e.target.valueAsNumber)}
              />
            </label>
          </div>
          <div className={s.hashPreview}>
            <strong>Pratinjau hash identitas (keccak256) · Simulasi off-chain</strong>
            <code>
              {/^\d{16}$/.test(data.nik) ? commitment(data.nik) : 'Menunggu input NIK 16 digit...'}
            </code>
          </div>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
        </div>
        <footer>
          <button type="button" onClick={onClose}>
            Batal
          </button>
          <button className={s.primary} type="submit">
            Simpan Data Penerima (DRAFT)
          </button>
        </footer>
      </form>
    </RecipientDialog>
  )
}
