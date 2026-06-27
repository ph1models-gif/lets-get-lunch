import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'


export async function POST(req: NextRequest) {
  try {
    const { password, vendor, lat, lng } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    if (!vendor || typeof vendor.id !== 'string') {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }

    // GUARD: skip insert if an active restaurant with same name+address exists.
    const { data: existing } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .ilike('name', (vendor.restaurant_name || '').trim())
      .ilike('address', (vendor.address || '').trim())
      .limit(1)
    if (existing && existing.length > 0) {
      await supabaseAdmin.from('vendors').update({ status: 'approved' }).eq('id', vendor.id)
      return NextResponse.json({ ok: true, duplicate: true })
    }

    // lat/lng are geocoded client-side (in admin) and passed in the request body.

    // Insert restaurant
    const { data: rest, error: insErr } = await supabaseAdmin.from('restaurants').insert({
      name: vendor.restaurant_name,
      cuisine: vendor.cuisine,
      neighborhood: vendor.neighborhood,
      address: vendor.address,
      hours: vendor.hours,
      photo_url: vendor.photo_url,
      photo_urls: vendor.photo_urls,
      bio: vendor.bio || null,
      work_friendly: vendor.work_friendly === 'yes',
      wifi: vendor.wifi === 'yes',
      website: vendor.website || null,
      is_active: true, lat, lng,
    }).select().single()

    // Backstop: DB unique index rejected a duplicate (race the guard missed)
    if (insErr) {
      if (insErr.code === '23505') {
        await supabaseAdmin.from('vendors').update({ status: 'approved' }).eq('id', vendor.id)
        return NextResponse.json({ ok: true, duplicate: true })
      }
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
    }

    if (rest) {
      await supabaseAdmin.from('deals').insert({
        restaurant_id: rest.id,
        special: vendor.special,
        price: parseFloat((vendor.price || '0').replace('$', '')) || 0,
        days: vendor.days || ['Mon','Tue','Wed','Thu','Fri'],
        is_active: true,
      })
    }
    await supabaseAdmin.from('vendors').update({ status: 'approved' }).eq('id', vendor.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
