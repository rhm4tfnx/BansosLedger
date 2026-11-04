import { openRoute } from '@/modules/public/http'
import { transaction } from '@/modules/explorer/service'
export const runtime = 'nodejs'
export const GET = openRoute(transaction)
