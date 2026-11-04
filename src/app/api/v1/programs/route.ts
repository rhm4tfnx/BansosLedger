import { route } from '@/modules/domain/http'
import { list, create } from '@/modules/programs/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('program:read', list)
export const POST = route('program:create', create, true)
