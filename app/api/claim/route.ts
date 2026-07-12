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

    const size = Math.min(Math.max(parseInt(party_size) || 1, 1), 6)

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Sign in to claim' }, { status: 401 })

    const { data: userData, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: 'Sign in to claim' }, { status: 401 })
    }
    const user = userData.user

    const { data: deal } = await supabase
      .from('deals')
      .select('id, restaurant_id, is_exclusive')
      .eq('id', deal_id)
      .single()

    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    if (!deal.is_exclusive) {
      return NextResponse.json({ error: 'Not an exclusive deal' }, { status: 400 })
    }

    const code = generateCode()

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

    return NextResponse.json({ success: true, code, party_size: size })

  } catch (err) {
    console.error('Claim error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
