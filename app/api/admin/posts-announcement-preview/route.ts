import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAnnouncementRecipients } from '../../../../lib/announcementRecipients'

export async function POST(req: NextRequest) {
  try {
    const { password, id } = await req.json()
    if (password !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
    if (typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 })
    }

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('published, announcement_sent_at, announcement_recipient_count')
      .eq('id', id)
      .single()
    if (error || !post) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 })
    }

    const recipients = await getAnnouncementRecipients()

    return NextResponse.json({
      ok: true,
      count: recipients.length,
      published: post.published,
      alreadySent: !!post.announcement_sent_at,
      sentAt: post.announcement_sent_at,
      sentCount: post.announcement_recipient_count,
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
