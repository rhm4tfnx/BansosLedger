import { route } from '@/modules/domain/http'
import { intent } from '@/modules/programs/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('transaction:sign', intent('register'), true)
