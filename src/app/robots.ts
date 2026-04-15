import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/setup', '/auth'],
      },
    ],
    sitemap: 'https://www.oracle-bet.fr/sitemap.xml',
    host: 'https://www.oracle-bet.fr',
  }
}
