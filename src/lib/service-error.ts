import 'server-only'
import { NextResponse } from 'next/server'
export class ServiceUnavailableError extends Error {
  constructor() { super('Layanan belum dikonfigurasi.'); this.name = 'ServiceUnavailableError' }
}
export function unavailableResponse() {
  return NextResponse.json({ message: 'Layanan belum dikonfigurasi.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
export function backendError(error: unknown) {
  if (error instanceof ServiceUnavailableError) return unavailableResponse()
  return NextResponse.json({ message: 'Layanan sementara tidak tersedia.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
