'use client';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Safety net: every signed-in account should have a profiles row. The rows
// are normally created by whichever page a sign-up lands on (the lunch
// pop-up, /signup, /login, /auth/callback, CapacitorAuthCallback) - but if a
// sign-in ever completes without passing through one of those (a failed
// native hand-off, a bug like the old profiles.contact write), the account
// ends up with no profile: no newsletter, invisible in admin, settings that
// silently don't save. This creates the missing row on the next page load.
//
// Runs once per page load only - deliberately NOT on auth-state changes, so
// it never races the sign-up flows that insert their own, fuller profile
// (typed name, opt-in choice) right after creating the account. Skips
// /auth/callback, which creates the profile itself on that same load.
export default function EnsureProfile() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/auth/callback')) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;
        const { data: existing, error } = await supabase
          .from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (error || existing) return;
        const name =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) || '';
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          name: name.trim(),
          email: (user.email || '').trim().toLowerCase() || null,
          neighborhood: null,
          // No opt-in choice was captured on whatever path skipped profile
          // creation, so don't assume consent to marketing email.
          marketing_opt_in: false,
        });
        // 23505 = another tab/flow created it first - that's fine.
        if (insertErr && insertErr.code !== '23505') console.error('EnsureProfile insert error:', insertErr);
      } catch (e) {
        console.error('EnsureProfile error:', e);
      }
    })();
  }, []);
  return null;
}
