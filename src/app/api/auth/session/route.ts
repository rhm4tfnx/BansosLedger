import { NextResponse } from 'next/server'
import { connectDatabase } from '@/lib/db/connection'
import { backendError } from '@/lib/service-error'
import { getVerifiedServerSession } from '@/lib/auth/session'
export const runtime = 'nodejs'
export async function GET() {
  try {
    await connectDatabase()
    const session = await getVerifiedServerSession()
    if (session?.mustChangePassword) return NextResponse.json({ error: 'PASSWORD_CHANGE_REQUIRED', message: 'Ganti kata sandi terlebih dahulu.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json({ role: session?.role ?? null, boundWalletAddress: session?.boundWalletAddress ?? null, walletVerified: session?.walletVerified ?? false }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return backendError(error) }
}
