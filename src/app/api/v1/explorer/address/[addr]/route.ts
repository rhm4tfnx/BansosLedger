import { openRoute } from '@/modules/public/http'
import { addressDetails } from '@/modules/explorer/service'
export const runtime = 'nodejs'
export const GET = openRoute(addressDetails)
