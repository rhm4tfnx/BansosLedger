'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogOut, LockKeyhole, Pencil } from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { formatApiError } from '@/lib/api/errors'
import {
  useChangePasswordMutation,
  useLogoutMutation,
} from '@/lib/api/hooks/auth'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
import a from '@/components/features/dashboard/settings/account-settings.module.css'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
    newPassword: z
      .string()
      .min(12, 'Kata sandi baru minimal 12 karakter.')
      .max(128, 'Kata sandi baru maksimal 128 karakter.'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi baru wajib diisi.'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['confirmPassword'],
  })

type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export function AccountSecurity() {
  const router = useRouter()
  const { can } = useRoleAccess()
  const changePasswordMutation = useChangePasswordMutation()
  const logoutMutation = useLogoutMutation()

  const [showForm, setShowForm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const isPending = isSubmitting || changePasswordMutation.isPending
  const formattedError = changePasswordMutation.error
    ? formatApiError(changePasswordMutation.error)
    : null

  const onSubmit = handleSubmit(async (values) => {
    setSuccessMsg('')
    await changePasswordMutation.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    })
    reset()
    setShowForm(false)
    setSuccessMsg('Kata sandi akun berhasil diperbarui.')
  })

  async function handleLogout() {
    await logoutMutation.mutateAsync()
    router.replace('/login')
  }

  return (
    <section className={s.card}>
      <h2>Keamanan Kredensial Akun</h2>
      <div className={s.heading}>
        <div>
          <h3>Ganti Kata Sandi Portal Internal</h3>
          <p>
            Kata sandi wajib terdiri dari minimal 12 karakter. Perubahan kata sandi dicatat pada log
            audit tanpa menyimpan nilai kata sandi.
          </p>
        </div>
        <div className={s.actions}>
          {can('settings:update') && (
            <button
              type="button"
              onClick={() => {
                setSuccessMsg('')
                setShowForm((prev) => !prev)
              }}
            >
              <Pencil size={15} /> {showForm ? 'Tutup Formulir' : 'Ganti kata sandi'}
            </button>
          )}
          <button
            type="button"
            disabled={logoutMutation.isPending}
            onClick={() => void handleLogout()}
          >
            <LogOut size={15} /> {logoutMutation.isPending ? 'Keluar…' : 'Keluar sesi'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div role="status" className={s.inset}>
          {successMsg}
        </div>
      )}

      {showForm && (
        <form className={a.grid} onSubmit={(e) => void onSubmit(e)} noValidate>
          <label>
            Kata Sandi Saat Ini *
            <input
              aria-label="Kata Sandi Saat Ini"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <small role="alert">{errors.currentPassword.message}</small>
            )}
          </label>
          <label>
            Kata Sandi Baru (Min. 12 Karakter) *
            <input
              aria-label="Kata Sandi Baru"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              {...register('newPassword')}
            />
            {errors.newPassword && <small role="alert">{errors.newPassword.message}</small>}
          </label>
          <label>
            Konfirmasi Kata Sandi Baru *
            <input
              aria-label="Konfirmasi Kata Sandi Baru"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <small role="alert">{errors.confirmPassword.message}</small>
            )}
          </label>
          {formattedError && (
            <div role="alert">
              <p>{formattedError.message}</p>
              {formattedError.requestId && (
                <small>ID Permintaan: {formattedError.requestId}</small>
              )}
            </div>
          )}
          <div className={s.actions}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                reset()
                setShowForm(false)
              }}
            >
              Batal
            </button>
            <button type="submit" disabled={isPending} className={s.primary}>
              {isPending ? 'Menyimpan…' : 'Simpan Kata Sandi Baru'}
            </button>
          </div>
        </form>
      )}

      <div className={a.row}>
        <div>
          <h3>Perlindungan Hak Akses &amp; Audit Append-Only</h3>
          <p>
            Peran, instansi unit kerja, dan kewenangan penandatanganan ditentukan oleh server serta
            tidak dapat diubah dari halaman profil.
          </p>
        </div>
        <span className={s.badge}>
          <LockKeyhole size={13} /> Dikunci server
        </span>
      </div>
    </section>
  )
}
