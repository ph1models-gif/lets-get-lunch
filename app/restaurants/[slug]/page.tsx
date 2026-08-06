import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'
import { permanentRedirect } from 'next/navigation'
import RestaurantClient from './RestaurantClient'

const BASE = 'https://www.letsgetlunch.nyc'

function sb() {
  return createClient(
    'https://iqurlwenkozmxoyymnkg.supabase.co',
    'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4'
  )
}

// Resolves either a current slug or a legacy UUID to the same row. Shared
// (via React's cache()) between generateMetadata and the page component so
// a single request only ever does one DB round trip for the happy path.
const getRestaurant = cache(async (slugOrId: string) => {
  const supabase = sb()
  const { data: bySlug } = await supabase
    .from('restaurants')
    .select('id, slug, name, neighborhood, cuisine, bio')
    .eq('slug', slugOrId)
    .eq('is_active', true)
    .maybeSingle()
  if (bySlug) return bySlug

  // Legacy /restaurants/[uuid] link — resolve it so the page component can 308 redirect.
  const { data: byId } = await supabase
    .from('restaurants')
    .select('id, slug, name, neighborhood, cuisine, bio')
    .eq('id', slugOrId)
    .eq('is_active', true)
    .maybeSingle()
  return byId
})

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Lunch Special — NYC Prix-Fixe | Let's Get Lunch",
    description: 'Discover great prix-fixe lunch specials at hundreds of NYC restaurants. Real sit-down tables, fast service, most under $35. Find your lunch today.',
    robots: { index: false, follow: false },
  }
  try {
    const r = await getRestaurant(params.slug)
    if (!r || !r.name) return fallback

    const supabase = sb()
    const { data: d } = await supabase
      .from('deals')
      .select('special, price, days')
      .eq('restaurant_id', r.id)
      .single()

    const canonical = `${BASE}/restaurants/${r.slug}`
    const loc = r.neighborhood ? ` in ${r.neighborhood}` : ''
    const priceStr = d && (d.price || d.price === 0) ? `$${d.price}` : ''

    // Title: "COQODAQ Lunch — $24 Prix-Fixe in Flatiron | Let's Get Lunch"
    const titleBits = [r.name, 'Lunch']
    let title = titleBits.join(' ')
    if (priceStr) title += ` — ${priceStr} Prix-Fixe`
    title += `${loc} | Let's Get Lunch`

    // Description: real deal details
    let description = ''
    if (d && d.special) {
      description = `${r.name}'s prix-fixe lunch${loc}: ${d.special}`
      if (priceStr) description += ` for ${priceStr}`
      description += '. Reserve free on Let\'s Get Lunch.'
    } else {
      const cz = r.cuisine ? `${r.cuisine} ` : ''
      description = `${r.name} — ${cz}prix-fixe lunch${loc}. Reserve free on Let\'s Get Lunch.`
    }
    if (description.length > 160) description = description.slice(0, 157) + '...'

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: "Let's Get Lunch",
        type: 'website',
      },
    }
  } catch {
    return fallback
  }
}

export default async function Page({ params }: { params: { slug: string } }) {
  const r = await getRestaurant(params.slug)
  if (r && r.slug && r.slug !== params.slug) {
    permanentRedirect(`/restaurants/${r.slug}`)
  }
  return <RestaurantClient />
}
