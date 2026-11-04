import { route } from '@/modules/domain/http'
import { submitted } from '@/modules/disbursements/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const PATCH = route('transaction:sign', submitted, true)
