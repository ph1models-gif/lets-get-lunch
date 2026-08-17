'use client';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Inside the native app the whole site runs in one WKWebView, so a plain
// <a target="_blank"> (Instagram, TikTok, Google Maps, etc.) would otherwise
// navigate that same webview away from the app instead of opening a new tab.
// Route anything off-origin through the system browser instead. No-ops
// entirely on the regular website / installed PWA.
export default function CapacitorExternalLinks() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      if (url.hostname === window.location.hostname) return;

      e.preventDefault();
      Browser.open({ url: url.toString() });
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
