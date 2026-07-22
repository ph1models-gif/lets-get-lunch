import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const VALID = ['daily', 'weekly', 'monthly', 'off']

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('email_frequency')
    .eq('email_pref_token', token)
    .maybeSingle()
  if (error || !data) return NextResponse.json({ ok: false, error: 'Invalid link' }, { status: 404 })
  return NextResponse.json({ ok: true, frequency: data.email_frequency })
}

export async function POST(req: NextRequest) {
  try {
    const { token, frequency } = await req.json()
    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
    if (!VALID.includes(frequency)) return NextResponse.json({ ok: false, error: 'Invalid choice' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ email_frequency: frequency, email_pref_updated_at: new Date().toISOString() })
      .eq('email_pref_token', token)
      .select('email_frequency')
      .maybeSingle()
    if (error || !data) return NextResponse.json({ ok: false, error: 'Invalid link' }, { status: 404 })
    return NextResponse.json({ ok: true, frequency: data.email_frequency })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 })
    const { data: prof, error: e1 } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email_pref_token', token)
      .maybeSingle()
    if (e1 || !prof?.email) return NextResponse.json({ ok: false, error: 'Invalid link' }, { status: 404 })
    await supabaseAdmin.from('unsubscribes').upsert(
      { email: prof.email.trim().toLowerCase() }, { onConflict: 'email' }
    )
    await supabaseAdmin.from('profiles')
      .update({ email_frequency: 'off', email_pref_updated_at: new Date().toISOString() })
      .eq('email_pref_token', token)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
