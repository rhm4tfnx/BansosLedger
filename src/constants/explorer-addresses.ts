import type { ExplorerAddress } from '@/types/explorer'

export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? ''
export const wallets: ExplorerAddress[] = []
export const addresses: ExplorerAddress[] = []
