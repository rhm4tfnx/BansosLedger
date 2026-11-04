import { requirePermission, integrationUnavailable } from '@/lib/auth/authorization'
export const runtime = 'nodejs'
export async function POST() {
  const auth = await requirePermission('verification:execute')
  if (auth.response) return auth.response
  return integrationUnavailable()
}
