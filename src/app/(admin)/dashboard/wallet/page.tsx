import { WalletRegistry } from '@/components/features/dashboard/wallet-registry'
export const metadata = {
  title: 'Registri Wallet & Matriks Peran | BansosLedger',
  description:
    'Pratinjau registri wallet read-only, pemisahan identitas, matriks peran dan simulasi otorisasi.',
}
export default function Page() {
  return <WalletRegistry />
}
