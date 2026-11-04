import { NextResponse } from 'next/server'
import { requireV1, problem } from '@/lib/auth/v1'
import { Users } from '@/lib/db/models'
import { toAuthMeDto } from '@/modules/auth/dto'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireV1()
  if (auth.response) return auth.response
  const user = await Users.findById(auth.session.userId).lean()
  if (!user) return problem(401, 'UNAUTHENTICATED', 'Pengguna tidak ditemukan.')
  return NextResponse.json(toAuthMeDto(user, auth.session), { headers: { 'Cache-Control': 'no-store' } })
}
