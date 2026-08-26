import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin'

// claims is a sensitive table (real redemption codes) with no client-facing
// RLS read access, so this route reads it server-side with the service
// role key and returns only this user's own rows.
//
// Deliberately avoids PostgREST's embedded-resource select syntax
// (`.select('deals(special, price)')`) — that requires a declared foreign
// key relationship between claims and deals/restaurants, which this schema
// was never confirmed to have. Fetching claims plain and stitching in the
// deal/restaurant names separately works regardless.
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data: userData, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const { data: claimRows, error } = await supabase
      .from('claims')
      .select('*')
      .eq('user_id', userData.user.id)

    if (error) {
      console.error('My claims fetch error:', error)
      return NextResponse.json({ error: 'Failed to load claims' }, { status: 500 })
    }

    const rows = claimRows || []
    const dealIds = Array.from(new Set(rows.map((r: any) => r.deal_id).filter(Boolean)))
    const restaurantIds = Array.from(new Set(rows.map((r: any) => r.restaurant_id).filter(Boolean)))

    const [dealsRes, restaurantsRes] = await Promise.all([
      dealIds.length
        ? supabase.from('deals').select('id, special, price').in('id', dealIds)
        : Promise.resolve({ data: [] as any[] }),
      restaurantIds.length
        ? supabase.from('restaurants').select('id, name').in('id', restaurantIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const dealById = new Map((dealsRes.data || []).map((d: any) => [d.id, d]))
    const restaurantById = new Map((restaurantsRes.data || []).map((r: any) => [r.id, r]))

    const claims = rows
      .map((c: any) => {
        const deal = dealById.get(c.deal_id)
        const restaurant = restaurantById.get(c.restaurant_id)
        return {
          display_code: `${c.code}-${c.party_size}`,
          party_size: c.party_size,
          created_at: c.created_at ?? null,
          restaurant_name: restaurant?.name ?? null,
          special: deal?.special ?? null,
          price: deal?.price ?? null,
        }
      })
      .sort((a: any, b: any) => {
        if (!a.created_at || !b.created_at) return 0
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    return NextResponse.json({ claims })
  } catch (err) {
    console.error('My claims error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
