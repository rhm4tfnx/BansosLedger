import { openRoute } from '@/modules/public/http'
import { contract } from '@/modules/explorer/service'
export const runtime = 'nodejs'
export const GET = openRoute(contract)
