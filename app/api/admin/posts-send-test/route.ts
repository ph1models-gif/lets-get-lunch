import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { announcementEmailHtml, announcementEmailSubject } from '../../../../lib/announcementEmail'

const TEST_RECIPIENT = 'brian@letsgetlunch.nyc'

// Sends the exact same template a real "Send as announcement" would produce,
// to a single fixed address, for previewing before a real send. Doesn't touch
// announcement_sent_at/recipient_count and doesn't require the post to be
// published, since previewing before publishing is the whole point.
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
      .select('id, title, slug, body, cover_image_url')
      .eq('id', id)
      .single()
    if (error || !post) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 })
    }

    // brian@ isn't necessarily a signed-up profile with a real
    // email_pref_token, so the preference-center link in the footer won't
    // resolve for this address — expected and fine for a preview send.
    const testRecipient = { email: TEST_RECIPIENT, email_pref_token: 'test' }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "Let's Get Lunch <hello@letsgetlunch.nyc>",
        to: TEST_RECIPIENT,
        subject: `[TEST] ${announcementEmailSubject(post)}`,
        html: announcementEmailHtml(post, testRecipient),
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return NextResponse.json({ ok: false, error: `Resend error: ${errText || res.status}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Send test announcement error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}
