import { openRoute } from '@/modules/public/http'
import { search } from '@/modules/explorer/service'
export const runtime = 'nodejs'
export const GET = openRoute(search)
