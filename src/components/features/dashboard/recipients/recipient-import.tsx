'use client'

import { useState } from 'react'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { isValidNikFormat } from '@/components/features/dashboard/recipients/recipient-form'
import { formatApiError } from '@/lib/api/errors'
import { useCreateRecipientMutation } from '@/lib/api/hooks/recipients'
import s from '@/components/features/dashboard/recipients/recipients.module.css'

function maskNikLocal(nik: string): string {
  return nik.length === 16 ? `${nik.slice(0, 4)}${'•'.repeat(8)}${nik.slice(12)}` : 'Tidak valid'
}

const MAX_BYTES = 1024 * 1024
const MAX_ROWS = 500
const HEADER = 'nik,name,dusun,rt,rw,phone'

interface ParsedCsvRow {
  row: number
  nik: string
  name: string
  dusun: string
  rt: string
  rw: string
  phone?: string
  error?: string
}

function parseLine(line: string): string[] | null {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') {
        q = false
      } else {
        cur += c
      }
    } else if (c === '"') {
      q = true
    } else if (c === ',') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  return q ? null : [...out, cur.trim()]
}

export function RecipientImport({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported?: (count: number) => void
}) {
  const createMutation = useCreateRecipientMutation()
  const [rows, setRows] = useState<ParsedCsvRow[]>([])
  const [fileError, setFileError] = useState('')
  const [importing, setImporting] = useState(false)

  const valid = rows.filter((r) => !r.error)
  const invalid = rows.filter((r) => r.error)

  async function handleFile(f?: File) {
    setFileError('')
    setRows([])
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv') || (f.type && !['text/csv', 'text/plain'].includes(f.type))) {
      setFileError('Gunakan berkas CSV (.csv).')
      return
    }
    if (f.size > MAX_BYTES) {
      setFileError('Ukuran berkas melebihi 1 MB.')
      return
    }
    const lines = (await f.text())
      .replace(/^\ufeff/, '')
      .split(/\r?\n/)
      .filter((l) => l.trim())
    if (lines.length < 2) {
      setFileError('Berkas CSV kosong.')
      return
    }
    if (lines.length - 1 > MAX_ROWS) {
      setFileError(`Maksimal ${MAX_ROWS} baris per impor.`)
      return
    }
    if ((parseLine(lines[0]) || []).join(',').toLowerCase() !== HEADER) {
      setFileError(`Header wajib: ${HEADER}`)
      return
    }
    const seen = new Set<string>()
    setRows(
      lines.slice(1).map((line, i) => {
        const cols = parseLine(line)
        const [nik = '', name = '', dusun = '', rt = '', rw = '', phone = ''] = cols || []
        const errs: string[] = []
        if (!cols || cols.length !== 6) errs.push('Format kolom tidak valid')
        if (!isValidNikFormat(nik)) errs.push('NIK 16 digit tidak valid')
        else if (seen.has(nik)) errs.push('NIK duplikat di berkas')
        seen.add(nik)
        if (!name || name.length < 2) errs.push('Nama wajib diisi')
        if (!dusun) errs.push('Dusun wajib diisi')
        if (!/^\d{1,3}$/.test(rt) || !/^\d{1,3}$/.test(rw)) errs.push('RT/RW harus 1–3 digit angka')
        if (phone && !/^\+?[0-9 -]{7,20}$/.test(phone)) errs.push('Nomor telepon tidak valid')
        return {
          row: i + 2,
          nik,
          name,
          dusun,
          rt,
          rw,
          phone: phone || undefined,
          error: errs.join('; ') || undefined,
        }
      }),
    )
  }

  async function importValidRows() {
    if (!valid.length || importing) return
    setImporting(true)
    setFileError('')
    let importedCount = 0
    try {
      for (const r of valid) {
        await createMutation.mutateAsync({
          nik: r.nik,
          name: r.name,
          address: { dusun: r.dusun, rt: r.rt, rw: r.rw },
          ...(r.phone ? { phone: r.phone } : {}),
        })
        importedCount++
      }
      onImported?.(importedCount)
      onClose()
    } catch (err) {
      setFileError(formatApiError(err).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <RecipientDialog
      title="Impor Penerima dari CSV"
      subtitle="Maksimal 500 baris (1 MB). Baris valid disimpan sebagai DRAFT."
      onClose={() => {
        if (!importing) onClose()
      }}
    >
      <div className={s.formBody}>
        <label className={s.dropzone}>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={importing}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <strong>Pilih berkas CSV (.csv, maks. 1 MB)</strong>
          <small>Kolom wajib: {HEADER}</small>
        </label>
        {fileError && (
          <p role="alert" className={s.errorText}>
            {fileError}
          </p>
        )}
        {!!rows.length && (
          <>
            <p>
              <strong>{valid.length}</strong> baris valid siap diimpor sebagai DRAFT ·{' '}
              <strong>{invalid.length}</strong> baris ditolak.
            </p>
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Baris</th>
                    <th>Nama</th>
                    <th>NIK (Tersamar)</th>
                    <th>Domisili</th>
                    <th>Validasi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.name || '-'}</td>
                      <td>
                        <code>{maskNikLocal(r.nik)}</code>
                      </td>
                      <td>
                        {r.dusun || '-'} RT {r.rt}/RW {r.rw}
                      </td>
                      <td className={r.error ? s.errorText : s.success}>{r.error || 'Valid'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <footer className={s.dialogFooter}>
          <button type="button" disabled={importing} onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className={s.primary}
            disabled={!valid.length || importing}
            onClick={() => void importValidRows()}
          >
            {importing ? 'Mengimpor…' : `Impor ${valid.length} Baris Valid`}
          </button>
        </footer>
      </div>
    </RecipientDialog>
  )
}
