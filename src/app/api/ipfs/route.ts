export const runtime = 'nodejs'

// Phase 2: authorize operator + PENDING ownership, validate file, upload to Pinata, persist CID.
export async function POST() {
  return Response.json({ error: 'INTEGRATION_NOT_CONFIGURED', message: 'Autentikasi dan penyimpanan bukti IPFS belum dihubungkan.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
