import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Mona_Sans, Geist_Mono } from 'next/font/google'
import { QueryProvider } from '@/components/providers/query-provider'
import '@/styles/globals.css'

const monaSans = Mona_Sans({ subsets: ['latin'], variable: '--font-mona-sans' })
const monoSpace = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-space' })

export const metadata: Metadata = {
  title: 'BansosLedger — Transparansi Bantuan Sosial',
  description:
    'Kenali BansosLedger, sistem transparansi penyaluran bantuan sosial berbasis blockchain. Terbuka, terlacak, dan untuk masyarakat Indonesia.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#e9edec',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className={`${monaSans.variable} ${monoSpace.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
