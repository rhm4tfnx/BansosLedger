import { route } from '@/modules/domain/http'
import { retry } from '@/modules/disbursements/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('disbursement:create', retry, true)
