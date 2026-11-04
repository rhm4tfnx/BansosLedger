import 'server-only'
import { getAddress } from 'ethers'
import { contractRead } from '@/modules/chain/network'
import { getEnv } from '@/lib/env'
import { ServiceUnavailableError } from '@/lib/service-error'
export async function expectedWallet() {
  try {
    const address = getEnv('NEXT_PUBLIC_CONTRACT_ADDRESS')
    if (!address) return getAddress(process.env.NEXT_PUBLIC_AUTHORIZED_KELURAHAN_WALLET || '')
    return getAddress(String(await contractRead('authorizedWallet')))
  } catch { throw new ServiceUnavailableError() }
}
