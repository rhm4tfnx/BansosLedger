import { route } from '@/modules/domain/http'
import { reveal } from '@/modules/recipients/service'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const POST = route('recipient:reveal-nik', reveal, true)
