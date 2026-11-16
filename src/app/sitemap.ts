import type { MetadataRoute } from 'next'

const PUBLIC_ROUTES = ['/', '/transparansi', '/program', '/cara-verifikasi', '/explorer'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.APP_BASE_URL || 'https://bansosledger.icu').replace(/\/$/, '')
  const lastModified = new Date()

  return PUBLIC_ROUTES.map((route) => ({
    url: route === '/' ? baseUrl : `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === '/' || route === '/transparansi' ? 'hourly' : 'daily',
    priority: route === '/' ? 1 : 0.8,
  }))
}
