import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAnnouncementRecipients, AnnouncementRecipient } from '../../../../lib/announcementRecipients'

export const maxDuration = 60

const BASE = 'https://www.letsgetlunch.nyc'
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
      .select('id, title, slug, excerpt, published')
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

async function sendAnnouncementEmail(post: { title: string; slug: string; excerpt: string | null }, recipient: AnnouncementRecipient) {
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
        subject: `New from Let's Get Lunch: ${post.title}`,
        html: announcementEmail(post, recipient),
      }),
    })
  } catch (e) {
    console.error('Announcement email error:', e)
  }
}

function announcementEmail(post: { title: string; slug: string; excerpt: string | null }, recipient: AnnouncementRecipient): string {
  const postUrl = `${BASE}/newsletter/${post.slug}`
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#4A9FD5;font-size:24px;margin-bottom:8px">${post.title}</h1>
      ${post.excerpt ? `<p style="color:#444;font-size:16px">${post.excerpt}</p>` : ''}
      <div style="text-align:center;margin:24px 0">
        <a href="${postUrl}" style="display:inline-block;background:#4A9FD5;color:#fff;text-decoration:none;font-size:15px;font-weight:bold;border-radius:8px;padding:12px 24px">Read it on Let's Get Lunch</a>
      </div>
      <p style="color:#888;font-size:13px">- The Let's Get Lunch team</p>
      <p style="color:#bbb;font-size:11px;text-align:center;margin-top:12px">
        Let's Get Lunch - New York, NY<br/>
        <a href="${BASE}/unsubscribe?email=${encodeURIComponent(recipient.email)}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="${BASE}/email-preferences?token=${recipient.email_pref_token}" style="color:#bbb;text-decoration:underline">Email preferences</a>
      </p>
    </div>
  `
}
