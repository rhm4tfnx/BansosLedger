import type { Metadata } from 'next'
import { Disbursements } from '@/components/features/dashboard/disbursements/disbursements'

export const metadata: Metadata = {
  title: 'Penyaluran & IPFS | BansosLedger',
  description:
    'Dashboard simulasi pencatatan penyaluran bantuan sosial, bukti IPFS, pemulihan transaksi, dan verifikasi blockchain.',
}
export default function Page() {
  return <Disbursements />
}
