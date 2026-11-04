// TODO(PRD §12)
import { route } from '@/modules/domain/http'
import { preflight } from '@/modules/disbursements/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('disbursement:create', preflight, true)

