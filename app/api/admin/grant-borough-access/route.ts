import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'
import { NEIGHBORHOOD_GROUPS } from '../../../../lib/neighborhoods'

// Grants an editor access to every restaurant in every neighborhood of one
// borough at once - for handing someone a whole borough (e.g. "give Olga
// all of Queens") without granting neighborhood by neighborhood.
export async function POST(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { user_id, borough } = await req.json()
  if (!user_id || !borough) {
    return NextResponse.json({ error: 'user_id and borough are required' }, { status: 400 })
  }

  const group = NEIGHBORHOOD_GROUPS.find(g => g.borough === borough)
  if (!group) {
    return NextResponse.json({ error: 'Unknown borough' }, { status: 400 })
  }

  const { data: restaurants, error: restErr } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .in('neighborhood', group.names)
  if (restErr) {
    console.error('grant-borough-access restaurant fetch error:', restErr)
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 })
  }

  const rows = (restaurants || []).map(r => ({ user_id, restaurant_id: r.id }))
  if (rows.length === 0) {
    return NextResponse.json({ success: true, count: 0 })
  }

  const { error } = await supabaseAdmin
    .from('restaurant_permissions')
    .upsert(rows, { onConflict: 'user_id,restaurant_id' })

  if (error) {
    console.error('grant-borough-access upsert error:', error)
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: rows.length })
}
