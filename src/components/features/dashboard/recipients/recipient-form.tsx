'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RecipientDialog } from '@/components/features/dashboard/recipients/recipient-dialog'
import { formatApiError } from '@/lib/api/errors'
import {
  useCreateRecipientMutation,
  useUpdateRecipientMutation,
} from '@/lib/api/hooks/recipients'
import type { RecipientViewModel } from '@/types'
import s from '@/components/features/dashboard/recipients/recipients.module.css'

export function isValidNikFormat(nik: string): boolean {
  if (!/^\d{16}$/.test(nik)) return false
  const province = Number(nik.slice(0, 2))
  const day = Number(nik.slice(6, 8))
  const month = Number(nik.slice(8, 10))
  return (
    province >= 11 &&
    province <= 99 &&
    month >= 1 &&
    month <= 12 &&
    ((day >= 1 && day <= 31) || (day >= 41 && day <= 71))
  )
}

function createRecipientFormSchema(isEdit: boolean) {
  return z.object({
    nik: isEdit
      ? z
          .string()
          .trim()
          .refine((val) => val === '' || isValidNikFormat(val), {
            message:
              'NIK harus 16 digit angka dengan kode provinsi, tanggal, dan bulan lahir yang valid.',
          })
      : z
          .string()
          .trim()
          .refine((val) => isValidNikFormat(val), {
            message:
              'NIK wajib 16 digit angka dengan kode provinsi, tanggal, dan bulan lahir yang valid.',
          }),
    name: z
      .string()
      .trim()
      .min(2, 'Nama lengkap minimal 2 karakter.')
      .max(160, 'Nama lengkap maksimal 160 karakter.'),
    dusun: z
      .string()
      .trim()
      .min(1, 'Dusun / Lingkungan wajib diisi.')
      .max(100, 'Dusun maksimal 100 karakter.'),
    rt: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, 'RT harus 1–3 digit angka.'),
    rw: z
      .string()
      .trim()
      .regex(/^\d{1,3}$/, 'RW harus 1–3 digit angka.'),
    phone: z
      .string()
      .trim()
      .refine((val) => val === '' || /^\+?[0-9 -]{7,20}$/.test(val), {
        message: 'Nomor telepon harus 7–20 karakter angka.',
      }),
  })
}

type RecipientFormValues = z.infer<ReturnType<typeof createRecipientFormSchema>>

export interface RecipientFormProps {
  initial?: RecipientViewModel
  onClose: () => void
  onSaved?: (recipient: RecipientViewModel) => void
}

export function RecipientForm({ initial, onClose, onSaved }: RecipientFormProps) {
  const isEdit = Boolean(initial)
  const createMutation = useCreateRecipientMutation()
  const updateMutation = useUpdateRecipientMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecipientFormValues>({
    resolver: zodResolver(createRecipientFormSchema(isEdit)),
    defaultValues: {
      nik: '',
      name: initial?.name ?? '',
      dusun: initial?.dusun ?? 'Kampung Baru',
      rt: initial?.rt ?? '001',
      rw: initial?.rw ?? '001',
      phone: initial?.phone ?? '',
    },
  })

  const activeError = createMutation.error ?? updateMutation.error
  const formattedError = activeError ? formatApiError(activeError) : null
  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    const address = {
      dusun: values.dusun.trim(),
      rt: values.rt.trim(),
      rw: values.rw.trim(),
    }
    const phone = values.phone.trim() ? values.phone.trim() : undefined

    if (initial) {
      const updated = await updateMutation.mutateAsync({
        id: initial.id,
        patch: {
          ...(values.nik.trim() ? { nik: values.nik.trim() } : {}),
          name: values.name.trim(),
          address,
          ...(phone !== undefined ? { phone } : {}),
        },
      })
      onSaved?.(updated)
      onClose()
      return
    }

    const created = await createMutation.mutateAsync({
      nik: values.nik.trim(),
      name: values.name.trim(),
      address,
      ...(phone !== undefined ? { phone } : {}),
    })
    onSaved?.(created)
    onClose()
  })

  return (
    <RecipientDialog
      title={initial ? 'Edit Penerima (DRAFT)' : 'Tambah Penerima Bantuan Baru'}
      subtitle="Data baru disimpan sebagai DRAFT dan dapat diedit hingga dikunci menjadi FINAL."
      onClose={() => {
        if (!isPending) onClose()
      }}
    >
      <form className={s.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        <label className={s.fieldHalf}>
          <span>Nama Lengkap Sesuai KTP *</span>
          <input
            aria-label="Nama Lengkap Sesuai KTP"
            placeholder="Contoh: Siti Rahmawati"
            disabled={isPending}
            {...register('name')}
          />
          {errors.name && <small role="alert">{errors.name.message}</small>}
        </label>
        <label className={s.fieldHalf}>
          <span>
            Nomor Induk Kependudukan (NIK 16 Digit) {isEdit ? '(Opsional jika tidak diubah)' : '*'}
          </span>
          <input
            aria-label="Nomor Induk Kependudukan (NIK)"
            aria-describedby="recipient-nik-helper"
            inputMode="numeric"
            maxLength={16}
            placeholder={initial ? `Tersimpan: ${initial.nikMasked}` : '731104xxxxxxxxxx'}
            disabled={isPending}
            {...register('nik')}
          />
          <small id="recipient-nik-helper">
            NIK dienkripsi AES-256-GCM di server dan tidak pernah ditempatkan pada URL.
          </small>
          {errors.nik && <small role="alert">{errors.nik.message}</small>}
        </label>
        <label className={s.fieldDusun}>
          <span>Dusun / Lingkungan *</span>
          <input
            aria-label="Dusun / Lingkungan"
            placeholder="Contoh: Kampung Baru"
            disabled={isPending}
            {...register('dusun')}
          />
          {errors.dusun && <small role="alert">{errors.dusun.message}</small>}
        </label>
        <label className={s.fieldSmall}>
          <span>RT *</span>
          <input
            aria-label="RT"
            inputMode="numeric"
            maxLength={3}
            placeholder="001"
            disabled={isPending}
            {...register('rt')}
          />
          {errors.rt && <small role="alert">{errors.rt.message}</small>}
        </label>
        <label className={s.fieldSmall}>
          <span>RW *</span>
          <input
            aria-label="RW"
            inputMode="numeric"
            maxLength={3}
            placeholder="001"
            disabled={isPending}
            {...register('rw')}
          />
          {errors.rw && <small role="alert">{errors.rw.message}</small>}
        </label>
        <label className={s.full}>
          <span>Nomor Telepon (Opsional)</span>
          <input
            aria-label="Nomor Telepon"
            inputMode="tel"
            maxLength={20}
            placeholder="08xxxxxxxxxx"
            disabled={isPending}
            {...register('phone')}
          />
          {errors.phone && <small role="alert">{errors.phone.message}</small>}
        </label>
        <div className={`${s.hashPreview} ${s.full}`}>
          <div>
            <strong>Perlindungan Privasi (UU PDP)</strong>
            <p>
              Komitmen identitas <code>keccak256(NIK ‖ PEPPER)</code> akan dibentuk oleh server
              ketika status penerima dikunci menjadi FINAL.
            </p>
          </div>
        </div>
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
            {isPending ? 'Menyimpan…' : 'Simpan sebagai DRAFT'}
          </button>
        </footer>
      </form>
    </RecipientDialog>
  )
}
