import { ready } from '@/modules/health/service'
export const runtime = 'nodejs'
export const GET = (request: Request) => ready(request)
