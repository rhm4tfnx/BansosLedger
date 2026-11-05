import type { Page } from '@playwright/test'

export interface HardhatEthereumOptions {
  rpcUrl?: string
  chainIdHex?: string
  accountAddress?: string
}

/**
 * Injects a stubbed EIP-1193 `window.ethereum` provider into the Playwright page.
 * Signing and transactions are delegated via JSON-RPC to the local Hardhat node's
 * unlocked account #0 so no private key ever exists in the browser context.
 */
export async function injectHardhatEthereumProvider(
  page: Page,
  options: HardhatEthereumOptions = {},
): Promise<void> {
  const rpcUrl = options.rpcUrl ?? 'http://127.0.0.1:8545'
  const chainIdHex = options.chainIdHex ?? '0x3d15c' // 250204
  const accountAddress =
    options.accountAddress ?? '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

  await page.addInitScript(
    ({ rpc, chainHex, account }) => {
      const listeners: Record<string, Set<(...args: unknown[]) => void>> = {}

      const provider = {
        isMetaMask: true,
        on(event: string, cb: (...args: unknown[]) => void) {
          if (!listeners[event]) listeners[event] = new Set()
          listeners[event].add(cb)
        },
        removeListener(event: string, cb: (...args: unknown[]) => void) {
          listeners[event]?.delete(cb)
        },
        async request({ method, params = [] }: { method: string; params?: unknown[] }) {
          if (method === 'eth_chainId') {
            return chainHex
          }
          if (method === 'net_version') {
            return String(Number.parseInt(chainHex, 16))
          }
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
            return [account]
          }
          if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
            return null
          }
          const response = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method,
              params,
            }),
          })
          const payload = (await response.json()) as {
            result?: unknown
            error?: { code?: number; message?: string }
          }
          if (payload.error) {
            const err = new Error(payload.error.message ?? 'RPC Error') as Error & {
              code?: number
            }
            err.code = payload.error.code ?? -32603
            throw err
          }
          return payload.result
        },
      }

      Object.defineProperty(window, 'ethereum', {
        value: provider,
        writable: false,
        configurable: true,
      })
    },
    { rpc: rpcUrl, chainHex: chainIdHex, account: accountAddress },
  )
}

