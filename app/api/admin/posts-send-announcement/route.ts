import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAnnouncementRecipients, AnnouncementRecipient } from '../../../../lib/announcementRecipients'
import { announcementEmailHtml, announcementEmailSubject, AnnouncementPost } from '../../../../lib/announcementEmail'

export const maxDuration = 60

const BATCH_SIZE = 5

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
      .select('id, title, slug, body, cover_image_url, published')
      .eq('id', id)
      .single()
    if (error || !post) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 })
    }
    if (!post.published) {
      return NextResponse.json({ ok: false, error: 'Publish the post before sending an announcement.' }, { status: 400 })
    }

    const recipients = await getAnnouncementRecipients()

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(r => sendAnnouncementEmail(post, r)))
    }

    const sentAt = new Date().toISOString()
    const { error: updateErr } = await supabaseAdmin
      .from('posts')
      .update({ announcement_sent_at: sentAt, announcement_recipient_count: recipients.length })
      .eq('id', id)
    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: recipients.length, sentAt })
  } catch (err) {
    console.error('Send announcement error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

async function sendAnnouncementEmail(post: AnnouncementPost, recipient: AnnouncementRecipient) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Let's Get Lunch <hello@letsgetlunch.nyc>",
        to: recipient.email,
        subject: announcementEmailSubject(post),
        html: announcementEmailHtml(post, recipient),
      }),
    })
  } catch (e) {
    console.error('Announcement email error:', e)
  }
}
