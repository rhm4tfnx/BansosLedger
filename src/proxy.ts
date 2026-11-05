import { NextResponse, type NextRequest } from 'next/server'
import { buildCspHeader, generateCspNonce, getCspHeaderName } from '@/lib/security/csp'

export function proxy(request: NextRequest) {
  const nonce = generateCspNonce()
  const cspHeaderName = getCspHeaderName(process.env.CSP_ENFORCE === 'true')
  const cspHeaderValue = buildCspHeader({ nonce })

  const pathname = request.nextUrl.pathname
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/')

  if (isDashboardRoute && !request.cookies.get('bansos_session_token')?.value) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    const redirectResponse = NextResponse.redirect(url, 307)
    redirectResponse.headers.set(cspHeaderName, cspHeaderValue)
    redirectResponse.headers.set('x-nonce', nonce)
    return redirectResponse
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set(cspHeaderName, cspHeaderValue)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set(cspHeaderName, cspHeaderValue)
  response.headers.set('x-nonce', nonce)

  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}

