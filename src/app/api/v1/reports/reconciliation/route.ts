import { route } from '@/modules/domain/http'
import { report } from '@/modules/chain/reconcile'
export const runtime = 'nodejs'
export const GET = route('report:read', report)
