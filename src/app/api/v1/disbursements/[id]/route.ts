import { route } from '@/modules/domain/http'
import { detail, softDelete } from '@/modules/disbursements/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('disbursement:read', detail)
export const DELETE = route('disbursement:create', softDelete, true)
