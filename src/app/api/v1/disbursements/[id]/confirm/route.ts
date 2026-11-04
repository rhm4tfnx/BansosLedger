import { route } from '@/modules/domain/http'
import { confirm } from '@/modules/disbursements/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('disbursement:create', confirm, true)
