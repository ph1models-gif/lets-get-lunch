import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

// Grants an editor access to every current restaurant in one request -
// for a VA whose job is reviewing the whole directory (e.g. hiding
// listings that dropped their lunch special), checking each box one at a
// time in /admin/permissions doesn't scale.
export async function POST(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { user_id } = await req.json()
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const { data: restaurants, error: restErr } = await supabaseAdmin.from('restaurants').select('id')
  if (restErr) {
    console.error('grant-all-access restaurant fetch error:', restErr)
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
    console.error('grant-all-access upsert error:', error)
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: rows.length })
}
