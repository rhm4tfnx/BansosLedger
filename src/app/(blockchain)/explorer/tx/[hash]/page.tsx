import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { transactions } from '@/mocks/explorer-data'
import { TransactionDetails } from '@/components/features/explorer/transaction-details'
import { DistributionExplorer } from '@/components/features/dashboard/disbursements/disbursement-detail'

export const metadata: Metadata = {
  title: 'Detail Transaksi | BansosLedger',
  description:
    'Detail transaksi ilustrasi BansosLedger: status, kontrak, gas, log, dan perubahan state.',
}

export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  if (/^0xd15b[0-9a-f]{60}$/i.test(hash)) return <DistributionExplorer hash={hash} />
  const transaction = transactions.find((t) => t.hash.toLowerCase() === hash.toLowerCase())
  if (!transaction) notFound()
  return <TransactionDetails key={transaction.hash} transaction={transaction} />
}
