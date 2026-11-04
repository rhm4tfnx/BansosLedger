'use client'
import { useEffect, useState } from 'react'
export interface WalletProvider { request(args: { method: string; params?: unknown[] }): Promise<unknown>; on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void }
export function getWalletProvider() { return (window as unknown as { ethereum?: WalletProvider }).ethereum }
export function useConnectedWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const provider = getWalletProvider()
    const invalidate = () => { setAddress(null); setChainId(null) }
    provider?.on?.('accountsChanged', invalidate)
    provider?.on?.('chainChanged', invalidate)
    provider?.on?.('disconnect', invalidate)
    return () => { provider?.removeListener?.('accountsChanged', invalidate); provider?.removeListener?.('chainChanged', invalidate); provider?.removeListener?.('disconnect', invalidate) }
  }, [])
  async function connect() {
    setAddress(null); setChainId(null); setError('')
    try {
      const provider = getWalletProvider()
      if (!provider) throw new Error('MetaMask belum tersedia.')
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      const chain = await provider.request({ method: 'eth_chainId' })
      if (!Array.isArray(accounts) || typeof accounts[0] !== 'string' || typeof chain !== 'string') throw new Error('Respons wallet tidak valid.')
      setAddress(accounts[0]); setChainId(chain)
    } catch (error) { setError(error instanceof Error ? error.message : 'Koneksi wallet gagal.') }
  }
  return { address, chainId, error, connect }
}
