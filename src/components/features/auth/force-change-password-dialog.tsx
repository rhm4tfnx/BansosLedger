'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  formatApiError,
  useChangePasswordMutation,
  useUiEventsStore,
} from '@/lib/api'

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'password1234',
  'password12345',
  'password123456',
  '123456789012',
  'qwerty12345678',
  'administrator',
  'admin12345678',
  'bansosledger',
  'bansosledger123',
])

export const forceChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
    newPassword: z
      .string()
      .min(12, 'Kata sandi baru minimal 12 karakter.')
      .max(1024, 'Kata sandi baru maksimal 1024 karakter.')
      .refine(
        (value) => !COMMON_PASSWORDS.has(value.toLowerCase()),
        'Kata sandi terlalu umum. Gunakan kombinasi yang lebih kuat.',
      ),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi baru wajib diisi.'),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak cocok.',
  })

export type ForceChangePasswordFormValues = z.infer<typeof forceChangePasswordSchema>

export interface ForceChangePasswordDialogProps {
  initialOpen?: boolean
  onSuccess?: () => void
}

export function ForceChangePasswordDialog({
  initialOpen = false,
  onSuccess,
}: ForceChangePasswordDialogProps) {
  const storeOpen = useUiEventsStore((state) => state.mustChangePasswordOpen)
  const openMustChangePassword = useUiEventsStore((state) => state.openMustChangePassword)
  const closeMustChangePassword = useUiEventsStore((state) => state.closeMustChangePassword)

  useEffect(() => {
    if (initialOpen) {
      openMustChangePassword()
    }
  }, [initialOpen, openMustChangePassword])

  const changePasswordMutation = useChangePasswordMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForceChangePasswordFormValues>({
    resolver: zodResolver(forceChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const isPending = isSubmitting || changePasswordMutation.isPending
  const formattedApiError = changePasswordMutation.error
    ? formatApiError(changePasswordMutation.error)
    : null

  async function onSubmit(values: ForceChangePasswordFormValues) {
    await changePasswordMutation.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    })
    reset()
    closeMustChangePassword()
    onSuccess?.()
  }

  return (
    <Dialog
      open={storeOpen}
      disablePointerDismissal
      onOpenChange={(_nextOpen, eventDetails) => {
        eventDetails.cancel()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="size-4 shrink-0" aria-hidden="true" />
            <DialogTitle>Ganti kata sandi</DialogTitle>
          </div>
          <DialogDescription>
            Demi keamanan akun, Anda wajib mengganti kata sandi sementara sebelum melanjutkan
            pengelolaan data BansosLedger (minimal 12 karakter).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-3.5">
          {formattedApiError && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
            >
              <p className="font-medium">{formattedApiError.message}</p>
              {formattedApiError.requestId && (
                <small className="mt-0.5 block font-mono text-[11px] text-red-800/80">
                  ID Permintaan: {formattedApiError.requestId}
                </small>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <label htmlFor="force-current-password" className="text-xs font-medium text-foreground">
              Kata sandi saat ini
            </label>
            <input
              id="force-current-password"
              type="password"
              autoComplete="current-password"
              disabled={isPending}
              aria-invalid={Boolean(errors.currentPassword)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p role="alert" className="text-xs text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="force-new-password" className="text-xs font-medium text-foreground">
              Kata sandi baru (minimal 12 karakter)
            </label>
            <input
              id="force-new-password"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              aria-invalid={Boolean(errors.newPassword)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p role="alert" className="text-xs text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="force-confirm-password" className="text-xs font-medium text-foreground">
              Konfirmasi kata sandi baru
            </label>
            <input
              id="force-confirm-password"
              type="password"
              autoComplete="new-password"
              disabled={isPending}
              aria-invalid={Boolean(errors.confirmPassword)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p role="alert" className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <DialogFooter showCloseButton={false} className="mt-2">
            <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Menyimpan kata sandi…' : 'Simpan kata sandi baru'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

