import { openRoute } from '@/modules/public/http'
import { statusCheck } from '@/modules/public/service'
export const runtime = 'nodejs'
export const POST = openRoute(statusCheck, false)
