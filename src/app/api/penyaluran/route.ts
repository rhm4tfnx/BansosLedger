import { NextResponse } from 'next/server'
import { requirePermission, integrationUnavailable } from '@/lib/auth/authorization'
export const runtime = 'nodejs'

// Phase 1: verified operator session -> validated payload -> idempotent MongoDB PENDING.
export async function POST() {
  const auth = await requirePermission('disbursement:create')
  if (auth.response) return auth.response
  return integrationUnavailable()
}
// Never trust a client-supplied sender or SUCCESS flag. A chain receipt verifier is required.
export async function PATCH() {
  const auth = await requirePermission('transaction:sign')
  if (auth.response) return auth.response
  if (!auth.session?.walletVerified || !auth.session.boundWalletAddress) return NextResponse.json({ error: 'WALLET_NOT_VERIFIED', message: 'Verifikasi wallet sesi diperlukan.' }, { status: 403 })
  // No SUCCESS write is possible until receipt.from, chain, contract, event and finality
  // are verified against session.boundWalletAddress by a trusted Besu adapter.
  return integrationUnavailable()
}
