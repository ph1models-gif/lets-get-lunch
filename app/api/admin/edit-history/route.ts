import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

// Fields that change on every write regardless of what was actually edited
// (or aren't meaningful to show as a "changed from/to") - left out of the
// diff shown to Brian.
const NOISE_FIELDS = new Set(['updated_at'])

export async function GET(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data: rows, error } = await supabaseAdmin
    .from('edit_history')
    .select('id, table_name, row_id, editor_user_id, before, after, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('edit-history fetch error:', error)
    return NextResponse.json({ error: 'Failed to load edit history' }, { status: 500 })
  }

  const editorIds = Array.from(new Set((rows || []).map(r => r.editor_user_id).filter(Boolean))) as string[]
  const emailByUserId = new Map<string, string>()
  await Promise.all(editorIds.map(async (id) => {
    const { data } = await supabaseAdmin.auth.admin.getUserById(id)
    if (data?.user?.email) emailByUserId.set(id, data.user.email)
  }))

  const restaurantIds = new Set<string>()
  for (const r of rows || []) {
    if (r.table_name === 'restaurants') restaurantIds.add(r.row_id)
    else if (r.table_name === 'deals') {
      const rid = (r.after as any)?.restaurant_id || (r.before as any)?.restaurant_id
      if (rid) restaurantIds.add(rid)
    }
  }
  const { data: restaurants } = await supabaseAdmin
    .from('restaurants')
    .select('id, name')
    .in('id', Array.from(restaurantIds))
  const nameByRestaurantId = new Map((restaurants || []).map(r => [r.id, r.name]))

  const entries = (rows || []).map(r => {
    const before = r.before as Record<string, any>
    const after = r.after as Record<string, any>
    const changes = Object.keys(after)
      .filter(k => !NOISE_FIELDS.has(k))
      .filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      .map(field => ({ field, before: before[field], after: after[field] }))

    const restaurantId = r.table_name === 'restaurants' ? r.row_id : ((after.restaurant_id || before.restaurant_id) ?? null)
    const restaurantName = restaurantId ? (nameByRestaurantId.get(restaurantId) || '(restaurant no longer listed)') : null

    return {
      id: r.id,
      tableName: r.table_name,
      rowId: r.row_id,
      restaurantName,
      isDeal: r.table_name === 'deals',
      dealSpecial: r.table_name === 'deals' ? (after.special || before.special) : null,
      editorEmail: r.editor_user_id ? (emailByUserId.get(r.editor_user_id) || 'Unknown user') : 'You (site panel)',
      createdAt: r.created_at,
      changes,
    }
  }).filter(e => e.changes.length > 0)

  return NextResponse.json({ entries })
}
