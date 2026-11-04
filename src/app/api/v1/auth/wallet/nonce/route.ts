import { POST as nonce } from '@/app/api/auth/wallet/route'
import { asV1 } from '@/lib/auth/v1'
export const runtime = 'nodejs'
export const POST = (request: Request) => asV1(nonce, request)
