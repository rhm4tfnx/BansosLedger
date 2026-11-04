'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { formatApiError } from '@/lib/api/errors'
import {
  useCreateProgramMutation,
  useUpdateProgramMutation,
} from '@/lib/api/hooks/programs'
import type { ProgramViewModel } from '@/types'
import s from '@/components/features/dashboard/programs/programs.module.css'

function isValidYYYYMM(value: number): boolean {
  if (!Number.isInteger(value) || value < 200001 || value > 209912) return false
  const month = value % 100
  return month >= 1 && month <= 12
}

function toMonthInputValue(yyyymm: number): string {
  const year = Math.floor(yyyymm / 100)
  const month = String(yyyymm % 100).padStart(2, '0')
  return `${year}-${month}`
}

function parseMonthInputValue(value: string): number {
  const cleaned = value.trim().replace('-', '')
  return /^\d{6}$/.test(cleaned) ? Number(cleaned) : 0
}

const programFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z0-9-]{3,20}$/,
        'Kode program wajib 3–20 karakter huruf kapital, angka, atau tanda hubung.',
      ),
    name: z
      .string()
      .trim()
      .min(3, 'Nama program minimal 3 karakter.')
      .max(160, 'Nama program maksimal 160 karakter.'),
    description: z.string().trim().max(1000, 'Deskripsi maksimal 1000 karakter.'),
    fundSource: z
      .string()
      .trim()
      .min(2, 'Sumber dana minimal 2 karakter.')
      .max(120, 'Sumber dana maksimal 120 karakter.'),
    kind: z.enum(['TUNAI', 'BARANG']),
    amountPerRecipient: z
      .number()
      .int('Nominal bantuan harus bilangan bulat.')
      .positive('Nominal bantuan harus lebih dari 0.'),
    totalBudget: z
      .number()
      .int('Pagu anggaran harus bilangan bulat.')
      .positive('Pagu anggaran harus lebih dari 0.'),
    startPeriodInput: z
      .string()
      .trim()
      .refine((v) => isValidYYYYMM(parseMonthInputValue(v)), {
        message: 'Periode mulai harus bulan yang valid (YYYY-MM).',
      }),
    endPeriodInput: z
      .string()
      .trim()
      .refine((v) => isValidYYYYMM(parseMonthInputValue(v)), {
        message: 'Periode akhir harus bulan yang valid (YYYY-MM).',
      }),
  })
  .refine(
    (data) =>
      parseMonthInputValue(data.startPeriodInput) <= parseMonthInputValue(data.endPeriodInput),
    {
      message: 'Periode akhir tidak boleh sebelum periode mulai.',
      path: ['endPeriodInput'],
    },
  )

type ProgramFormValues = z.infer<typeof programFormSchema>

export interface ProgramFormProps {
  initial?: ProgramViewModel
  onClose: () => void
  onSaved?: (program: ProgramViewModel) => void
}

export function ProgramForm({ initial, onClose, onSaved }: ProgramFormProps) {
  const isLockedEconomic = Boolean(initial && initial.status !== 'DRAFT')
  const createMutation = useCreateProgramMutation()
  const updateMutation = useUpdateProgramMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      code: initial?.code ?? '',
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      fundSource: initial?.fundSource ?? 'APBD Kabupaten Barru',
      kind: initial?.kind ?? 'TUNAI',
      amountPerRecipient: initial?.amountPerRecipient ?? 600_000,
      totalBudget: initial?.totalBudget ?? 30_000_000,
      startPeriodInput: toMonthInputValue(initial?.startPeriod ?? 202601),
      endPeriodInput: toMonthInputValue(initial?.endPeriod ?? 202603),
    },
  })

  const activeError = createMutation.error ?? updateMutation.error
  const formattedError = activeError ? formatApiError(activeError) : null
  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    const startPeriod = parseMonthInputValue(values.startPeriodInput)
    const endPeriod = parseMonthInputValue(values.endPeriodInput)

    if (initial) {
      const updated = await updateMutation.mutateAsync({
        id: initial.id,
        patch: isLockedEconomic
          ? {
              name: values.name.trim(),
              description: values.description.trim(),
              fundSource: values.fundSource.trim(),
            }
          : {
              code: values.code.trim().toUpperCase(),
              name: values.name.trim(),
              description: values.description.trim(),
              fundSource: values.fundSource.trim(),
              kind: values.kind,
              amountPerRecipient: values.amountPerRecipient,
              totalBudget: values.totalBudget,
              startPeriod,
              endPeriod,
            },
      })
      onSaved?.(updated)
      onClose()
      return
    }

    const created = await createMutation.mutateAsync({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim(),
      fundSource: values.fundSource.trim(),
      kind: values.kind,
      amountPerRecipient: values.amountPerRecipient,
      totalBudget: values.totalBudget,
      startPeriod,
      endPeriod,
    })
    onSaved?.(created)
    onClose()
  })

  return (
    <RecipientDialog
      title={initial ? 'Edit Program Bantuan' : 'Tambah Program Bantuan Sosial Baru'}
      subtitle={
        isLockedEconomic
          ? 'Program sudah ACTIVE. Parameter ekonomi (kode, bentuk, nominal, pagu, dan periode) dikunci read-only.'
          : 'Program baru disimpan sebagai DRAFT. Parameter ekonomi dikunci setelah diaktifkan.'
      }
      onClose={() => {
        if (!isPending) onClose()
      }}
    >
      <form className={s.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        <label className={s.full}>
          Nama Program Bantuan *
          <input
            aria-label="Nama Program Bantuan"
            maxLength={160}
            disabled={isPending}
            placeholder="Contoh: BLT Kelurahan Tahap IV"
            {...register('name')}
          />
          {errors.name && <small role="alert">{errors.name.message}</small>}
        </label>
        <label>
          Kode Program *
          <input
            aria-label="Kode Program"
            maxLength={20}
            readOnly={isLockedEconomic}
            disabled={isPending}
            placeholder="BLT-2026"
            {...register('code')}
          />
          {errors.code && <small role="alert">{errors.code.message}</small>}
        </label>
        <label>
          Bentuk Bantuan *
          <select
            aria-label="Bentuk Bantuan"
            disabled={isPending || isLockedEconomic}
            {...register('kind')}
          >
            <option value="TUNAI">Tunai</option>
            <option value="BARANG">Barang</option>
          </select>
          {errors.kind && <small role="alert">{errors.kind.message}</small>}
        </label>
        <label>
          Sumber Dana *
          <input
            aria-label="Sumber Dana"
            maxLength={120}
            disabled={isPending}
            placeholder="APBD Kabupaten Barru"
            {...register('fundSource')}
          />
          {errors.fundSource && <small role="alert">{errors.fundSource.message}</small>}
        </label>
        <label>
          Nominal per Penerima (Rp) *
          <input
            aria-label="Nominal per Penerima (Rp)"
            type="number"
            min={1}
            step={1}
            readOnly={isLockedEconomic}
            disabled={isPending}
            {...register('amountPerRecipient', { valueAsNumber: true })}
          />
          <small>Acuan otomatis yang disalin server pada penyaluran.</small>
          {errors.amountPerRecipient && (
            <small role="alert">{errors.amountPerRecipient.message}</small>
          )}
        </label>
        <label>
          Periode Mulai (YYYY-MM) *
          <input
            aria-label="Periode Mulai"
            type="month"
            min="2000-01"
            max="2099-12"
            readOnly={isLockedEconomic}
            disabled={isPending}
            {...register('startPeriodInput')}
          />
          {errors.startPeriodInput && (
            <small role="alert">{errors.startPeriodInput.message}</small>
          )}
        </label>
        <label>
          Periode Akhir (YYYY-MM) *
          <input
            aria-label="Periode Akhir"
            type="month"
            min="2000-01"
            max="2099-12"
            readOnly={isLockedEconomic}
            disabled={isPending}
            {...register('endPeriodInput')}
          />
          {errors.endPeriodInput && <small role="alert">{errors.endPeriodInput.message}</small>}
        </label>
        <label className={s.full}>
          Total Pagu Anggaran (Rp) *
          <input
            aria-label="Total Pagu Anggaran (Rp)"
            type="number"
            min={1}
            step={1}
            readOnly={isLockedEconomic}
            disabled={isPending}
            {...register('totalBudget', { valueAsNumber: true })}
          />
          {errors.totalBudget && <small role="alert">{errors.totalBudget.message}</small>}
        </label>
        <label className={s.full}>
          Deskripsi Program
          <textarea
            aria-label="Deskripsi Program"
            rows={3}
            maxLength={1000}
            disabled={isPending}
            placeholder="Deskripsi singkat program bantuan sosial"
            {...register('description')}
          />
          {errors.description && <small role="alert">{errors.description.message}</small>}
        </label>
        {formattedError && (
          <div role="alert" className={s.full}>
            <p>{formattedError.message}</p>
            {formattedError.requestId && <small>ID Permintaan: {formattedError.requestId}</small>}
          </div>
        )}
        <footer className={s.full}>
          <button type="button" disabled={isPending} onClick={onClose}>
            Batal
          </button>
          <button type="submit" disabled={isPending} className={s.primary}>
            {isPending ? 'Menyimpan…' : 'Simpan Program Bantuan'}
          </button>
        </footer>
      </form>
    </RecipientDialog>
  )
}
