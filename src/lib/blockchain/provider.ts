export const BESU_CHAIN_ID = 1337
export const BESU_RPC_PORT = 8545

export interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>
}
export interface BlockchainProviderFactory<Provider, Signer> {
  // Implement with ethers.JsonRpcProvider and ethers.BrowserProvider after SDK approval.
  createJsonRpcProvider(rpcUrl: URL): Provider
  createBrowserSigner(provider: Eip1193Provider): Promise<Signer>
}
export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum
  return ethereum && typeof ethereum.request === 'function' ? ethereum : null
}
