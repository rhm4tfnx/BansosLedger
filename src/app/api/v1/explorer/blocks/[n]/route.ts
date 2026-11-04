import { openRoute } from '@/modules/public/http'
import { block } from '@/modules/explorer/service'
export const runtime = 'nodejs'
export const GET = openRoute(block)
