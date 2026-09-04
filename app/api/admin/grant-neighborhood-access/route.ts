import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

// Grants an editor access to every restaurant in one neighborhood at once -
// for a VA working through the directory a neighborhood at a time (e.g.
// "give Olga everything in Midtown").
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
    console.error('grant-neighborhood-access restaurant fetch error:', restErr)
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
    console.error('grant-neighborhood-access upsert error:', error)
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: rows.length })
}
