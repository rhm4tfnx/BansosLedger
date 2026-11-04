// TODO(PRD §12)
import { route } from '@/modules/domain/http'
import { searchByNik } from '@/modules/recipients/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('recipient:read', searchByNik, true)

