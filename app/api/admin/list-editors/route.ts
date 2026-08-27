import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

export const dynamic = 'force-dynamic'

// Not in the original plan doc's route list, but needed for the
// permissions page: editor emails live in auth.users, which isn't
// reachable from the plain RLS-scoped browser client the way
// restaurant_permissions/user_roles are. Admin-only, service-role read.
export async function GET(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data: roleRows, error: roleErr } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'editor')
  if (roleErr) {
    console.error('list-editors role fetch error:', roleErr)
    return NextResponse.json({ error: 'Failed to load editors' }, { status: 500 })
  }

  const { data: permRows, error: permErr } = await supabaseAdmin
    .from('restaurant_permissions')
    .select('user_id, restaurant_id')
  if (permErr) {
    console.error('list-editors permissions fetch error:', permErr)
    return NextResponse.json({ error: 'Failed to load permissions' }, { status: 500 })
  }

  const editors = await Promise.all(
    (roleRows || []).map(async (r: any) => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(r.user_id)
      return {
        user_id: r.user_id,
        email: userData?.user?.email ?? null,
        restaurant_ids: (permRows || []).filter((p: any) => p.user_id === r.user_id).map((p: any) => p.restaurant_id),
      }
    })
  )

  return NextResponse.json({ editors })
}
