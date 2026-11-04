import { route } from '@/modules/domain/http'
import { confirm } from '@/modules/programs/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('program:update', confirm, true)
