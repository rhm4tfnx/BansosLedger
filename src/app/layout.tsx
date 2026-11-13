import type { Metadata, Viewport } from 'next'
import { Mona_Sans, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
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
        url: '/favicon.ico',
        sizes: '16x16 32x32 48x48',
      },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon.ico',
    apple: [
      {
        url: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#e9edec',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="id" data-nonce={nonce ? 'present' : undefined}>
      <body className={`${monaSans.variable} ${monoSpace.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
