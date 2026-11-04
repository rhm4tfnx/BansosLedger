import { openRoute } from '@/modules/public/http'
import { reconcile } from '@/modules/chain/reconcile'
export const runtime = 'nodejs'
export const maxDuration = 60
export const POST = openRoute(reconcile, false)
