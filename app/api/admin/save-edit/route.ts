import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { password, id, fields, deal } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    if (typeof id !== 'string' || !fields) {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('restaurants')
      .update(fields)
      .eq('id', id)
    if (updErr) {
      if (updErr.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Another listing already has this name and address.' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
    }

    // Deal: update existing by deal.id, else insert if a special was provided
    if (deal && deal.id) {
      await supabaseAdmin.from('deals').update({
        special: deal.special,
        price: deal.price,
        days: deal.days,
      }).eq('id', deal.id)
    } else if (deal && deal.special) {
      await supabaseAdmin.from('deals').insert({
        restaurant_id: id,
        special: deal.special,
        price: deal.price,
        days: deal.days,
        is_active: true,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
