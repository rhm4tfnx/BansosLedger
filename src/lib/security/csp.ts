export interface BuildCspOptions {
  nonce: string
  isDev?: boolean
  rpcUrl?: string
}

export function generateCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

export function getCspHeaderName(enforce = process.env.CSP_ENFORCE === 'true'): string {
  return enforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'
}

export function buildCspHeader({
  nonce,
  isDev = process.env.NODE_ENV === 'development',
  rpcUrl = process.env.NEXT_PUBLIC_RPC_URL,
}: BuildCspOptions): string {
  let rpcOrigin = ''
  if (rpcUrl) {
    try {
      rpcOrigin = new URL(rpcUrl).origin
    } catch {
      rpcOrigin = ''
    }
  }

  const connectSources = ["'self'", 'https:', 'wss:']
  if (isDev) {
    connectSources.push('http:', 'ws:')
  }
  if (rpcOrigin && !connectSources.includes(rpcOrigin)) {
    connectSources.push(rpcOrigin)
  }

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    'frame-src https://challenges.cloudflare.com',
    `connect-src ${connectSources.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]

  return directives.join('; ')
}

