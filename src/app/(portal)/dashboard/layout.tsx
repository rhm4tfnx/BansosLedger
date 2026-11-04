import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getVerifiedServerSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/rbac'
import { Outfit } from 'next/font/google'
import { DashboardShell } from '@/components/features/dashboard/dashboard-shell'

export const dynamic = 'force-dynamic'

const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-dashboard' })

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getVerifiedServerSession().catch(() => null)
  if (!session) redirect('/login')
  if (!hasPermission(session.role, 'dashboard:read')) redirect('/explorer')
  return <div className={outfit.variable}><DashboardShell initialRole={session.role} walletVerified={session.walletVerified}>{children}</DashboardShell></div>
}
