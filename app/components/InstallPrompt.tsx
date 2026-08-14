'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { getCookie, setCookie } from '../../lib/cookies';
import {
  ANDROID_INSTALL_BANNER_COOKIE,
  ANDROID_INSTALL_BANNER_DELAY_MS,
  ANDROID_INSTALL_BANNER_SUPPRESS_DAYS,
  IOS_INSTALL_HINT_COOKIE,
  IOS_INSTALL_HINT_SUPPRESS_DAYS,
} from '../../lib/pwa';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOSDevice) return false;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|mercury|GSA/.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export default function InstallPrompt() {
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // /claim is reached almost entirely via an external QR-code scan and
    // already runs a single focused signup CTA (nav button + iOS-style
    // modal) - a prior sticky banner there was removed for causing
    // duplicate-prompt fatigue (see git history). Keep install prompts off
    // that page for the same reason.
    if (window.location.pathname.startsWith('/claim')) return;
    if (isStandalone()) return;

    if (isIosSafari()) {
      if (!getCookie(IOS_INSTALL_HINT_COOKIE)) setShowIosHint(true);
      return;
    }

    let bannerTimer: ReturnType<typeof setTimeout> | undefined;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      if (getCookie(ANDROID_INSTALL_BANNER_COOKIE)) return;
      // Sensible moment = after some time on the page, not the instant it loads.
      bannerTimer = setTimeout(() => setShowAndroidBanner(true), ANDROID_INSTALL_BANNER_DELAY_MS);
    }

    function onAppInstalled() {
      track('pwa_installed');
      setShowAndroidBanner(false);
      deferredPromptRef.current = null;
      setCookie(ANDROID_INSTALL_BANNER_COOKIE, '1', 365);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      if (bannerTimer) clearTimeout(bannerTimer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const dismissAndroidBanner = useCallback(() => {
    track('pwa_install_banner_dismissed');
    setCookie(ANDROID_INSTALL_BANNER_COOKIE, '1', ANDROID_INSTALL_BANNER_SUPPRESS_DAYS);
    setShowAndroidBanner(false);
  }, []);

  const handleInstallClick = useCallback(async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;
    track('pwa_install_banner_accepted');
    setShowAndroidBanner(false);
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    track('pwa_install_prompt_outcome', { outcome });
    deferredPromptRef.current = null;
    setCookie(ANDROID_INSTALL_BANNER_COOKIE, '1', ANDROID_INSTALL_BANNER_SUPPRESS_DAYS);
  }, []);

  const dismissIosHint = useCallback(() => {
    track('pwa_ios_hint_dismissed');
    setCookie(IOS_INSTALL_HINT_COOKIE, '1', IOS_INSTALL_HINT_SUPPRESS_DAYS);
    setShowIosHint(false);
  }, []);

  if (showAndroidBanner) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md bg-white rounded-2xl shadow-lg shadow-black/20 border border-gray-100 flex items-center gap-3 p-3">
          <img src="/icons/icon-96.png" alt="" className="w-11 h-11 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 leading-tight">Install Let&apos;s Get Lunch</p>
            <p className="text-[12px] text-gray-500 leading-tight mt-0.5">Faster access from your home screen</p>
          </div>
          <button
            onClick={dismissAndroidBanner}
            aria-label="Dismiss"
            className="text-gray-400 text-[13px] px-1.5 py-1 flex-shrink-0"
          >
            Not now
          </button>
          <button
            onClick={handleInstallClick}
            className="bg-[#4A9FD5] text-white text-[13px] font-semibold px-3.5 py-2 rounded-lg flex-shrink-0"
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg shadow-black/20 border border-gray-100 flex items-center gap-3 p-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-900 leading-snug">
              Install this app: tap{' '}
              <svg aria-hidden="true" className="inline w-3.5 h-3.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
              </svg>{' '}
              Share, then <span className="font-semibold">Add to Home Screen</span>
            </p>
          </div>
          <button
            onClick={dismissIosHint}
            aria-label="Dismiss"
            className="text-gray-400 text-[13px] px-1.5 py-1 flex-shrink-0"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return null;
}
