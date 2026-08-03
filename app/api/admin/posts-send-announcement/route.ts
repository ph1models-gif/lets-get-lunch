import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAnnouncementRecipients, AnnouncementRecipient } from '../../../../lib/announcementRecipients'
import { announcementEmailHtml, announcementEmailSubject, AnnouncementPost } from '../../../../lib/announcementEmail'

export const maxDuration = 60

// Resend's default rate limit is 10 req/sec per team (across all API keys) —
// batches of 5 with a pause between them leaves headroom for other traffic
// on the same account (test sends, signup confirmations) without tripping it.
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 600

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
    const failed: string[] = []

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map(r => sendAnnouncementEmail(post, r)))
      results.forEach((ok, j) => { if (!ok) failed.push(batch[j].email) })
      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS)
    }

    const sentCount = recipients.length - failed.length
    const sentAt = new Date().toISOString()
    const { error: updateErr } = await supabaseAdmin
      .from('posts')
      .update({ announcement_sent_at: sentAt, announcement_recipient_count: sentCount })
      .eq('id', id)
    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
    }

    if (failed.length > 0) {
      console.error('Announcement send: failed recipients', failed)
    }

    return NextResponse.json({ ok: true, count: sentCount, failed, sentAt })
  } catch (err) {
    console.error('Send announcement error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

// Returns whether Resend actually accepted the send — a non-2xx response no
// longer passes silently (that gap is what let 17 of 46 vanish with no
// record on either side last time).
async function sendAnnouncementEmail(post: AnnouncementPost, recipient: AnnouncementRecipient): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
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
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('Announcement email rejected:', recipient.email, res.status, errText)
      return false
    }
    return true
  } catch (e) {
    console.error('Announcement email error:', recipient.email, e)
    return false
  }
}
