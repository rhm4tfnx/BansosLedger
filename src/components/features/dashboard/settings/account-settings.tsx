'use client'

import { LockKeyhole } from 'lucide-react'
import { useRoleAccess } from '@/hooks/use-role-access'
import { useSession } from '@/lib/api/hooks/auth'
import { AccountSecurity } from '@/components/features/dashboard/settings/account-security'
import { HashLink } from '@/components/features/dashboard/shared/hash-link'
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from '@/components/features/dashboard/shared/states'
import s from '@/components/features/dashboard/audit-log/activity-log.module.css'
import a from '@/components/features/dashboard/settings/account-settings.module.css'

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return '—'
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function shortenAddress(address: string | null): string {
  if (!address) return '-'
  if (address.length <= 14) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export default function AccountSettings() {
  const { can, meta } = useRoleAccess()
  const sessionQuery = useSession()
  const session = sessionQuery.data
  const operator = can('transaction:sign')

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <small>{label}</small>
      <div className={a.value}>{value}</div>
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.heading}>
        <h1>Profil &amp; Pengaturan Akun</h1>
        <span className={s.breadcrumb}>Dashboard / Pengaturan akun</span>
      </div>

      <section className={s.card}>
        <div className={s.heading}>
          <h2>Informasi Akun Terautentikasi</h2>
          <code>/dashboard/pengaturan</code>
        </div>

        {sessionQuery.isPending ? (
          <TableSkeleton rows={4} label="Memuat profil akun" />
        ) : sessionQuery.isError ? (
          <ErrorState error={sessionQuery.error} onRetry={() => void sessionQuery.refetch()} />
        ) : !session ? (
          <EmptyState>Data sesi pengguna tidak tersedia.</EmptyState>
        ) : (
          <>
            <div className={a.profile}>
              <div className={a.avatar}>{initialsFromName(session.name)}</div>
              <div>
                <h2>{session.name}</h2>
                <p>
                  {meta?.shortLabel ?? session.rawRole} &nbsp; | &nbsp; {session.institution}
                </p>
              </div>
            </div>

            <div className={a.grid}>
              {field('Nama Pengguna', session.name)}
              {field('Alamat Email Resmi', session.email)}
              {field(
                'Instansi Unit Kerja',
                <>
                  {session.institution} <LockKeyhole size={12} />
                </>,
              )}
              {field(
                'Peran Aplikasi',
                <>
                  {meta?.shortLabel ?? session.rawRole} <LockKeyhole size={12} />
                </>,
              )}
              {field(
                'Cakupan Akses',
                <span className={a.good}>
                  {operator ? 'Operasional & Penandatanganan' : 'Baca Saja · Monitoring & Verifikasi'}
                </span>,
              )}
              {field('Masa Berlaku Sesi (WITA)', session.expiresAtWita)}
            </div>
          </>
        )}
      </section>

      {session && (
        <section className={s.card}>
          <div className={s.heading}>
            <div>
              <h2>Status Verifikasi Wallet pada Sesi</h2>
              <p>Ikatan kriptografis antara sesi pengguna dan alamat wallet penandatangan.</p>
            </div>
          </div>
          <div className={a.two}>
            {field(
              'Status Verifikasi Wallet Sesi',
              <span className={session.walletVerified || !operator ? a.good : a.danger}>
                {!operator
                  ? 'Tidak diperlukan untuk peran baca-saja'
                  : session.walletVerified
                    ? '✓ Terverifikasi pada sesi ini'
                    : 'Belum diverifikasi'}
              </span>,
            )}
            {field(
              'Alamat Wallet Terikat',
              session.boundWalletAddress ? (
                <HashLink
                  hash={session.boundWalletAddress}
                  short={shortenAddress(session.boundWalletAddress)}
                  kind="address"
                />
              ) : (
                <span>-</span>
              ),
            )}
          </div>
        </section>
      )}

      <AccountSecurity />
    </div>
  )
}
