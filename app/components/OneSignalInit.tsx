'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../../lib/supabase';

const ONESIGNAL_APP_ID = '88dcd075-0812-4abb-81ce-4ccefd838744';

// Push notifications only exist inside the native iOS shell - the regular
// website/PWA never loads the OneSignal SDK. onesignal-cordova-plugin
// touches `window` as soon as its module is evaluated, which crashes
// Next.js's server-side prerendering if imported statically - so it's
// dynamically imported here, inside an effect that already bails out on
// the website, and never runs during SSR (effects don't run server-side).
// Ties OneSignal's per-device external user ID to the signed-in Supabase
// user (read-only: OneSignal stores the id/token mapping on its own side,
// nothing is written to Supabase here) so notifications can be targeted at
// specific diners later.
//
// Tapping a push deep-links into the app: set a custom "url" field
// (Additional Data, in the OneSignal dashboard composer) to a relative
// path like /restaurants/royal-35, and the tap navigates there instead of
// just opening to the homepage.
export default function OneSignalInit() {
  const router = useRouter();
  const cleanupFns = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    import('onesignal-cordova-plugin').then(({ default: OneSignal }) => {
      if (cancelled) return;

      OneSignal.initialize(ONESIGNAL_APP_ID);
      // fallbackToSettings must stay false: passing true makes OneSignal
      // show its own "notifications are off, open Settings" alert
      // unprompted on every launch once a user has denied permission once -
      // this is exactly what got the app rejected under App Store Review
      // Guidelines 4.5.4 and 5.1.1 (2026-09-04). Only ever ask via the
      // real iOS system dialog, and only when the user hasn't been asked
      // before - never re-nag after a decision has been made.
      OneSignal.Notifications.canRequestPermission().then((canPrompt) => {
        if (canPrompt) OneSignal.Notifications.requestPermission(false);
      });

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) OneSignal.login(user.id);
      }).catch(() => {});

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          OneSignal.login(session.user.id);
        } else {
          OneSignal.logout();
        }
      });
      cleanupFns.current.push(() => authListener.subscription.unsubscribe());

      const onClick = (event: { notification: { additionalData: unknown }; result: { url?: string } }) => {
        const data = event.notification.additionalData as { url?: string } | null;
        const raw = data?.url ?? event.result?.url ?? '';
        const path = raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
        if (path) router.push(path);
      };
      OneSignal.Notifications.addEventListener('click', onClick);
      cleanupFns.current.push(() => OneSignal.Notifications.removeEventListener('click', onClick));
    });

    return () => {
      cancelled = true;
      cleanupFns.current.forEach((fn) => fn());
      cleanupFns.current = [];
    };
  }, [router]);

  return null;
}
