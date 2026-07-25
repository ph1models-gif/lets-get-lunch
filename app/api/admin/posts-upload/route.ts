import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const password = formData.get('password')
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()
    const filePath = `newsletter/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabaseAdmin.storage
      .from('restaurant-photos')
      .upload(filePath, file, { upsert: true, contentType: file.type })
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('restaurant-photos').getPublicUrl(filePath)
    return NextResponse.json({ ok: true, url: urlData.publicUrl })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
