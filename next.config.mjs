/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      { source: '/cek-bansos', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/:path*', headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https: wss:; object-src 'none'; base-uri 'self'" },
      ] },
    ]
  },
  async redirects() {
    return [
      ['/masuk', '/login'], ['/cek-status', '/cek-bansos'],
      ['/dashboard/program', '/dashboard/bantuan'], ['/dashboard/log', '/dashboard/log-aktivitas'],
      ['/profil', '/dashboard/pengaturan'], ['/explorer/blok/:n', '/explorer/block/:n'],
      ['/explorer/alamat/:a', '/explorer/address/:a'],
    ].map(([source, destination]) => ({ source, destination, permanent: false }))
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
