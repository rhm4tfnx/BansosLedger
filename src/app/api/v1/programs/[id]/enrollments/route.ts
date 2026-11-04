import { route } from '@/modules/domain/http'
import { enroll } from '@/modules/programs/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('program:update', enroll, true)
