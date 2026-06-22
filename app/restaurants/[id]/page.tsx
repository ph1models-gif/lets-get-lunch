import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import RestaurantClient from './RestaurantClient'

const BASE = 'https://www.letsgetlunch.nyc'

function sb() {
  return createClient(
    'https://iqurlwenkozmxoyymnkg.supabase.co',
    'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4'
  )
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Lunch Deal — NYC Prix-Fixe | Let's Get Lunch",
    description: 'Find the best prix-fixe lunch deals across NYC. Real tables, real service, all under $35.',
    robots: { index: false, follow: false },
  }
  try {
    const supabase = sb()
    const { data: r } = await supabase
      .from('restaurants')
      .select('name, neighborhood, cuisine, bio')
      .eq('id', params.id)
      .eq('is_active', true)
      .single()
    if (!r || !r.name) return fallback

    const { data: d } = await supabase
      .from('deals')
      .select('special, price, days')
      .eq('restaurant_id', params.id)
      .single()

    const canonical = `${BASE}/restaurants/${params.id}`
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

export default function Page() {
  return <RestaurantClient />
}
