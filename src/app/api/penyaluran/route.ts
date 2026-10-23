export const runtime = 'nodejs'

// Phase 1: verified operator session -> validated payload -> idempotent MongoDB PENDING.
// Phase 3: verify Besu receipt + commitment/CID before atomically recording SUCCESS + TxID.
export async function POST() {
  return Response.json({ error: 'INTEGRATION_NOT_CONFIGURED', message: 'Autentikasi, MongoDB, dan kontrak Besu belum dihubungkan.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
export async function PATCH() {
  return POST()
}
