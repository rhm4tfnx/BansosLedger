import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (!request.cookies.get('bansos_session_token')?.value) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url, 307)
  }
  return NextResponse.next()
}
export const config = { matcher: ['/dashboard/:path*', '/dashboard'] }
