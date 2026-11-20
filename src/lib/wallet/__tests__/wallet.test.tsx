import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { createAppQueryClient } from '@/components/providers/query-provider'
import { WalletGate } from '@/components/shared/wallet-gate'
import {
  deriveWalletStatus,
  toHexChainId,
  useWallet,
  useWalletStore,
  WALLET_USER_REJECTED_MESSAGE,
  type EthereumProviderWithEvents,
} from '@/lib/wallet'

const BOUND_ADDRESS = '0x1111111111111111111111111111111111111111'
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222'
const CONTRACT_ADDRESS = '0x3333333333333333333333333333333333333333'
const MOCK_TX_HASH = '0x' + 'ab'.repeat(32)

interface MockEthereumController {
  provider: EthereumProviderWithEvents
  emit: (event: string, payload: unknown) => void
  requests: Array<{ method: string; params?: unknown }>
  setAccounts: (accounts: string[]) => void
  setChainId: (chainIdHex: string) => void
}

function createMockEthereum(options: {
  initialAccounts?: string[]
  initialChainIdHex?: string
  onRequest?: (method: string, params?: unknown) => unknown
} = {}): MockEthereumController {
  let accounts = [...(options.initialAccounts ?? [])]
  let chainIdHex = options.initialChainIdHex ?? '0x539'
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const requests: Array<{ method: string; params?: unknown }> = []

  const provider: EthereumProviderWithEvents = {
    isMetaMask: true,
    on: (event, listener) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(listener)
    },
    removeListener: (event, listener) => {
      listeners.get(event)?.delete(listener)
    },
    request: async ({ method, params }) => {
      requests.push({ method, params })
      if (options.onRequest) {
        const custom = await options.onRequest(method, params)
        if (custom !== undefined) return custom
      }
      switch (method) {
        case 'eth_accounts':
          return accounts
        case 'eth_requestAccounts':
          if (accounts.length === 0) {
            accounts = [BOUND_ADDRESS]
          }
          return accounts
        case 'eth_chainId':
          return chainIdHex
        case 'eth_blockNumber':
          return '0x10'
        case 'eth_estimateGas':
          return '0x186a0'
        case 'eth_gasPrice':
          return '0x0'
        case 'net_version':
          return String(Number.parseInt(chainIdHex, 16))
        case 'wallet_switchEthereumChain': {
          const arg = Array.isArray(params) ? (params[0] as { chainId?: string }) : undefined
          if (arg?.chainId) {
            chainIdHex = arg.chainId
          }
          return null
        }
        case 'wallet_addEthereumChain': {
          const arg = Array.isArray(params) ? (params[0] as { chainId?: string }) : undefined
          if (arg?.chainId) {
            chainIdHex = arg.chainId
          }
          return null
        }
        case 'eth_sendTransaction':
          return MOCK_TX_HASH
        case 'eth_getTransactionByHash':
          return {
            hash: MOCK_TX_HASH,
            from: accounts[0] ?? BOUND_ADDRESS,
            to: CONTRACT_ADDRESS,
            input: '0xdeadbeef',
            data: '0xdeadbeef',
            type: '0x0',
            value: '0x0',
            nonce: '0x1',
            gas: '0x5208',
            gasPrice: '0x0',
            chainId: chainIdHex,
            blockHash: null,
            blockNumber: null,
            transactionIndex: null,
          }
        default:
          return null
      }
    },
  }

  return {
    provider,
    requests,
    setAccounts: (next) => {
      accounts = [...next]
    },
    setChainId: (nextHex) => {
      chainIdHex = nextHex
    },
    emit: (event, payload) => {
      for (const listener of listeners.get(event) ?? []) {
        listener(payload)
      }
    },
  }
}

function createWrapper() {
  const queryClient = createAppQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Wallet layer — store, useWallet(), and <WalletGate>', () => {
  const originalChainId = process.env.NEXT_PUBLIC_CHAIN_ID
  const originalRpcUrl = process.env.NEXT_PUBLIC_RPC_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CHAIN_ID = '1337'
    process.env.NEXT_PUBLIC_RPC_URL = 'http://127.0.0.1:8545'
    useWalletStore.getState().resetWalletStore()
    delete window.ethereum
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_CHAIN_ID = originalChainId
    process.env.NEXT_PUBLIC_RPC_URL = originalRpcUrl
    useWalletStore.getState().resetWalletStore()
    delete window.ethereum
    vi.restoreAllMocks()
  })

  it('derives all 5 store statuses accurately', () => {
    expect(
      deriveWalletStatus({
        providerAvailable: false,
        address: null,
        chainId: null,
        expectedChainId: 1337,
        boundWalletAddress: BOUND_ADDRESS,
      }),
    ).toBe('unavailable')

    expect(
      deriveWalletStatus({
        providerAvailable: true,
        address: null,
        chainId: 1337,
        expectedChainId: 1337,
        boundWalletAddress: BOUND_ADDRESS,
      }),
    ).toBe('disconnected')

    expect(
      deriveWalletStatus({
        providerAvailable: true,
        address: BOUND_ADDRESS,
        chainId: 1,
        expectedChainId: 1337,
        boundWalletAddress: BOUND_ADDRESS,
      }),
    ).toBe('wrong-chain')

    expect(
      deriveWalletStatus({
        providerAvailable: true,
        address: OTHER_ADDRESS,
        chainId: 1337,
        expectedChainId: 1337,
        boundWalletAddress: BOUND_ADDRESS,
      }),
    ).toBe('wrong-account')

    expect(
      deriveWalletStatus({
        providerAvailable: true,
        address: BOUND_ADDRESS.toUpperCase(),
        chainId: 1337,
        expectedChainId: 1337,
        boundWalletAddress: BOUND_ADDRESS.toLowerCase(),
      }),
    ).toBe('ready')
  })

  it('handles accountsChanged, chainChanged, ensureChain 4902 fallback, sendIntent, and code 4001', async () => {
    process.env.NEXT_PUBLIC_CHAIN_ID = '31337'
    process.env.NEXT_PUBLIC_RPC_URL = 'http://127.0.0.1:8545'

    let switchAttempted = false
    const mockEth = createMockEthereum({
      initialAccounts: [BOUND_ADDRESS],
      initialChainIdHex: '0x1',
      onRequest: (method) => {
        if (method === 'wallet_switchEthereumChain' && !switchAttempted) {
          switchAttempted = true
          const unrecognizedErr = Object.assign(new Error('Unrecognized chain ID'), {
            code: 4902,
          })
          throw unrecognizedErr
        }
        return undefined
      },
    })
    window.ethereum = mockEth.provider

    const { result } = renderHook(
      () =>
        useWallet({
          boundWalletAddress: BOUND_ADDRESS,
          enableSessionQuery: false,
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(result.current.status).toBe('wrong-chain')
    })

    // ensureChain switches using dynamic hex chainId (31337 -> 0x7a69), catches 4902, and calls wallet_addEthereumChain
    await act(async () => {
      await result.current.ensureChain()
    })

    expect(result.current.status).toBe('ready')
    expect(toHexChainId(31337)).toBe('0x7a69')
    expect(
      mockEth.requests.some(
        (req) =>
          req.method === 'wallet_addEthereumChain' &&
          JSON.stringify(req.params).includes('0x7a69') &&
          JSON.stringify(req.params).includes('http://127.0.0.1:8545'),
      ),
    ).toBe(true)

    // Reacts to accountsChanged -> wrong-account -> ready
    act(() => {
      mockEth.emit('accountsChanged', [OTHER_ADDRESS])
    })
    expect(result.current.status).toBe('wrong-account')

    act(() => {
      mockEth.emit('accountsChanged', [BOUND_ADDRESS])
    })
    expect(result.current.status).toBe('ready')

    // Reacts to chainChanged -> wrong-chain -> ready
    act(() => {
      mockEth.emit('chainChanged', '0x1')
    })
    expect(result.current.status).toBe('wrong-chain')

    act(() => {
      mockEth.emit('chainChanged', '0x7a69')
    })
    expect(result.current.status).toBe('ready')

    // sendIntent submits tx via BrowserProvider signer and sets pendingTx
    let txHash = ''
    await act(async () => {
      txHash = await result.current.sendIntent({
        to: CONTRACT_ADDRESS,
        data: '0xdeadbeef',
        label: 'Pencatatan Penyaluran',
      })
    })
    expect(txHash).toBe(MOCK_TX_HASH)
    expect(result.current.pendingTx?.hash).toBe(MOCK_TX_HASH)

    act(() => {
      result.current.clearPendingTx()
    })
    expect(result.current.pendingTx).toBeNull()

    // Maps user rejection code 4001 to "Transaksi dibatalkan di wallet"
    const rejectEth = createMockEthereum({
      initialAccounts: [BOUND_ADDRESS],
      initialChainIdHex: '0x7a69',
      onRequest: (method) => {
        if (method === 'eth_sendTransaction') {
          throw Object.assign(new Error('User denied transaction signature'), { code: 4001 })
        }
        return undefined
      },
    })
    window.ethereum = rejectEth.provider

    await act(async () => {
      await expect(
        result.current.sendIntent({ to: CONTRACT_ADDRESS, data: '0xdeadbeef' }),
      ).rejects.toThrow(WALLET_USER_REJECTED_MESSAGE)
    })
    expect(result.current.wasRejected).toBe(true)
    expect(result.current.lastError).toBe('Transaksi dibatalkan di wallet')
  })

  it('renders all PRD 13.2 rule 6 states in <WalletGate>', async () => {
    const user = userEvent.setup()

    // 1. No MetaMask
    const { unmount: unmount1 } = render(
      <WalletGate boundWalletAddress={BOUND_ADDRESS} enableSessionQuery={false}>
        <div>Konten Terlindungi</div>
      </WalletGate>,
      { wrapper: createWrapper() },
    )
    expect(screen.getByText('MetaMask tidak terdeteksi')).toBeInTheDocument()
    expect(screen.queryByText('Konten Terlindungi')).not.toBeInTheDocument()
    unmount1()

    // 2. Network stopped
    const readyEth = createMockEthereum({
      initialAccounts: [BOUND_ADDRESS],
      initialChainIdHex: '0x539',
    })
    window.ethereum = readyEth.provider

    const { unmount: unmount2 } = render(
      <WalletGate
        boundWalletAddress={BOUND_ADDRESS}
        networkStatus="Berhenti"
        enableSessionQuery={false}
      >
        <div>Konten Terlindungi</div>
      </WalletGate>,
      { wrapper: createWrapper() },
    )
    expect(screen.getByText('Jaringan blockchain sedang berhenti')).toBeInTheDocument()
    unmount2()

    // 3. Disconnected -> click Hubungkan MetaMask -> Ready
    const disconnectedEth = createMockEthereum({
      initialAccounts: [],
      initialChainIdHex: '0x539',
    })
    window.ethereum = disconnectedEth.provider

    const { unmount: unmount3 } = render(
      <WalletGate boundWalletAddress={BOUND_ADDRESS} enableSessionQuery={false}>
        <div>Konten Terlindungi</div>
      </WalletGate>,
      { wrapper: createWrapper() },
    )
    await waitFor(() => {
      expect(screen.getByText('Wallet belum terhubung')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Hubungkan MetaMask' }))
    await waitFor(() => {
      expect(screen.getByText('Konten Terlindungi')).toBeInTheDocument()
    })
    unmount3()

    // 4. Wrong network + switch button
    const wrongChainEth = createMockEthereum({
      initialAccounts: [BOUND_ADDRESS],
      initialChainIdHex: '0x1',
    })
    window.ethereum = wrongChainEth.provider

    const { unmount: unmount4 } = render(
      <WalletGate boundWalletAddress={BOUND_ADDRESS} enableSessionQuery={false}>
        <div>Konten Terlindungi</div>
      </WalletGate>,
      { wrapper: createWrapper() },
    )
    await waitFor(() => {
      expect(screen.getByText('Jaringan wallet tidak sesuai')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Pindah ke Jaringan Besu' }))
    await waitFor(() => {
      expect(screen.getByText('Konten Terlindungi')).toBeInTheDocument()
    })
    unmount4()

    // 5. Wrong account
    const wrongAccountEth = createMockEthereum({
      initialAccounts: [OTHER_ADDRESS],
      initialChainIdHex: '0x539',
    })
    window.ethereum = wrongAccountEth.provider

    const { unmount: unmount5 } = render(
      <WalletGate boundWalletAddress={BOUND_ADDRESS} enableSessionQuery={false}>
        <div>Konten Terlindungi</div>
      </WalletGate>,
      { wrapper: createWrapper() },
    )
    await waitFor(() => {
      expect(screen.getByText('Akun MetaMask tidak sesuai')).toBeInTheDocument()
    })
    unmount5()

    // 6. Waiting for block (spinner + estimate + aria-live) & 7. Rejected by user
    window.ethereum = readyEth.provider
    render(
      <WalletGate
        boundWalletAddress={BOUND_ADDRESS}
        enableSessionQuery={false}
        estimatedBlockSeconds={4}
      >
        <div>Konten Terlindungi</div>
      </WalletGate>,
      { wrapper: createWrapper() },
    )

    await waitFor(() => {
      expect(screen.getByText('Konten Terlindungi')).toBeInTheDocument()
    })

    act(() => {
      useWalletStore.getState().setPendingTx({
        hash: MOCK_TX_HASH,
        startedAt: Date.now(),
      })
    })

    const waitingStatus = await screen.findByRole('status')
    expect(waitingStatus).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Menunggu konfirmasi blok…')).toBeInTheDocument()
    expect(screen.getByText(/~4 detik/i)).toBeInTheDocument()

    act(() => {
      useWalletStore.getState().setRejected()
    })

    await waitFor(() => {
      expect(screen.getByText('Transaksi dibatalkan di wallet')).toBeInTheDocument()
      expect(screen.getByText('Konten Terlindungi')).toBeInTheDocument()
    })
  })

  it('normalizes raw RPC/ethers errors to Indonesian and renders WalletGate feedbackBanner with overflow protection', async () => {
    const { formatWalletError, WALLET_RPC_UNAVAILABLE_MESSAGE } = await import('@/lib/wallet')
    const rawRpcError = Object.assign(
      new Error(
        'could not coalesce error (error={ "code": -32603, "message": "RPC endpoint not found or unavailable." }, payload={ "id": 1, "jsonrpc": "2.0", "method": "eth_sendTransaction" })',
      ),
      { code: -32603 },
    )
    expect(formatWalletError(rawRpcError)).toBe(WALLET_RPC_UNAVAILABLE_MESSAGE)
    expect(formatWalletError(new Error('Failed to fetch'))).toBe(WALLET_RPC_UNAVAILABLE_MESSAGE)

    process.env.NEXT_PUBLIC_CHAIN_ID = '1337'
    const readyEth = createMockEthereum({
      initialAccounts: [BOUND_ADDRESS],
      initialChainIdHex: '0x539',
    })
    window.ethereum = readyEth.provider

    window.innerWidth = 375
    window.dispatchEvent(new Event('resize'))
    render(
      <WalletGate boundWalletAddress={BOUND_ADDRESS} enableSessionQuery={false}>
        <div>Konten Terlindungi</div>
      </WalletGate>,
      { wrapper: createWrapper() },
    )
    await waitFor(() => {
      expect(screen.getByText('Konten Terlindungi')).toBeInTheDocument()
    })

    act(() => {
      useWalletStore.getState().setWalletError(formatWalletError(rawRpcError))
    })

    const alertEl = await screen.findByRole('alert')
    expect(alertEl).toHaveTextContent(WALLET_RPC_UNAVAILABLE_MESSAGE)
    const textSpan = screen.getByText(WALLET_RPC_UNAVAILABLE_MESSAGE)
    expect(textSpan.className).toContain('min-w-0')
    expect(textSpan.className).toContain('break-words')
    expect(textSpan.className).toContain('[overflow-wrap:anywhere]')
  })
})
