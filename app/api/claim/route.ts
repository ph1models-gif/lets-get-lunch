import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../lib/supabaseAdmin'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'LGX-'
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST(req: NextRequest) {
  try {
    const { deal_id, party_size } = await req.json()
    if (!deal_id) return NextResponse.json({ error: 'Missing deal' }, { status: 400 })

    const size = Math.min(Math.max(parseInt(party_size) || 1, 1), 8)

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Sign in to claim' }, { status: 401 })

    const { data: userData, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: 'Sign in to claim' }, { status: 401 })
    }
    const user = userData.user

    const { data: deal } = await supabase
      .from('deals')
      .select('id, restaurant_id, is_exclusive, special, price, days')
      .eq('id', deal_id)
      .single()

    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    if (!deal.is_exclusive) {
      return NextResponse.json({ error: 'Not an exclusive deal' }, { status: 400 })
    }

    const code = generateCode()
    const displayCode = `${code}-${size}`

    const { error: dbError } = await supabase.from('claims').insert({
      deal_id: deal.id,
      restaurant_id: deal.restaurant_id,
      user_id: user.id,
      code,
      party_size: size,
    })

    if (dbError) {
      if (dbError.code === '23505') {
        return NextResponse.json({ error: 'already_claimed' }, { status: 409 })
      }
      console.error('Claim DB error:', dbError)
      return NextResponse.json({ error: 'Failed to save claim' }, { status: 500 })
    }

    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('name, address, phone')
        .eq('id', deal.restaurant_id)
        .single()
      const userEmail = user.email
      let unsubbed = false
      if (userEmail) {
        const { data: u } = await supabase
          .from('unsubscribes')
          .select('email')
          .eq('email', userEmail.trim().toLowerCase())
          .maybeSingle()
        if (u) unsubbed = true
      }
      if (userEmail && !unsubbed && rest) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "Let's Get Lunch <hello@letsgetlunch.nyc>",
            to: userEmail,
            subject: `Your exclusive lunch code - ${rest.name}`,
            html: claimEmail(displayCode, size, rest, deal, userEmail),
          }),
        })
      }
    } catch (e) {
      console.error('Claim email error:', e)
    }

    return NextResponse.json({ success: true, code, display_code: displayCode, party_size: size })

  } catch (err) {
    console.error('Claim error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function claimEmail(displayCode: string, size: number, rest: any, deal: any, email: string): string {
  const people = size === 1 ? 'person' : 'people'
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#4A9FD5;font-size:24px;margin-bottom:8px">Your exclusive lunch code</h1>
      <p style="color:#444;font-size:16px">Here's your code for <strong>${rest.name}</strong>.</p>
      <div style="background:#EEF6FC;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
        <p style="margin:0;font-size:32px;font-weight:bold;color:#4A9FD5;letter-spacing:2px">${displayCode}</p>
      </div>
      <p style="color:#444;font-size:16px"><strong>No reservation needed</strong> - just walk in during lunch hours and show this code to your server or at the host stand.</p>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:24px 0">
        <p style="margin:0 0 8px;color:#666;font-size:13px">Lunch details</p>
        <p style="margin:4px 0;font-size:15px"><strong>Special:</strong> ${deal.special}</p>
        <p style="margin:4px 0;font-size:15px"><strong>Price:</strong> $${deal.price} per person</p>
        <p style="margin:4px 0;font-size:15px"><strong>Party:</strong> ${size} ${people}</p>
        <p style="margin:4px 0;font-size:15px"><strong>Address:</strong> ${rest.address}</p>
        ${rest.phone ? `<p style="margin:4px 0;font-size:15px"><strong>Phone:</strong> ${rest.phone}</p>` : ''}
      </div>
      <p style="color:#888;font-size:13px">- The Let's Get Lunch team</p>
      <p style="color:#bbb;font-size:11px;text-align:center;margin-top:12px">
        Let's Get Lunch - New York, NY<br/>
        <a href="https://www.letsgetlunch.nyc/unsubscribe?email=${encodeURIComponent(email)}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
      </p>
    </div>
  `
}
