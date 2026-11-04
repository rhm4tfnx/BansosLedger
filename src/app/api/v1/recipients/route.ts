import { route } from '@/modules/domain/http'
import { list, create } from '@/modules/recipients/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('recipient:read', list)
export const POST = route('recipient:create', create, true)
