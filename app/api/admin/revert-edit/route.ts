import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

// Restores a row to its "before" state for exactly the fields that changed
// in this edit_history entry, using the service-role key - this runs as
// admin, not as the original editor, so it bypasses the editor column
// guard/RLS the same way the pre-existing /admin panel already does. The
// restaurants/deals AFTER UPDATE trigger fires on this write like any
// other, so the revert itself shows up as a new edit_history entry
// (editor_user_id NULL, same as any other service-role write).
export async function POST(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data: entry, error: fetchErr } = await supabaseAdmin
    .from('edit_history')
    .select('table_name, row_id, before, after')
    .eq('id', id)
    .single()

  if (fetchErr || !entry) {
    return NextResponse.json({ error: 'Edit history entry not found' }, { status: 404 })
  }

  const before = entry.before as Record<string, any>
  const after = entry.after as Record<string, any>
  const patch: Record<string, any> = {}
  for (const key of Object.keys(after)) {
    if (key === 'id') continue
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      patch[key] = before[key]
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to revert - row already matches' }, { status: 400 })
  }

  const { error: updateErr } = await supabaseAdmin
    .from(entry.table_name)
    .update(patch)
    .eq('id', entry.row_id)

  if (updateErr) {
    console.error('revert-edit error:', updateErr)
    return NextResponse.json({ error: 'Failed to revert' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
