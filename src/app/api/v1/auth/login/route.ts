import { POST as login } from '@/app/api/auth/login/route'
import { asV1 } from '@/lib/auth/v1'
export const runtime = 'nodejs'
export const POST = (request: Request) => asV1(login, request)
