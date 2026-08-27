import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

export async function POST(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { user_id, restaurant_id } = await req.json()
  if (!user_id || !restaurant_id) {
    return NextResponse.json({ error: 'user_id and restaurant_id are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('restaurant_permissions')
    .delete()
    .eq('user_id', user_id)
    .eq('restaurant_id', restaurant_id)

  if (error) {
    console.error('revoke-access error:', error)
    return NextResponse.json({ error: 'Failed to revoke access' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
