import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE = 'https://www.letsgetlunch.nyc'

// Revalidate the sitemap periodically so new listings appear without a redeploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    'https://iqurlwenkozmxoyymnkg.supabase.co',
    'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4'
  )

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/list-your-restaurant`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ]

  let restaurantPages: MetadataRoute.Sitemap = []
  try {
    const { data } = await supabase
      .from('restaurants')
      .select('id, created_at')
      .eq('is_active', true)
    if (data) {
      restaurantPages = data.map((r) => ({
        url: `${BASE}/restaurants/${r.id}`,
        lastModified: r.created_at ? new Date(r.created_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
    }
  } catch (e) {
    // If the DB is unreachable at build time, still return the static pages
    // so the sitemap is never empty/broken.
  }

  return [...staticPages, ...restaurantPages]
}
