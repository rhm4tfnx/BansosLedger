import { create } from 'zustand'

export type WalletStatus =
  | 'unavailable'
  | 'disconnected'
  | 'wrong-chain'
  | 'wrong-account'
  | 'ready'

export interface PendingWalletTx {
  hash: string | null
  label?: string
  startedAt: number
}

export interface DeriveWalletStatusInput {
  providerAvailable: boolean
  address: string | null
  chainId: number | null
  expectedChainId: number | null
  boundWalletAddress?: string | null
}

export function deriveWalletStatus({
  providerAvailable,
  address,
  chainId,
  expectedChainId,
  boundWalletAddress,
}: DeriveWalletStatusInput): WalletStatus {
  if (!providerAvailable) {
    return 'unavailable'
  }
  if (!address) {
    return 'disconnected'
  }
  if (expectedChainId !== null && chainId !== expectedChainId) {
    return 'wrong-chain'
  }
  if (
    boundWalletAddress &&
    address.toLowerCase() !== boundWalletAddress.toLowerCase()
  ) {
    return 'wrong-account'
  }
  return 'ready'
}

export interface WalletStoreState {
  status: WalletStatus
  address: string | null
  chainId: number | null
  pendingTx: PendingWalletTx | null
  lastError: string | null
  wasRejected: boolean
  syncWalletState: (input: DeriveWalletStatusInput) => void
  setPendingTx: (pendingTx: PendingWalletTx | null) => void
  setRejected: (message?: string) => void
  setWalletError: (message: string | null) => void
  clearWalletFeedback: () => void
  resetWalletStore: () => void
}

export const WALLET_USER_REJECTED_MESSAGE = 'Transaksi dibatalkan di wallet'

export const useWalletStore = create<WalletStoreState>((set) => ({
  status: 'unavailable',
  address: null,
  chainId: null,
  pendingTx: null,
  lastError: null,
  wasRejected: false,
  syncWalletState: (input) =>
    set({
      status: deriveWalletStatus(input),
      address: input.address,
      chainId: input.chainId,
    }),
  setPendingTx: (pendingTx) => set({ pendingTx }),
  setRejected: (message = WALLET_USER_REJECTED_MESSAGE) =>
    set({
      pendingTx: null,
      wasRejected: true,
      lastError: message,
    }),
  setWalletError: (message) =>
    set({
      pendingTx: null,
      wasRejected: false,
      lastError: message,
    }),
  clearWalletFeedback: () =>
    set({
      wasRejected: false,
      lastError: null,
    }),
  resetWalletStore: () =>
    set({
      status: 'unavailable',
      address: null,
      chainId: null,
      pendingTx: null,
      lastError: null,
      wasRejected: false,
    }),
}))

