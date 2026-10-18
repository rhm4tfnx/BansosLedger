import { transactions } from '@/constants/explorer-data'
import { wallets, contractAddress } from '@/constants/explorer-addresses'

export { wallets, addresses, contractAddress } from '@/constants/explorer-addresses'
export type { ExplorerAddress } from '@/types/explorer'

export const walletFor = (name: string) => wallets.find((wallet) => wallet.name === name)!
export const addressTransactions = (address: string) =>
  transactions.filter(
    (transaction) => transaction.address === address || address === contractAddress,
  )
