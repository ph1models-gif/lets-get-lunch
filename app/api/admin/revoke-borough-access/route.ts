import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'
import { NEIGHBORHOOD_GROUPS } from '../../../../lib/neighborhoods'

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
    console.error('revoke-borough-access restaurant fetch error:', restErr)
    return NextResponse.json({ error: 'Failed to load restaurants' }, { status: 500 })
  }

  const ids = (restaurants || []).map(r => r.id)
  if (ids.length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabaseAdmin
    .from('restaurant_permissions')
    .delete()
    .eq('user_id', user_id)
    .in('restaurant_id', ids)

  if (error) {
    console.error('revoke-borough-access error:', error)
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
