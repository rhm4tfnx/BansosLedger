import type { ReactNode } from 'react'
import { Outfit } from 'next/font/google'
import { DashboardShell } from '@/components/features/dashboard/dashboard-shell'

const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-dashboard' })

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <div className={outfit.variable}><DashboardShell>{children}</DashboardShell></div>
}
