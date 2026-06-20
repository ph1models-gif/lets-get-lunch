import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { password, id, is_active } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    if (typeof id !== 'string' || typeof is_active !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('restaurants')
      .update({ is_active })
      .eq('id', id)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
