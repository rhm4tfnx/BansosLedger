import { route } from '@/modules/domain/http'
import { verify } from '@/modules/audit/api'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('audit:read', verify)
