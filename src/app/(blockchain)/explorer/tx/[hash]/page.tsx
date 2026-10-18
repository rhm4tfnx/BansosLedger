import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { transactions } from '@/constants/explorer-data'
import { TransactionDetails } from '@/components/features/explorer/transaction-details'

export const metadata: Metadata = {
  title: 'Detail Transaksi | BansosLedger',
  description:
    'Detail transaksi ilustrasi BansosLedger: status, kontrak, gas, log, dan perubahan state.',
}

export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  const transaction = transactions.find((t) => t.hash.toLowerCase() === hash.toLowerCase())
  if (!transaction) notFound()
  return <TransactionDetails key={transaction.hash} transaction={transaction} />
}
