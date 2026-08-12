'use client';
import { useCallback, useEffect } from 'react';
import { track } from '@vercel/analytics';
import { setCookie } from '../../lib/cookies';
import { SIGNUP_MODAL_COOKIE, SIGNUP_MODAL_SUPPRESS_DAYS } from '../../lib/signupModal';

// Mirrors the iOS system location-permission alert: 270pt-wide card,
// 14pt corner radius, dimmed backdrop, bold title + regular body, a
// hairline divider, then two equal buttons in iOS blue (#007AFF)
// separated by a vertical hairline.
const IOS_BLUE = '#007AFF';

export default function SignupModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    track('signup_modal_shown');
    // Mark as seen the moment it's shown, not only on dismiss — this is what
    // makes it "once per visitor" for the next 7 days regardless of outcome.
    setCookie(SIGNUP_MODAL_COOKIE, '1', SIGNUP_MODAL_SUPPRESS_DAYS);
  }, []);

  const close = useCallback((method: 'button' | 'backdrop' | 'esc') => {
    track('signup_modal_dismissed', { method });
    onClose();
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close('esc');
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close]);

  function handleSignUp() {
    track('signup_modal_signup_clicked');
    const next = window.location.pathname + window.location.search;
    window.location.href = `/signup?next=${encodeURIComponent(next)}`;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-6"
      onClick={() => close('backdrop')}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
        aria-describedby="signup-modal-body"
        onClick={e => e.stopPropagation()}
        className="w-[270px] bg-white/90 backdrop-blur-xl rounded-[14px] shadow-xl overflow-hidden text-center"
      >
        <div className="px-4 pt-[18px] pb-4">
          <p id="signup-modal-title" className="text-[17px] font-semibold text-gray-900 leading-[1.25]">
            Get Access to Exclusive Lunch Specials at letsgetlunch.nyc
          </p>
          <p id="signup-modal-body" className="text-[13px] font-normal text-gray-900 leading-[1.35] mt-2">
            Claim your free account. NYC&apos;s best sit-down lunches, right around the corner.
          </p>
        </div>
        <div className="grid grid-cols-2 border-t border-black/10">
          <button
            onClick={() => close('button')}
            style={{ color: IOS_BLUE }}
            className="py-[11px] text-[17px] font-normal border-r border-black/10 active:bg-black/5"
          >
            Not Now
          </button>
          <button
            onClick={handleSignUp}
            style={{ color: IOS_BLUE }}
            className="py-[11px] text-[17px] font-normal active:bg-black/5"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
