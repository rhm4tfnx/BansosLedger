export const runtime = 'nodejs'

// Internal authenticated read endpoint. Append-only events must originate from server mutations.
export async function GET() {
  return Response.json({ error: 'INTEGRATION_NOT_CONFIGURED', message: 'Autentikasi dan repositori audit belum dihubungkan.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
