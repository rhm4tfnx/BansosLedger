import { requirePermission, integrationUnavailable } from '@/lib/auth/authorization'
export const runtime = 'nodejs'
export async function GET() {
  const auth = await requirePermission('audit:read')
  if (auth.response) return auth.response
  return integrationUnavailable()
}
export async function POST() {
  const auth = await requirePermission('dashboard:read')
  if (auth.response) return auth.response
  return integrationUnavailable()
}
