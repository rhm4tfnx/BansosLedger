import { bind } from '@/modules/auth/service'
import { asV1 } from '@/lib/auth/v1'
export const runtime = 'nodejs'
export const POST = (request: Request) => asV1(bind, request)
