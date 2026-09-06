import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /lookup is no longer blocked here — it now carries a noindex tag, so
      // Google should be able to crawl it, see the tag, and drop it cleanly.
      disallow: ['/admin', '/api/'],
    },
    sitemap: 'https://www.letsgetlunch.nyc/sitemap.xml',
  }
}
