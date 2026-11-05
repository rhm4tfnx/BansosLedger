if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW === 'true'
) {
  throw new Error(
    'NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW tidak diizinkan pada build production (NODE_ENV=production).',
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@node-rs/argon2', 'sharp', 'mongoose'],
  async headers() {
    return [
      { source: '/cek-bansos', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      ['/masuk', '/login'],
      ['/cek-status', '/cek-bansos'],
      ['/dashboard/program', '/dashboard/bantuan'],
      ['/dashboard/log', '/dashboard/log-aktivitas'],
      ['/profil', '/dashboard/pengaturan'],
      ['/explorer/blok/:n', '/explorer/block/:n'],
      ['/explorer/alamat/:a', '/explorer/address/:a'],
    ].map(([source, destination]) => ({ source, destination, permanent: false }))
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
