'use client';
import { useEffect, useRef } from 'react';
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
export default function OneSignalInit() {
  const cleanupRef = useRef<() => void>();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    import('onesignal-cordova-plugin').then(({ default: OneSignal }) => {
      if (cancelled) return;

      OneSignal.initialize(ONESIGNAL_APP_ID);
      OneSignal.Notifications.requestPermission(true);

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

      cleanupRef.current = () => authListener.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, []);

  return null;
}
