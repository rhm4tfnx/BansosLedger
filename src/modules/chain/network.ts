import 'server-only'
import { ledgerInterface } from '@/lib/blockchain/abi'
import { Settings } from '@/lib/db/models'
import { connectDatabase } from '@/lib/db/connection'
import { chainConfig, provider, readChain } from './config'
export type NetworkStatus = { status: 'Normal' | 'Terganggu' | 'Berhenti'; latestBlock: number; timestamp: number; ageSeconds: number; validatorCount: number | null; validators: { address: string; institution: string | null }[] }
let cache: { key: string; until: number; value: NetworkStatus } | undefined
export async function networkStatus(): Promise<NetworkStatus> {
  const config = chainConfig(), key = `${config.chainId}:${config.address}:${config.url}`
  if (cache?.key === key && cache.until > Date.now()) return cache.value
  await connectDatabase()
  const rpc = provider()
  const [block, settings] = await Promise.all([readChain(() => rpc.getBlock('latest')), Settings.findOne({ chainId: config.chainId, contractAddress: config.address }).lean()])
  if (!block) throw new Error('Invalid network response')
  const savedValidators = (settings?.validators ?? []).flatMap(item => item.address ? [{ address: item.address, institution: item.institution ?? null }] : [])
  let validators = savedValidators
  let validatorCount: number | null = savedValidators.length || null
  try {
    const addresses: unknown = await readChain(() => rpc.send('qbft_getValidatorsByBlockNumber', ['latest']), 0)
    if (!Array.isArray(addresses) || addresses.some(address => typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address))) throw new Error('Invalid validator response')
    validators = addresses.map((address: string) => ({ address, institution: savedValidators.find(item => item.address.toLowerCase() === address.toLowerCase())?.institution ?? null }))
    validatorCount = validators.length
  } catch { /* Public ETH/NET/WEB3 nodes need not expose the QBFT namespace. */ }
  const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000) - block.timestamp)
  const period = settings?.blockPeriodSeconds && settings.blockPeriodSeconds > 0 ? settings.blockPeriodSeconds : 5
  const value: NetworkStatus = { status: ageSeconds > 120 ? 'Berhenti' : ageSeconds > 3 * period ? 'Terganggu' : 'Normal', latestBlock: block.number, timestamp: block.timestamp, ageSeconds, validatorCount, validators }
  cache = { key, until: Date.now() + 5000, value }; return value
}
export async function contractRead(name: 'authorizedWallet' | 'owner' | 'paused', blockTag: number | 'latest' = 'latest') {
  const { address } = chainConfig(), rpc = provider()
  const result = await readChain(() => rpc.call({ to: address, data: ledgerInterface.encodeFunctionData(name), blockTag }))
  return ledgerInterface.decodeFunctionResult(name, result)[0] as string | boolean
}
