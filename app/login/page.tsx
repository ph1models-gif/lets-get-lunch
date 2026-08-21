'use client';
import { useState } from 'react';
import { track } from '@vercel/analytics';
import { supabase } from '../../lib/supabase';
import { APPLE_AUTH_ENABLED } from '../../lib/auth';
import { Capacitor } from '@capacitor/core';

import { NEIGHBORHOODS, NEIGHBORHOOD_GROUPS } from '../../lib/neighborhoods';

// Apple's Human Interface Guidelines require their own wordmark ("Sign in
// with Apple", not "Continue with") and logo glyph on the button.
function AppleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.06 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.033-.013-3.182-1.22-3.215-4.857-.03-3.04 2.485-4.497 2.598-4.57-1.429-2.09-3.638-2.324-4.415-2.376-2.006-.163-3.688 1.09-4.591 1.09zm3.53-3.243c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.817-.78.896-1.454 2.338-1.276 3.715 1.336.104 2.71-.688 3.563-1.703z"/>
    </svg>
  );
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one symbol (e.g. !@#$).';
  return null;
}

export default function LoginPage() {
  const [tab, setTab] = useState<'signup'|'signin'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', neighborhood: ''
  });

  async function handleSignIn() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: signInForm.email, password: signInForm.password,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    const raw = new URLSearchParams(window.location.search).get('next') || '';
    const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
    window.location.href = safe;
  }

  async function handleGoogle() {
    setLoading(true); setError('');
    // Already signed in (e.g. a stale /login bookmark or tab): don't kick off
    // a fresh OAuth round trip, which would silently swap in whichever
    // Google account gets picked - just continue on as the current session.
    // getUser() (not getSession()) so a stale/expired local session can't
    // false-positive this check.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const raw = new URLSearchParams(window.location.search).get('next') || '';
      const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
      window.location.href = safe;
      return;
    }
    if (Capacitor.isNativePlatform()) {
      // Google refuses to load its sign-in screen inside this app's own
      // embedded webview - get the auth URL without letting Supabase
      // auto-redirect to it, and open it in the system in-app browser
      // instead. redirectTo points at this app's own custom URL scheme;
      // CapacitorAuthCallback.tsx (mounted in layout.tsx) catches it coming
      // back and finishes the sign-in - the website's own /auth/callback is
      // untouched by this and not part of the native path at all.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `nyc.letsgetlunch.app://auth-callback${window.location.search}`,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data?.url) { setError(error?.message || 'Could not start sign-in.'); setLoading(false); return; }
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: data.url });
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback${window.location.search}` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleApple() {
    setLoading(true); setError('');
    // Same already-signed-in guard as Google, above.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const raw = new URLSearchParams(window.location.search).get('next') || '';
      const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
      window.location.href = safe;
      return;
    }
    if (Capacitor.isNativePlatform()) {
      // Same native in-app-browser + custom-scheme handoff as Google, above.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `nyc.letsgetlunch.app://auth-callback${window.location.search}`,
          skipBrowserRedirect: true,
        },
      });
      if (error || !data?.url) { setError(error?.message || 'Could not start sign-in.'); setLoading(false); return; }
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: data.url });
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback${window.location.search}` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleSignUp() {
    setLoading(true); setError('');
    if (!signUpForm.firstName || !signUpForm.lastName || !signUpForm.email || !signUpForm.password) {
      setError('All fields except neighborhood are required.'); setLoading(false); return;
    }
    const pwError = validatePassword(signUpForm.password);
    if (pwError) { setError(pwError); setLoading(false); return; }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError('Passwords do not match. Please try again.'); setLoading(false); return;
    }
    const fullName = `${signUpForm.firstName.trim()} ${signUpForm.lastName.trim()}`;
    const { data, error } = await supabase.auth.signUp({
      email: signUpForm.email, password: signUpForm.password,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name: fullName,
        email: signUpForm.email,
        neighborhood: signUpForm.neighborhood || null,
      });
    }
    track('signup_completed');
    setSuccess("You're in! You can now make reservations.");
    const raw = new URLSearchParams(window.location.search).get('next') || '';
    const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
    setTimeout(() => { window.location.href = safe; }, 1500);
    setLoading(false);
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white focus:outline-none focus:border-[#4A9FD5]";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#EEF6FC] to-white flex flex-col items-center justify-center px-4">
      <a href="/" className="flex items-center gap-2 mb-8">
        <span className="text-2xl">🍽️</span>
        <span className="font-bold text-gray-900 text-xl">Let&apos;s Get Lunch</span>
      </a>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {(['signup','signin'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-4 bg-green-50 px-4 py-3 rounded-xl">{success}</p>}

        {tab === 'signup' ? (
          <div className="space-y-4">
            {APPLE_AUTH_ENABLED && (
              <button onClick={handleApple} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-medium text-base hover:bg-gray-900 transition-colors disabled:opacity-50">
                <AppleLogo />
                Sign in with Apple
              </button>
            )}
            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-700 py-3.5 rounded-xl font-medium text-base hover:bg-gray-50 transition-colors disabled:opacity-50">
              <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="" />
              Continue with Google
            </button>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                <input value={signUpForm.firstName} onChange={e => setSignUpForm(f => ({...f, firstName: e.target.value}))}
                  placeholder="First" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                <input value={signUpForm.lastName} onChange={e => setSignUpForm(f => ({...f, lastName: e.target.value}))}
                  placeholder="Last" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={signUpForm.email} onChange={e => setSignUpForm(f => ({...f, email: e.target.value}))}
                placeholder="your@email.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={signUpForm.password} onChange={e => setSignUpForm(f => ({...f, password: e.target.value}))}
                placeholder="Min 8 chars, uppercase, number, symbol" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input type="password" value={signUpForm.confirmPassword} onChange={e => setSignUpForm(f => ({...f, confirmPassword: e.target.value}))}
                placeholder="Type password again" className={inputClass} />
              {signUpForm.confirmPassword && signUpForm.password !== signUpForm.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your lunch neighborhood <span className="text-gray-400 font-normal">(optional)</span></label>
              <select value={signUpForm.neighborhood} onChange={e => setSignUpForm(f => ({...f, neighborhood: e.target.value}))}
                className={inputClass}>
                <option value="">Select neighborhood</option>
                {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <button onClick={handleSignUp} disabled={loading}
              className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50 mt-2">
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {APPLE_AUTH_ENABLED && (
              <button onClick={handleApple} disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-medium text-base hover:bg-gray-900 transition-colors disabled:opacity-50">
                <AppleLogo />
                Sign in with Apple
              </button>
            )}
            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-700 py-3.5 rounded-xl font-medium text-base hover:bg-gray-50 transition-colors disabled:opacity-50">
              <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="" />
              Continue with Google
            </button>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={signInForm.email} onChange={e => setSignInForm(f => ({...f, email: e.target.value}))}
                placeholder="your@email.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={signInForm.password} onChange={e => setSignInForm(f => ({...f, password: e.target.value}))}
                placeholder="Your password" className={inputClass} />
            </div>
            <p className="text-right">
              <a href="/reset-password" className="text-xs text-[#4A9FD5] hover:underline">Forgot password?</a>
            </p>
            <button onClick={handleSignIn} disabled={loading}
              className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <button onClick={() => setTab('signup')} className="text-[#4A9FD5] font-medium hover:underline">Create one free</button>
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-6"><a href="/" className="hover:text-gray-600">← Back to lunch specials</a></p>
    </main>
  );
}
