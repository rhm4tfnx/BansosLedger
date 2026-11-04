import { route } from '@/modules/domain/http'
import { withdraw } from '@/modules/evidence/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('evidence:upload', withdraw, true)
