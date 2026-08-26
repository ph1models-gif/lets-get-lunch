import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../../../lib/supabaseAdmin'

// claims is a sensitive table (real redemption codes) with no client-facing
// RLS read access, so this route reads it server-side with the service
// role key and returns only this user's own rows.
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

    const { data: userData, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('claims')
      .select('code, party_size, created_at, deals(special, price), restaurants(name)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('My claims fetch error:', error)
      return NextResponse.json({ error: 'Failed to load claims' }, { status: 500 })
    }

    const claims = (data || []).map((c: any) => ({
      display_code: `${c.code}-${c.party_size}`,
      party_size: c.party_size,
      created_at: c.created_at,
      restaurant_name: c.restaurants?.name ?? null,
      special: c.deals?.special ?? null,
      price: c.deals?.price ?? null,
    }))

    return NextResponse.json({ claims })
  } catch (err) {
    console.error('My claims error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
