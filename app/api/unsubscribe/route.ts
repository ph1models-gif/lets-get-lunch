import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 })
    }
    const clean = email.trim().toLowerCase()
    // upsert so repeat clicks don't error
    const { error } = await supabaseAdmin
      .from('unsubscribes')
      .upsert({ email: clean }, { onConflict: 'email' })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
