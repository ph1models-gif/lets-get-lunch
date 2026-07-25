import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { password, post } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    if (!post || typeof post.title !== 'string' || typeof post.slug !== 'string') {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }

    const published = !!post.published
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || null,
        body: post.body || '',
        cover_image_url: post.cover_image_url || null,
        published,
        published_at: published ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'A post with this slug already exists.' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, post: data })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
