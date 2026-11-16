import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.APP_BASE_URL || 'https://bansosledger.icu').replace(/\/$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/api', '/login'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
