'use client'
import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Upload } from 'lucide-react'
import { RecipientDialog } from './recipient-dialog'
import {
  type Recipient,
  initialRecipients,
  validateRecipient,
  masked,
  money,
} from './recipient-data'
import s from './recipients.module.css'
export function RecipientImport({
  existing,
  onSave,
  onClose,
}: {
  existing: Recipient[]
  onSave: (rows: Recipient[]) => void
  onClose: () => void
}) {
  const [rows, setRows] = useState<Recipient[]>([])
  const [error, setError] = useState('')
  const checked = useMemo(() => {
    const seen: string[] = []
    return rows.map((r) => {
      const error = validateRecipient(r, existing, seen)
      seen.push(r.nik)
      return { row: r, error }
    })
  }, [rows, existing])
  const valid = checked.filter((x) => !x.error).map((x) => x.row)
  function sample() {
    const base = initialRecipients[7]
    setError('')
    setRows(
      ['0000999900000001', '0000999900000002', '123', existing[0].nik, '0000999900000001'].map(
        (nik, i) => ({
          ...base,
          id: crypto.randomUUID(),
          nik,
          name: `Penerima Impor Contoh ${i + 1}`,
          status: 'DRAFT',
          deleted: false,
        }),
      ),
    )
  }
  return (
    <RecipientDialog
      title="Impor CSV Data Penerima dengan Pratinjau Validasi"
      subtitle="Periksa NIK 16 digit, duplikasi data dan duplikasi internal CSV sebelum menyimpan sebagai DRAFT."
      onClose={onClose}
    >
      <div className={s.formBody}>
        <div className={s.uploadBox}>
          <div>
            <strong>Pilih Berkas CSV atau Gunakan Data Simulasi Uji</strong>
            <p>Format kolom (maksimal 1 MB / 1.000 baris)</p>
            <code>NIK,Nama,NoKK,Wilayah,Alamat,Pekerjaan,Penghasilan,Program,Tanggungan</code>
          </div>
          <div className={s.actions}>
            <label className={s.upload}>
              <Upload size={16} /> Unggah File .CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setRows([])
                  if (f.size > 1048576) {
                    setError('Ukuran file maksimal 1 MB')
                    return
                  }
                  const parsed = Papa.parse<Record<string, string>>(await f.text(), {
                    header: true,
                    skipEmptyLines: 'greedy',
                    transformHeader: (h) => h.trim().replace(/^\uFEFF/, ''),
                  })
                  if (
                    parsed.errors.length ||
                    ![
                      'NIK',
                      'Nama',
                      'NoKK',
                      'Wilayah',
                      'Alamat',
                      'Pekerjaan',
                      'Penghasilan',
                      'Program',
                      'Tanggungan',
                    ].every((k) => parsed.meta.fields?.includes(k)) ||
                    parsed.data.length > 1000
                  ) {
                    setError(
                      'CSV tidak valid. Periksa nama kolom, jumlah baris, dan format kutipan.',
                    )
                    return
                  }
                  setError('')
                  setRows(
                    parsed.data.map((r) => ({
                      id: crypto.randomUUID(),
                      nik: r.NIK.trim(),
                      name: r.Nama.trim(),
                      kk: r.NoKK.trim(),
                      region: r.Wilayah.trim(),
                      address: r.Alamat.trim(),
                      job: r.Pekerjaan.trim(),
                      income: r.Penghasilan.trim() ? Number(r.Penghasilan) : NaN,
                      program: r.Program.trim(),
                      dependents: r.Tanggungan.trim() ? Number(r.Tanggungan) : NaN,
                      status: 'DRAFT',
                      deleted: false,
                      received: 0,
                    })),
                  )
                }}
              />
            </label>
            <button className={s.primary} onClick={sample}>
              Muat 5 Baris Sampel CSV (Valid + Error + Duplikat)
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <div className={s.importStats}>
          <div>
            Total Baris Diperiksa<strong>{rows.length}</strong>
          </div>
          <div>
            Valid (Siap Simpan DRAFT)<strong>{valid.length}</strong>
          </div>
          <div>
            Ditolak (Format / Duplikat)<strong>{rows.length - valid.length}</strong>
          </div>
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                {[
                  '#',
                  'NIK (16 DIGIT)',
                  'NAMA LENGKAP',
                  'WILAYAH & PROGRAM',
                  'PENGHASILAN',
                  'HASIL VALIDASI PRA-IMPOR',
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checked.map(({ row: r, error }, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>
                    <code>{masked(r.nik)}</code>
                  </td>
                  <td>{r.name}</td>
                  <td>
                    {r.region}
                    <small>{r.program}</small>
                  </td>
                  <td>{Number.isFinite(r.income) ? money(r.income) : '—'}</td>
                  <td className={error ? s.error : s.success}>
                    {error || 'Valid — siap disimpan'}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className={s.empty}>
                    Muat sampel CSV atau unggah berkas untuk melihat pratinjau validasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <footer>
        <p>Hanya baris valid disimpan sementara sebagai DRAFT.</p>
        <button onClick={onClose}>Tutup</button>
        <button className={s.primary} disabled={!valid.length} onClick={() => onSave(valid)}>
          Simpan Baris Valid sebagai DRAFT ({valid.length})
        </button>
      </footer>
    </RecipientDialog>
  )
}
