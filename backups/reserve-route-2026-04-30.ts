import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iqurlwenkozmxoyymnkg.supabase.co',
  'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4'
)

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

    // Send email — wrapped so failure does NOT block the code returning
    try {
      const userEmail = contact.includes('@') ? contact : null
      if (userEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "Let's Get Lunch <hello@letsgetlunch.nyc>",
            to: userEmail,
            subject: `Your lunch reservation — ${restaurant_name}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                <h1 style="color:#4A9FD5;font-size:24px;margin-bottom:8px">You're confirmed! 🍽️</h1>
                <p style="color:#444;font-size:16px">Hi ${name},</p>
                <p style="color:#444;font-size:16px">Your lunch reservation at <strong>${restaurant_name}</strong> is confirmed.</p>
                <div style="background:#EEF6FC;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
                  <p style="color:#666;font-size:14px;margin:0 0 8px">Your reservation code</p>
                  <p style="color:#4A9FD5;font-size:36px;font-weight:700;letter-spacing:4px;margin:0 0 16px">${code}</p>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${code}" width="160" height="160" style="display:block;margin:0 auto 12px" alt="QR Code" />
                  <p style="color:#666;font-size:13px;margin:8px 0 0">Show this at the restaurant to receive your lunch special</p>
                </div>
                <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:24px">
                  <p style="margin:0 0 8px;color:#666;font-size:13px">Reservation details</p>
                  <p style="margin:4px 0;font-size:15px"><strong>Restaurant:</strong> ${restaurant_name}</p>
                  <p style="margin:4px 0;font-size:15px"><strong>Time:</strong> ${preferred_time}</p>
                  <p style="margin:4px 0;font-size:15px"><strong>Party size:</strong> ${party_size} ${party_size === 1 ? 'person' : 'people'}</p>
                </div>
                <p style="color:#888;font-size:13px">— The Let's Get Lunch team</p>
                <p style="margin-top:16px;text-align:center">
                  <a href="https://www.letsgetlunch.nyc" style="color:#4A9FD5;font-size:13px;text-decoration:none">www.letsgetlunch.nyc</a>
                </p>
                <p style="color:#bbb;font-size:11px;text-align:center;margin-top:12px">
                  Let's Get Lunch · New York, NY<br/>
                  To unsubscribe, reply to this email with the word STOP.
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
