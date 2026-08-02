import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { password, id, post } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    if (typeof id !== 'string' || !post) {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('posts')
      .select('published_at, slug')
      .eq('id', id)
      .single()

    const published = !!post.published
    // A post that's ever been published (published_at persists even if later
    // unpublished) or is being published in this save has a live/indexed/
    // emailed URL — never let a client-supplied slug override it here,
    // regardless of what the UI sent.
    const slugLocked = !!existing?.published_at || published
    const fields: Record<string, any> = {
      title: post.title,
      slug: slugLocked && existing?.slug ? existing.slug : post.slug,
      excerpt: post.excerpt || null,
      body: post.body || '',
      cover_image_url: post.cover_image_url || null,
      published,
    }
    // Only stamp published_at the first time a post goes live; leave it alone on later edits.
    if (published && !existing?.published_at) {
      fields.published_at = new Date().toISOString()
    }

    const { error } = await supabaseAdmin.from('posts').update(fields).eq('id', id)
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'A post with this slug already exists.' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
