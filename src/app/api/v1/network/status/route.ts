import { openRoute } from '@/modules/public/http'
import { network } from '@/modules/explorer/service'
export const runtime = 'nodejs'
export const GET = openRoute(network)
