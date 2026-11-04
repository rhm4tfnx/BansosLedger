import { route } from '@/modules/domain/http'
import { realization } from '@/modules/reports/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('report:read', realization)
