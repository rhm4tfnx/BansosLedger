import { BrowserProvider, JsonRpcProvider, type JsonRpcSigner } from 'ethers'

export const BESU_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 250204)
export const BESU_RPC_PORT = 8545

export interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>
}
export interface BlockchainProviderFactory<Provider = JsonRpcProvider, Signer = JsonRpcSigner> {
  createJsonRpcProvider(rpcUrl: URL | string): Provider
  createBrowserSigner(provider: Eip1193Provider): Promise<Signer>
}

export const ethersProviderFactory: BlockchainProviderFactory = {
  createJsonRpcProvider(rpcUrl: URL | string) {
    return new JsonRpcProvider(typeof rpcUrl === 'string' ? rpcUrl : rpcUrl.toString(), BESU_CHAIN_ID, {
      staticNetwork: true,
    })
  },
  async createBrowserSigner(provider: Eip1193Provider) {
    const browserProvider = new BrowserProvider(provider)
    return browserProvider.getSigner()
  },
}
export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum
  return ethereum && typeof ethereum.request === 'function' ? ethereum : null
}
