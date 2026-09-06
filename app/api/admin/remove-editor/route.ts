import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

// Fully removes someone as staff: drops their restaurant grants, their
// editor/admin role row, and deletes the Supabase auth account itself so
// the login can't be reused later. Distinct from revoke-all-access, which
// only clears restaurant_permissions and leaves them listed as an editor
// with zero restaurants.
export async function POST(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { user_id } = await req.json()
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }
  if (user_id === caller.id) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 })
  }

  const { error: permErr } = await supabaseAdmin
    .from('restaurant_permissions')
    .delete()
    .eq('user_id', user_id)
  if (permErr) {
    console.error('remove-editor permissions error:', permErr)
    return NextResponse.json({ error: 'Failed to revoke restaurant access' }, { status: 500 })
  }

  const { error: roleErr } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', user_id)
  if (roleErr) {
    console.error('remove-editor role error:', roleErr)
    return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 })
  }

  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user_id)
  if (authErr) {
    console.error('remove-editor auth delete error:', authErr)
    return NextResponse.json({ error: 'Role and access removed, but failed to delete the login itself' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
