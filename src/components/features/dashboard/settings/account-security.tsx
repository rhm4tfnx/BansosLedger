'use client'

import { LockKeyhole, Pencil } from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { COMING_SOON_TITLE } from '@/components/features/dashboard/shared/states'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
import a from '@/components/features/dashboard/settings/account-settings.module.css'

export function AccountSecurity() {
  const { can } = useRoleAccess()

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
        {can('settings:update') && (
          <button type="button" disabled title={COMING_SOON_TITLE}>
            <Pencil size={15} /> Ganti kata sandi
          </button>
        )}
      </div>
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
