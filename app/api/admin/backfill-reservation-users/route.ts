import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin'

// One-off migration: link existing reservations to the accounts they
// actually belong to. Historically /api/reserve silently dropped the
// user_id it was sent, so reservations.user_id is NULL on rows that were
// in fact made by a signed-in user — the only trace left is the raw
// contact string. Matches by email against profiles (which mirrors the
// auth email for every account in this app) and only ever touches rows
// that are still unlinked, so it's safe to run more than once.
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: reservations, error: resErr } = await supabase
      .from('reservations')
      .select('id, contact')
      .is('user_id', null)
      .not('contact', 'is', null)
    if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 })

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, email')
      .not('email', 'is', null)
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

    const emailToId = new Map(
      (profiles || []).map((p) => [p.email!.trim().toLowerCase(), p.id])
    )

    let matched = 0
    const errors: string[] = []
    for (const r of reservations || []) {
      const contact = (r.contact || '').trim().toLowerCase()
      if (!contact.includes('@')) continue
      const userId = emailToId.get(contact)
      if (!userId) continue
      const { error: updateErr } = await supabase
        .from('reservations')
        .update({ user_id: userId })
        .eq('id', r.id)
      if (updateErr) errors.push(`${r.id}: ${updateErr.message}`)
      else matched++
    }

    return NextResponse.json({
      checked: (reservations || []).length,
      matched,
      errors,
    })
  } catch (err) {
    console.error('Backfill reservation users error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
