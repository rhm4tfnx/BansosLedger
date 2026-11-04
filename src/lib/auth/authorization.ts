import 'server-only'
import { NextResponse } from 'next/server'
import { getVerifiedServerSession } from './session'
import { hasPermission } from '@/lib/rbac'
import type { Permission } from '@/types/rbac'
import { backendError } from '@/lib/service-error'
import { connectDatabase } from '@/lib/db/connection'

export async function requirePermission(permission: Permission) {
  let session
  try { await connectDatabase(); session = await getVerifiedServerSession() }
  catch (error) { return { session: null, response: backendError(error) } }
  if (session?.mustChangePassword) return { session: null, response: NextResponse.json({ error: 'PASSWORD_CHANGE_REQUIRED', message: 'Ganti kata sandi terlebih dahulu.' }, { status: 403 }) }
  if (!session) return { session: null, response: NextResponse.json({ error: 'UNAUTHENTICATED', message: 'Sesi autentikasi tidak ditemukan atau tidak valid.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } }) }
  if (!hasPermission(session.role, permission)) return { session: null, response: NextResponse.json({ error: 'FORBIDDEN_PERMISSION', role: session.role, requiredPermission: permission, message: 'Akses ditolak.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } }) }
  return { session, response: null }
}
// Status must be loaded from the repository, never trusted from the request body.
export function assertDraftMutable(status: string) {
  return status === 'DRAFT' ? null : NextResponse.json({ error: 'IMMUTABLE_RECORD', message: 'Hanya data DRAFT yang dapat diubah atau dihapus sementara.' }, { status: 409 })
}
export function integrationUnavailable() { return NextResponse.json({ error: 'INTEGRATION_NOT_CONFIGURED', message: 'Penyimpanan, verifikasi receipt Besu, atau autentikasi wallet belum dihubungkan.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
