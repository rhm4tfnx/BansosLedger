import { transactions } from '@/mocks/explorer-data'
import { wallets, contractAddress } from '@/constants/explorer-addresses'

export const walletFor = (name: string) => wallets.find((wallet) => wallet.name === name)!
export const addressTransactions = (address: string) =>
  transactions.filter((transaction) => transaction.address === address || address === contractAddress)
