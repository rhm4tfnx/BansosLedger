import { route } from '@/modules/domain/http'
import { list, create } from '@/modules/disbursements/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('disbursement:read', list)
export const POST = route('disbursement:create', create, true)
