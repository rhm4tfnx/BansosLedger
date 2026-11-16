import type { ReactNode } from 'react'
import { MaintenanceBanner } from '@/components/shared/maintenance-banner'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MaintenanceBanner />
      {children}
    </>
  )
}
