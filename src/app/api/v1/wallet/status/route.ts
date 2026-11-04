import { route } from '@/modules/domain/http'
import { wallet } from '@/modules/reports/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('wallet:read', wallet)
