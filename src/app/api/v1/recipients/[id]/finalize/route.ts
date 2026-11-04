import { route } from '@/modules/domain/http'
import { finalize } from '@/modules/recipients/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('recipient:update', finalize, true)
