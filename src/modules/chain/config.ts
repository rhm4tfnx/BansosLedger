import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { FetchRequest, JsonRpcProvider } from 'ethers'
export const chainDeadline = new AsyncLocalStorage<number>()
export function assertDeadline() { if (Date.now() >= (chainDeadline.getStore() ?? Infinity)) throw new DomainError(503, 'DEADLINE_EXCEEDED', 'Batas waktu rekonsiliasi tercapai.') }
import { getEnv } from '@/lib/env'
import { DomainError } from '@/modules/domain/http'
let cached: { key: string; provider: JsonRpcProvider } | undefined
export function chainConfig() {
  const url = getEnv('RPC_URL_SERVER'), address = getEnv('NEXT_PUBLIC_CONTRACT_ADDRESS'), chainId = getEnv('NEXT_PUBLIC_CHAIN_ID')
  if (!url || !address || !chainId) throw new DomainError(503, 'CHAIN_NOT_CONFIGURED', 'Blockchain belum dikonfigurasi.')
  return { url, address: address.toLowerCase(), chainId }
}
export function provider() {
  const config = chainConfig(), apiKey = getEnv('RPC_API_KEY')
  const key = `${config.url}:${config.chainId}:${apiKey ?? ''}`
  if (cached?.key !== key) {
    const request = new FetchRequest(config.url)
    request.timeout = 10000
    request.retryFunc = async () => false
    if (apiKey) request.setHeader('X-API-Key', apiKey)
    cached?.provider.destroy()
    cached = { key, provider: new JsonRpcProvider(request, config.chainId, { staticNetwork: true, batchMaxCount: 1 }) }
  }
  return cached.provider
}
export async function readChain<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      assertDeadline()
      const remaining = (chainDeadline.getStore() ?? Infinity) - Date.now()
      if (!Number.isFinite(remaining)) return await operation()
      let timer: ReturnType<typeof setTimeout> | undefined
      try { return await Promise.race([operation(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new DomainError(503, 'DEADLINE_EXCEEDED', 'Batas waktu rekonsiliasi tercapai.')), remaining) })]) }
      finally { if (timer) clearTimeout(timer) }
    } catch (error) {
      if (error instanceof DomainError) throw error
      const code = (error as { code?: string })?.code
      if (code === 'CALL_EXCEPTION' || attempt >= Math.min(2, retries)) throw error
    }
  }
}
