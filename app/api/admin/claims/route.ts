import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// The admin panel previously had no visibility into claims at all (the
// LGX exclusive-deal redemption codes) - the only way to check one was a
// direct database query. Mirrors /api/admin/reservations's shape, but
// merges restaurant/deal/diner details in code rather than via PostgREST
// embedding, since claims.user_id points at auth.users (no direct FK to
// profiles for PostgREST to embed through).
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const { data: claims, error } = await supabaseAdmin
      .from('claims')
      .select('id, code, party_size, status, claim_date, created_at, user_id, restaurant_id, deal_id')
      .order('created_at', { ascending: false })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const restaurantIds = Array.from(new Set((claims || []).map(c => c.restaurant_id).filter(Boolean)))
    const dealIds = Array.from(new Set((claims || []).map(c => c.deal_id).filter(Boolean)))
    const userIds = Array.from(new Set((claims || []).map(c => c.user_id).filter(Boolean)))

    const [{ data: restaurants }, { data: deals }, { data: profiles }] = await Promise.all([
      restaurantIds.length ? supabaseAdmin.from('restaurants').select('id, name').in('id', restaurantIds) : Promise.resolve({ data: [] as any[] }),
      dealIds.length ? supabaseAdmin.from('deals').select('id, special, price').in('id', dealIds) : Promise.resolve({ data: [] as any[] }),
      userIds.length ? supabaseAdmin.from('profiles').select('id, name, email').in('id', userIds) : Promise.resolve({ data: [] as any[] }),
    ])

    const restaurantById = new Map((restaurants || []).map(r => [r.id, r]))
    const dealById = new Map((deals || []).map(d => [d.id, d]))
    const profileById = new Map((profiles || []).map(p => [p.id, p]))

    const enriched = (claims || []).map(c => ({
      id: c.id,
      code: c.code,
      display_code: `${c.code}-${c.party_size}`,
      party_size: c.party_size,
      status: c.status,
      claim_date: c.claim_date,
      created_at: c.created_at,
      restaurant_name: restaurantById.get(c.restaurant_id)?.name || '(restaurant no longer listed)',
      deal_special: dealById.get(c.deal_id)?.special || null,
      deal_price: dealById.get(c.deal_id)?.price ?? null,
      diner_name: profileById.get(c.user_id)?.name || '(deleted account)',
      diner_email: profileById.get(c.user_id)?.email || null,
    }))

    return NextResponse.json({ ok: true, claims: enriched })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
