import { openRoute } from '@/modules/public/http'
import { live } from '@/modules/health/service'
export const runtime = 'nodejs'
export const GET = openRoute(live, false)
