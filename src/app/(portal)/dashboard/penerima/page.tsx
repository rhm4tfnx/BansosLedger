import type { Metadata } from 'next'
import { Recipients } from '@/components/features/dashboard/recipients/recipients'
export const metadata: Metadata = {
  title: 'Penerima Bantuan | BansosLedger',
  description: 'Pengelolaan penerima bantuan sosial Kelurahan Takkalasi.',
  robots: { index: false, follow: false },
}
export default function Page() {
  return (
    <>
      <>
        <Recipients />
      </>
    </>
  )
}
