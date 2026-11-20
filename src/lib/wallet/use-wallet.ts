'use client'

import { useCallback, useEffect } from 'react'
import { BrowserProvider, type Eip1193Provider } from 'ethers'
import { useSession } from '@/lib/api/hooks/auth'
import { formatWalletError } from './errors'
import {
  useWalletStore,
  WALLET_USER_REJECTED_MESSAGE,
} from './store'

export interface EthereumProviderWithEvents extends Eip1193Provider {
  isMetaMask?: boolean
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProviderWithEvents
  }
}

export function getExpectedChainId(): number | null {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim()
  if (!raw) return null
  const parsed = raw.startsWith('0x') || raw.startsWith('0X')
    ? Number.parseInt(raw, 16)
    : Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function toHexChainId(chainId: number): string {
  return `0x${chainId.toString(16)}`
}

export function getPublicRpcUrl(): string {
  return process.env.NEXT_PUBLIC_RPC_URL?.trim() || 'http://127.0.0.1:8545'
}

export function parseChainIdValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'bigint' && value > BigInt(0)) {
    return Number(value)
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim()
    const parsed =
      trimmed.startsWith('0x') || trimmed.startsWith('0X')
        ? Number.parseInt(trimmed, 16)
        : Number.parseInt(trimmed, 10)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

function extractRpcErrorCode(err: unknown): number | string | null {
  if (typeof err !== 'object' || err === null) return null
  const record = err as Record<string, unknown>

  if (typeof record.code === 'number' || typeof record.code === 'string') {
    if (record.code === 4001 || record.code === 4902 || record.code === 'ACTION_REJECTED') {
      return record.code
    }
  }

  if (typeof record.info === 'object' && record.info !== null) {
    const info = record.info as Record<string, unknown>
    if (typeof info.error === 'object' && info.error !== null) {
      const inner = info.error as Record<string, unknown>
      if (typeof inner.code === 'number' || typeof inner.code === 'string') {
        return inner.code
      }
    }
  }

  if (typeof record.data === 'object' && record.data !== null) {
    const data = record.data as Record<string, unknown>
    if (typeof data.originalError === 'object' && data.originalError !== null) {
      const orig = data.originalError as Record<string, unknown>
      if (typeof orig.code === 'number' || typeof orig.code === 'string') {
        return orig.code
      }
    }
  }

  if (typeof record.code === 'number' || typeof record.code === 'string') {
    return record.code
  }

  return null
}

export function isUserRejectedWalletError(err: unknown): boolean {
  const code = extractRpcErrorCode(err)
  return code === 4001 || code === '4001' || code === 'ACTION_REJECTED'
}

export function isUnrecognizedChainError(err: unknown): boolean {
  const code = extractRpcErrorCode(err)
  return code === 4902 || code === '4902'
}

function getBrowserEthereum(): EthereumProviderWithEvents | null {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null
  }
  return window.ethereum
}

export interface SendIntentInput {
  to: string
  data: string
  label?: string
}

export interface UseWalletOptions {
  boundWalletAddress?: string | null
  enableSessionQuery?: boolean
}

export function useWallet(options: UseWalletOptions = {}) {
  const sessionQuery = useSession({
    enabled: options.boundWalletAddress === undefined && (options.enableSessionQuery ?? true),
  })

  const boundWalletAddress =
    options.boundWalletAddress !== undefined
      ? options.boundWalletAddress
      : (sessionQuery.data?.boundWalletAddress ?? null)

  const status = useWalletStore((state) => state.status)
  const address = useWalletStore((state) => state.address)
  const chainId = useWalletStore((state) => state.chainId)
  const pendingTx = useWalletStore((state) => state.pendingTx)
  const lastError = useWalletStore((state) => state.lastError)
  const wasRejected = useWalletStore((state) => state.wasRejected)
  const syncWalletState = useWalletStore((state) => state.syncWalletState)
  const setPendingTx = useWalletStore((state) => state.setPendingTx)
  const setRejected = useWalletStore((state) => state.setRejected)
  const setWalletError = useWalletStore((state) => state.setWalletError)
  const clearWalletFeedback = useWalletStore((state) => state.clearWalletFeedback)

  const expectedChainId = getExpectedChainId()

  const inspectWallet = useCallback(async () => {
    const ethereum = getBrowserEthereum()
    if (!ethereum) {
      syncWalletState({
        providerAvailable: false,
        address: null,
        chainId: null,
        expectedChainId,
        boundWalletAddress,
      })
      return
    }

    try {
      const [accountsRaw, chainIdRaw] = await Promise.all([
        ethereum.request({ method: 'eth_accounts' }),
        ethereum.request({ method: 'eth_chainId' }),
      ])
      const accounts = Array.isArray(accountsRaw)
        ? accountsRaw.filter((item): item is string => typeof item === 'string')
        : []
      const activeAddress = accounts[0] ?? null
      const activeChainId = parseChainIdValue(chainIdRaw)

      syncWalletState({
        providerAvailable: true,
        address: activeAddress,
        chainId: activeChainId,
        expectedChainId,
        boundWalletAddress,
      })
    } catch {
      syncWalletState({
        providerAvailable: true,
        address: null,
        chainId: null,
        expectedChainId,
        boundWalletAddress,
      })
    }
  }, [boundWalletAddress, expectedChainId, syncWalletState])

  useEffect(() => {
    void inspectWallet()
    const handleInitialized = () => {
      void inspectWallet()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('ethereum#initialized', handleInitialized)
      return () => {
        window.removeEventListener('ethereum#initialized', handleInitialized)
      }
    }
    return undefined
  }, [inspectWallet])

  useEffect(() => {
    const ethereum = getBrowserEthereum()
    if (!ethereum?.on) return

    const handleAccountsChanged = (accountsArg: unknown) => {
      const accounts = Array.isArray(accountsArg)
        ? accountsArg.filter((item): item is string => typeof item === 'string')
        : []
      const nextAddress = accounts[0] ?? null
      const currentChain = useWalletStore.getState().chainId
      syncWalletState({
        providerAvailable: true,
        address: nextAddress,
        chainId: currentChain,
        expectedChainId,
        boundWalletAddress,
      })
    }

    const handleChainChanged = (chainIdArg: unknown) => {
      const nextChainId = parseChainIdValue(chainIdArg)
      const currentAddress = useWalletStore.getState().address
      syncWalletState({
        providerAvailable: true,
        address: currentAddress,
        chainId: nextChainId,
        expectedChainId,
        boundWalletAddress,
      })
    }

    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      ethereum.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [boundWalletAddress, expectedChainId, syncWalletState])

  const connect = useCallback(async (): Promise<string | null> => {
    const ethereum = getBrowserEthereum()
    if (!ethereum) {
      syncWalletState({
        providerAvailable: false,
        address: null,
        chainId: null,
        expectedChainId,
        boundWalletAddress,
      })
      return null
    }

    clearWalletFeedback()
    try {
      const browserProvider = new BrowserProvider(ethereum)
      const accountsRaw: unknown = await browserProvider.send('eth_requestAccounts', [])
      const chainIdRaw: unknown = await ethereum.request({ method: 'eth_chainId' })
      const accounts = Array.isArray(accountsRaw)
        ? accountsRaw.filter((item): item is string => typeof item === 'string')
        : []
      const connectedAddress = accounts[0] ?? null
      const currentChainId = parseChainIdValue(chainIdRaw)

      syncWalletState({
        providerAvailable: true,
        address: connectedAddress,
        chainId: currentChainId,
        expectedChainId,
        boundWalletAddress,
      })
      return connectedAddress
    } catch (err) {
      if (isUserRejectedWalletError(err)) {
        setRejected(WALLET_USER_REJECTED_MESSAGE)
        throw new Error(WALLET_USER_REJECTED_MESSAGE)
      }
      const message = formatWalletError(err, 'Gagal menghubungkan wallet MetaMask.')
      setWalletError(message)
      throw new Error(message)
    }
  }, [
    boundWalletAddress,
    clearWalletFeedback,
    expectedChainId,
    setRejected,
    setWalletError,
    syncWalletState,
  ])

  const ensureChain = useCallback(async (): Promise<void> => {
    const ethereum = getBrowserEthereum()
    if (!ethereum) {
      throw new Error('MetaMask tidak tersedia.')
    }
    const targetChainId = getExpectedChainId()
    if (targetChainId === null) {
      throw new Error('Konfigurasi NEXT_PUBLIC_CHAIN_ID belum diatur.')
    }

    clearWalletFeedback()
    const chainIdHex = toHexChainId(targetChainId)
    const rpcUrl = getPublicRpcUrl()

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })
    } catch (switchErr) {
      if (isUserRejectedWalletError(switchErr)) {
        setRejected(WALLET_USER_REJECTED_MESSAGE)
        throw new Error(WALLET_USER_REJECTED_MESSAGE)
      }
      if (isUnrecognizedChainError(switchErr)) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: 'BansosLedger Besu Consortium',
                rpcUrls: [rpcUrl],
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          })
        } catch (addErr) {
          if (isUserRejectedWalletError(addErr)) {
            setRejected(WALLET_USER_REJECTED_MESSAGE)
            throw new Error(WALLET_USER_REJECTED_MESSAGE)
          }
          setWalletError('Gagal menambahkan jaringan blockchain ke MetaMask.')
          throw addErr
        }
      } else {
        setWalletError('Gagal berpindah jaringan di MetaMask.')
        throw switchErr
      }
    }

    const updatedAddress = useWalletStore.getState().address
    syncWalletState({
      providerAvailable: true,
      address: updatedAddress,
      chainId: targetChainId,
      expectedChainId: targetChainId,
      boundWalletAddress,
    })
  }, [boundWalletAddress, clearWalletFeedback, setRejected, setWalletError, syncWalletState])

  const sendIntent = useCallback(
    async ({ to, data, label }: SendIntentInput): Promise<string> => {
      const ethereum = getBrowserEthereum()
      if (!ethereum) {
        throw new Error('MetaMask tidak tersedia.')
      }

      clearWalletFeedback()
      setPendingTx({
        hash: null,
        label,
        startedAt: Date.now(),
      })

      try {
        const browserProvider = new BrowserProvider(ethereum)
        const signer = await browserProvider.getSigner()
        const txHash = await signer.sendUncheckedTransaction({ to, data })
        setPendingTx({
          hash: txHash,
          label,
          startedAt: Date.now(),
        })
        return txHash
      } catch (err) {
        if (isUserRejectedWalletError(err)) {
          setRejected(WALLET_USER_REJECTED_MESSAGE)
          throw new Error(WALLET_USER_REJECTED_MESSAGE)
        }
        const message = formatWalletError(err, 'Gagal mengirim transaksi melalui wallet.')
        setWalletError(message)
        throw new Error(message)
      }
    },
    [clearWalletFeedback, setPendingTx, setRejected, setWalletError],
  )

  const signMessage = useCallback(
    async (message: string, signerAddress?: string | null): Promise<string> => {
      const ethereum = getBrowserEthereum()
      if (!ethereum) {
        throw new Error('MetaMask tidak tersedia.')
      }
      const targetAddress = signerAddress ?? useWalletStore.getState().address
      if (!targetAddress) {
        throw new Error('Hubungkan wallet terlebih dahulu.')
      }

      clearWalletFeedback()
      try {
        const signatureRaw: unknown = await ethereum.request({
          method: 'personal_sign',
          params: [message, targetAddress],
        })
        if (typeof signatureRaw !== 'string' || !signatureRaw) {
          throw new Error('Tanda tangan pesan tidak valid dari wallet.')
        }
        return signatureRaw
      } catch (err) {
        if (isUserRejectedWalletError(err)) {
          setRejected(WALLET_USER_REJECTED_MESSAGE)
          throw new Error(WALLET_USER_REJECTED_MESSAGE)
        }
        const errMessage = formatWalletError(err, 'Gagal menandatangani pesan di wallet.')
        setWalletError(errMessage)
        throw new Error(errMessage)
      }
    },
    [clearWalletFeedback, setRejected, setWalletError],
  )

  const clearPendingTx = useCallback(() => {
    setPendingTx(null)
  }, [setPendingTx])

  return {
    status,
    address,
    chainId,
    expectedChainId,
    boundWalletAddress,
    pendingTx,
    lastError,
    wasRejected,
    connect,
    ensureChain,
    sendIntent,
    signMessage,
    clearPendingTx,
    clearWalletFeedback,
    refreshWallet: inspectWallet,
  }
}
