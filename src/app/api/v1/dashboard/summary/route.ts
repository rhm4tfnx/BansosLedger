import { route } from '@/modules/domain/http'
import { dashboard } from '@/modules/reports/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('dashboard:read', dashboard)
