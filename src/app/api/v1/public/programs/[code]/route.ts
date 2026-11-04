import { openRoute } from '@/modules/public/http'
import { program } from '@/modules/public/service'
export const runtime = 'nodejs'
export const GET = openRoute(program)
