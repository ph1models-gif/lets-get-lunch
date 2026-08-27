import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest'

export async function POST(req: NextRequest) {
  const caller = await getUserFromRequest(req)
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.letsgetlunch.nyc'

  const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/admin/login`,
  })
  if (inviteErr || !invited?.user) {
    console.error('invite-editor invite error:', inviteErr)
    return NextResponse.json({ error: inviteErr?.message || 'Failed to send invite' }, { status: 500 })
  }

  const { error: roleErr } = await supabaseAdmin
    .from('user_roles')
    .upsert({ user_id: invited.user.id, role: 'editor' }, { onConflict: 'user_id' })
  if (roleErr) {
    console.error('invite-editor role error:', roleErr)
    return NextResponse.json({ error: 'Invite sent, but failed to assign the editor role' }, { status: 500 })
  }

  return NextResponse.json({ success: true, user_id: invited.user.id })
}
