import { route } from '@/modules/domain/http'
import { enroll, listEnrollments } from '@/modules/programs/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const GET = route('program:read', listEnrollments)
export const POST = route('program:update', enroll, true)
