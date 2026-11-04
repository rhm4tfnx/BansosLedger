import { openRoute } from '@/modules/public/http'
import { blocks } from '@/modules/explorer/service'
export const runtime = 'nodejs'
export const GET = openRoute(blocks)
