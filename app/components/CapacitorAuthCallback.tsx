'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../../lib/supabase';

// Native counterpart to the website's /auth/callback page. Google (and, once
// enabled, Apple) blocks its sign-in screen from loading inside an embedded
// WKWebView, which is exactly what this app's own webview is - so on native,
// login/page.tsx and signup/page.tsx open the OAuth screen in the system
// in-app browser instead (via @capacitor/browser), with redirectTo pointed
// at this app's own custom URL scheme (nyc.letsgetlunch.app://auth-callback)
// rather than the website's /auth/callback URL.
//
// When iOS hands that URL back to the app, this listens for it, reads the
// access/refresh tokens straight out of the URL fragment - the site uses
// Supabase's implicit flow (confirmed: lib/supabase.ts doesn't override the
// SDK's default), so there's no separate "exchange a code" step, just these
// two token values already sitting in the URL - and establishes the session
// with setSession().
//
// Deliberately does NOT import anything from /auth/callback/page.tsx or share
// code with it. The profile-creation check below is a direct copy of that
// page's same handful of lines, kept in sync by hand, so the website's own
// callback page (which every sign-in on the site, web and app alike, still
// goes through for the actual OAuth handshake with Google/Apple/Supabase)
// stays completely untouched by this native-only addition.
export default function CapacitorAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    Promise.all([
      import('@capacitor/app'),
      import('@capacitor/browser'),
    ]).then(([{ App }, { Browser }]) => {
      if (cancelled) return;

      const onUrlOpen = async (event: { url: string }) => {
        let url: URL;
        try {
          url = new URL(event.url);
        } catch {
          return;
        }
        if (url.protocol !== 'nyc.letsgetlunch.app:') return;

        // Always close the in-app browser sheet - whether sign-in
        // succeeded, failed, or the user cancelled it - so it never hangs
        // over the app waiting to be dismissed.
        Browser.close().catch(() => {});

        const params = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        // No tokens means the user cancelled the sheet, or Google/Apple
        // sent back an error instead of approving - either way there's
        // nothing to sign in with. Leave them exactly where they already
        // are; no error screen, no stuck state.
        if (!access_token || !refresh_token) return;

        const { data: { session } } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!session) return;

        const user = session.user;
        const { data: existing } = await supabase
          .from('profiles').select('id').eq('id', user.id).maybeSingle();
        if (!existing) {
          const name =
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) || '';
          await supabase.from('profiles').insert({
            id: user.id,
            name,
            email: user.email,
            neighborhood: null,
          });
        }

        const raw = new URLSearchParams(url.search).get('next') || '';
        const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
        router.push(safe);
      };

      App.addListener('appUrlOpen', onUrlOpen);
    });

    return () => {
      cancelled = true;
      import('@capacitor/app').then(({ App }) => App.removeAllListeners()).catch(() => {});
    };
  }, [router]);

  return null;
}
