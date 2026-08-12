'use client';
import { useCallback, useEffect } from 'react';
import { track } from '@vercel/analytics';
import { setCookie } from '../../lib/cookies';
import { SIGNUP_MODAL_COOKIE, SIGNUP_MODAL_SUPPRESS_DAYS } from '../../lib/signupModal';

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6"
      onClick={() => close('backdrop')}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[270px] bg-white/95 backdrop-blur rounded-2xl shadow-xl overflow-hidden text-center"
      >
        <div className="px-5 pt-5 pb-4">
          <p id="signup-modal-title" className="text-[15px] font-semibold text-gray-900 mb-1">
            Let&apos;s Get Lunch
          </p>
          <p className="text-[13px] text-gray-600 leading-snug">
            Exclusive NYC lunch specials — free account, no reservation needed.
          </p>
        </div>
        <div className="grid grid-cols-2 border-t border-gray-200">
          <button
            onClick={() => close('button')}
            className="py-3 text-[15px] text-gray-600 border-r border-gray-200 active:bg-gray-50"
          >
            Not now
          </button>
          <button
            onClick={handleSignUp}
            className="py-3 text-[15px] font-semibold text-[#4A9FD5] active:bg-gray-50"
          >
            Sign up free
          </button>
        </div>
      </div>
    </div>
  );
}
