import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../lib/supabaseAdmin'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'LGL-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(req: NextRequest) {
  try {
    const { restaurant_id, restaurant_name, name, contact, party_size, preferred_time } = await req.json()

    const code = generateCode()

    // Save reservation — if this fails we stop
    const { error: dbError } = await supabase.from('reservations').insert({
      restaurant_id,
      name,
      contact,
      party_size,
      preferred_time,
      code,
      status: 'pending',
    })

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json({ error: 'Failed to save reservation' }, { status: 500 })
    }

    // Fetch restaurant address for the confirmation email
    let restaurantAddress = ''
    let restaurantPhone = ''
    let restaurantWebsite = ''
    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('address, phone, website')
        .eq('id', restaurant_id)
        .single()
      if (rest?.address) restaurantAddress = rest.address
      if (rest?.phone) restaurantPhone = rest.phone
      if (rest?.website) restaurantWebsite = rest.website
    } catch (addrErr) {
      console.error('Restaurant lookup error:', addrErr)
    }

    // Send email — wrapped so failure does NOT block the code returning
    try {
      const userEmail = contact.includes('@') ? contact : null
      // Respect unsubscribes: never email someone who opted out
      let isUnsubscribed = false
      if (userEmail) {
        const { data: unsub } = await supabase
          .from('unsubscribes')
          .select('email')
          .eq('email', userEmail.trim().toLowerCase())
          .maybeSingle()
        if (unsub) isUnsubscribed = true
      }
      if (userEmail && !isUnsubscribed) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "Let's Get Lunch <hello@letsgetlunch.nyc>",
            to: userEmail,
            subject: `Your lunch plan — ${restaurant_name}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                <h1 style="color:#4A9FD5;font-size:24px;margin-bottom:8px">Here's your lunch at ${restaurant_name} 🍽️</h1>
                <p style="color:#444;font-size:16px">Hi ${name},</p>
                <p style="color:#444;font-size:16px">We've noted your interest in the lunch special at <strong>${restaurant_name}</strong>.</p>
                <div style="background:#EEF6FC;border-radius:12px;padding:20px;margin:24px 0">
                  <p style="color:#444;font-size:15px;margin:0 0 12px">${restaurant_name} isn't a Let's Get Lunch partner yet, so we can't book your table directly. Call ahead or just walk in — and mention you saw the lunch special on Let's Get Lunch.</p>
                  ${restaurantPhone ? `<p style="margin:8px 0;font-size:16px"><strong>📞 Call:</strong> <a href="tel:${restaurantPhone.replace(/[^0-9+]/g, '')}" style="color:#4A9FD5;text-decoration:none">${restaurantPhone}</a></p>` : ''}
                  ${restaurantWebsite ? `<p style="margin:8px 0;font-size:16px"><strong>🌐 Website:</strong> <a href="${restaurantWebsite}" style="color:#4A9FD5;text-decoration:none">${restaurantWebsite}</a></p>` : ''}
                </div>
                <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px">
                  <p style="margin:0 0 8px;color:#666;font-size:13px">Lunch details</p>
                  <p style="margin:4px 0;font-size:15px"><strong>Restaurant:</strong> ${restaurant_name}</p>
                  ${restaurantAddress ? `<p style="margin:4px 0;font-size:15px"><strong>Address:</strong> ${restaurantAddress}</p>` : ''}
                  <p style="margin:4px 0;font-size:15px"><strong>Time:</strong> ${preferred_time}</p>
                  <p style="margin:4px 0;font-size:15px"><strong>Party size:</strong> ${party_size} ${party_size === 1 ? 'person' : 'people'}</p>
                </div>
                <p style="color:#888;font-size:13px">— The Let's Get Lunch team</p>
                <p style="margin-top:16px;text-align:center">
                  <a href="https://www.letsgetlunch.nyc" style="color:#4A9FD5;font-size:13px;text-decoration:none">www.letsgetlunch.nyc</a>
                </p>
                <p style="color:#bbb;font-size:11px;text-align:center;margin-top:12px">
                  Let's Get Lunch · New York, NY<br/>
                  You're receiving this because you asked us to email you this lunch deal.<br/>
                  <a href="https://www.letsgetlunch.nyc/unsubscribe?email=${encodeURIComponent(userEmail)}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
                </p>
              </div>
            `,
          }),
        })
      }
    } catch (emailErr) {
      // Email failed — log it but don't block the reservation
      console.error('Email error:', emailErr)
    }

    // Always return the code regardless of email outcome
    return NextResponse.json({ success: true, code })

  } catch (err) {
    console.error('Reserve error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
