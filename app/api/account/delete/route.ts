import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data: userData, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const user = userData.user

    // Claims and reservations are redemption/lead data restaurant partners
    // rely on for redemption counts — anonymize (strip the link to this
    // person) rather than delete the rows themselves.
    const { error: claimsErr } = await supabase
      .from('claims')
      .update({ user_id: null })
      .eq('user_id', user.id)
    if (claimsErr) {
      console.error('Delete account — claims anonymize error:', claimsErr)
      return NextResponse.json({ error: 'Failed to process account data' }, { status: 500 })
    }

    // reservations has no user_id column (never linked to accounts) — the
    // only link back to this person is the raw contact string they typed.
    if (user.email) {
      const { error: resErr } = await supabase
        .from('reservations')
        .update({ name: null, contact: null })
        .ilike('contact', user.email)
      if (resErr) {
        console.error('Delete account — reservations anonymize error:', resErr)
        return NextResponse.json({ error: 'Failed to process account data' }, { status: 500 })
      }
    }

    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', user.id)
    if (profileErr) {
      console.error('Delete account — profile delete error:', profileErr)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    const { error: userErr } = await supabase.auth.admin.deleteUser(user.id)
    if (userErr) {
      console.error('Delete account — auth user delete error:', userErr)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
