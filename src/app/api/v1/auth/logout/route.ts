import { POST as logout } from '@/app/api/auth/logout/route'
import { asV1 } from '@/lib/auth/v1'
export const runtime = 'nodejs'
export const POST = (request: Request) => asV1(logout, request)
