import { supabaseAdmin } from './supabaseAdmin'

export type AnnouncementRecipient = {
  email: string
  email_pref_token: string
}

// Single source of truth for "who gets a bulk announcement email" — combines
// both suppression mechanisms (profiles.email_frequency and the unsubscribes
// table) so the preview count and the actual send always agree.
export async function getAnnouncementRecipients(): Promise<AnnouncementRecipient[]> {
  const { data: unsubRows, error: unsubErr } = await supabaseAdmin
    .from('unsubscribes')
    .select('email')
  if (unsubErr) throw unsubErr
  const unsubbed = new Set((unsubRows || []).map(r => r.email.trim().toLowerCase()))

  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('email, email_pref_token')
    .neq('email_frequency', 'off')
    .eq('marketing_opt_in', true)
  if (profErr) throw profErr

  return (profiles || []).filter(
    (p): p is AnnouncementRecipient =>
      !!p.email && !!p.email_pref_token && !unsubbed.has(p.email.trim().toLowerCase())
  )
}
