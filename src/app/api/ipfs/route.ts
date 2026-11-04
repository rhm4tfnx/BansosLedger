import { requirePermission, integrationUnavailable } from '@/lib/auth/authorization'
export const runtime = 'nodejs'
export async function POST() {
  const auth = await requirePermission('evidence:upload')
  if (auth.response) return auth.response
  return integrationUnavailable()
}
