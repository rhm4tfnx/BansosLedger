export const runtime = 'nodejs'

// Compare canonical off-chain commitment with contract state; never trust client SUCCESS flags.
export async function POST() {
  return Response.json({ error: 'INTEGRATION_NOT_CONFIGURED', message: 'Sumber data dan kontrak verifikasi belum dihubungkan.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
