import 'server-only'
import { z } from 'zod'
import { asV1, problem } from '@/lib/auth/v1'
import { requestContext } from '@/lib/auth/request-origin'
import { rateLimit } from '@/lib/ratelimit'
import { DomainError, type RouteContext } from '@/modules/domain/http'
export function openRoute(handler: (request: Request, params: Record<string, string>) => Promise<Response>, limited = true) {
  return (request: Request, context?: RouteContext) => asV1(async () => {
    try {
      if (limited) {
        const result = await rateLimit(`public:${requestContext(request).ip}`, 60, 60)
        if (!result.ok) throw new DomainError(429, 'RATE_LIMIT', 'Terlalu banyak permintaan.', result.retryAfter)
      }
      return await handler(request, context ? await context.params : {})
    } catch (error) {
      if (error instanceof z.ZodError) return problem(400, 'VALIDATION_ERROR', 'Parameter tidak valid.')
      if (error instanceof DomainError) { const response = problem(error.status, error.code, error.message); if (error.retryAfter) response.headers.set('Retry-After', String(error.retryAfter)); return response }
      throw error
    }
  }, request)
}
