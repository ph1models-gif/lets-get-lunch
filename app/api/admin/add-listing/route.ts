import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { password, form, photoUrl, photoUrls, lat, lng } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    if (!form || typeof form.name !== 'string') {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }

    const { data: rest, error: insErr } = await supabaseAdmin.from('restaurants').insert({
      name: form.name,
      address: form.address,
      neighborhood: form.neighborhood,
      cuisine: form.cuisine,
      hours: form.hours,
      bio: form.bio || null,
      work_friendly: form.work_friendly,
      wifi: form.wifi,
      photo_url: photoUrl ?? null,
      photo_urls: photoUrls ?? [],
      website: form.website || null,
      is_active: true,
      lat: lat ?? null,
      lng: lng ?? null,
    }).select().single()

    if (insErr) {
      if (insErr.code === '23505') {
        return NextResponse.json({ ok: false, error: 'A listing with this name and address already exists.' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
    }
    if (!rest) {
      return NextResponse.json({ ok: false, error: 'Insert failed' }, { status: 500 })
    }

    await supabaseAdmin.from('deals').insert({
      restaurant_id: rest.id,
      special: form.special,
      price: parseFloat(form.price) || 0,
      days: form.days,
      is_active: true,
    })

    await supabaseAdmin.from('vendors').insert({
      restaurant_name: form.name,
      contact_name: form.contact_name,
      email: form.contact_email,
      phone: form.contact_phone,
      address: form.address,
      neighborhood: form.neighborhood,
      cuisine: form.cuisine,
      hours: form.hours,
      special: form.special,
      price: form.price,
      work_friendly: form.work_friendly ? 'yes' : 'no',
      wifi: form.wifi ? 'yes' : 'no',
      bio: form.bio || null,
      days: form.days,
      status: 'approved',
    })

    return NextResponse.json({ ok: true, restaurant: rest })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
