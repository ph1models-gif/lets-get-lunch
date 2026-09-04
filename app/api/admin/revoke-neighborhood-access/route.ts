import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

export async function POST(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { user_id, neighborhood } = await req.json()
  if (!user_id || !neighborhood) {
    return NextResponse.json({ error: 'user_id and neighborhood are required' }, { status: 400 })
  }

  const { data: restaurants, error: restErr } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('neighborhood', neighborhood)
  if (restErr) {
    console.error('revoke-neighborhood-access restaurant fetch error:', restErr)
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
    console.error('revoke-neighborhood-access error:', error)
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
