import { openRoute } from '@/modules/public/http'
import { summary } from '@/modules/public/service'
export const runtime = 'nodejs'
export const GET = openRoute(summary)
