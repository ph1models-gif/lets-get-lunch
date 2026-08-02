import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

const BASE = 'https://www.letsgetlunch.nyc'

// profiles.id is FK-constrained to auth.users(id) - there's no lightweight
// "email-only, no account" row possible (verified before building this).
// So a newsletter-only signup silently creates a real, passwordless account
// via the admin API (no password set, no Supabase auth email sent - unlike
// the client-side signInWithOtp flow), then a profiles row for it. This
// means the new subscriber is a completely ordinary row for
// getAnnouncementRecipients() / email-preferences / unsubscribe - same
// system, not a parallel one.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 })
    }
    const clean = email.trim().toLowerCase()

    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, email_pref_token, email_frequency')
      .eq('email', clean)
      .maybeSingle()

    let prefToken: string

    if (existing) {
      // Already has an account. Submitting this form is a deliberate,
      // explicit re-opt-in - clear both a prior 'off' and a prior
      // unsubscribes row rather than silently no-op'ing.
      if (existing.email_frequency !== 'weekly') {
        await supabaseAdmin.from('profiles').update({ email_frequency: 'weekly' }).eq('id', existing.id)
      }
      prefToken = existing.email_pref_token
    } else {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
        email: clean,
        email_confirm: true,
      })
      if (userErr || !userData?.user) {
        console.error('Newsletter signup - createUser error:', userErr)
        return NextResponse.json({ ok: false, error: 'Could not sign you up. Try again.' }, { status: 500 })
      }

      const { data: newProfile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userData.user.id, email: clean, email_frequency: 'weekly' })
        .select('email_pref_token')
        .single()
      if (profErr || !newProfile) {
        console.error('Newsletter signup - profile insert error:', profErr)
        return NextResponse.json({ ok: false, error: 'Could not sign you up. Try again.' }, { status: 500 })
      }
      prefToken = newProfile.email_pref_token
    }

    await supabaseAdmin.from('unsubscribes').delete().eq('email', clean)

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "Let's Get Lunch <hello@letsgetlunch.nyc>",
          to: clean,
          subject: "You're subscribed to the Let's Get Lunch newsletter",
          html: welcomeEmail(clean, prefToken),
        }),
      })
    } catch (e) {
      console.error('Newsletter signup - welcome email error:', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Newsletter signup error:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}

function welcomeEmail(email: string, token: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="color:#4A9FD5;font-size:24px;margin-bottom:8px">You're subscribed!</h1>
      <p style="color:#444;font-size:16px">You'll get the Let's Get Lunch newsletter weekly - new lunch specials and neighborhood picks from around NYC.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${BASE}/newsletter" style="display:inline-block;background:#4A9FD5;color:#fff;text-decoration:none;font-size:15px;font-weight:bold;border-radius:8px;padding:12px 24px">Read the newsletter</a>
      </div>
      <p style="color:#888;font-size:13px">- Brian</p>
      <p style="color:#bbb;font-size:11px;text-align:center;margin-top:12px">
        Let's Get Lunch - New York, NY<br/>
        <a href="${BASE}/email-preferences?token=${token}" style="color:#bbb;text-decoration:underline">Change frequency</a>
        &nbsp;&middot;&nbsp;
        <a href="${BASE}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#bbb;text-decoration:underline">Unsubscribe</a>
      </p>
    </div>
  `
}
