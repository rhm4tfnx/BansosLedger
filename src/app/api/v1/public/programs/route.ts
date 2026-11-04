import { openRoute } from '@/modules/public/http'
import { programs } from '@/modules/public/service'
export const runtime = 'nodejs'
export const GET = openRoute(programs)
