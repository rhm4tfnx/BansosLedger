import { route } from '@/modules/domain/http'
import { detail, update } from '@/modules/programs/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('program:read', detail)
export const PATCH = route('program:update', update, true)
