'use client';
import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';
import { supabase } from '../../lib/supabase';
import { APPLE_AUTH_ENABLED } from '../../lib/auth';

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

export default function SignupPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', neighborhood: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loginHref, setLoginHref] = useState('/login');

  useEffect(() => {
    setLoginHref(`/login${window.location.search}`);
  }, []);

  async function handleSignUp() {
    setLoading(true); setError('');
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('All fields are required.'); setLoading(false); return;
    }
    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); setLoading(false); return; }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); setLoading(false); return;
    }
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id, name: fullName,
        email: form.email,
        neighborhood: form.neighborhood || null,
      });
      track('signup_completed');
      setSuccess(true);
      const raw = new URLSearchParams(window.location.search).get('next') || '';
      const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
      setTimeout(() => { window.location.href = safe; }, 2000);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true); setError('');
    // Already signed in (e.g. a stale /signup bookmark or tab): don't kick off
    // a fresh OAuth round trip, which would silently swap in whichever
    // Google account gets picked - just continue on as the current session.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const raw = new URLSearchParams(window.location.search).get('next') || '';
      const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
      window.location.href = safe;
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const raw = new URLSearchParams(window.location.search).get('next') || '';
      const safe = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
      window.location.href = safe;
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback${window.location.search}` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4A9FD5]";

  return (
    <main className="min-h-screen bg-[#EEF6FC] flex items-start justify-center px-4 pt-6 pb-12">
      <div className="w-full max-w-md relative">
        <a href="/" aria-label="Close" className="absolute top-6 right-0 sm:-right-2 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-400 hover:text-gray-700 text-xl z-10">×</a>
        <div className="text-center mb-8">
          <a href="/">
            <div className="inline-flex items-center gap-2 mb-4">
              <img src="/logo.jpg" alt="Let's Get Lunch" className="h-36 w-auto rounded-2xl" />
            </div>
          </a>
          <h1 className="text-xl font-semibold text-gray-800">Create your free account</h1>
          <p className="text-sm text-gray-500 mt-1">Claim exclusive NYC lunch specials — free to join</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          {success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in!</h2>
              <p className="text-gray-500 text-sm">Taking you to Let&apos;s Get Lunch...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

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
                  <input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))}
                    placeholder="First" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))}
                    placeholder="Last" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  placeholder="your@email.com" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  placeholder="Min 8 chars, uppercase, number, symbol" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({...f, confirmPassword: e.target.value}))}
                  placeholder="Type password again" className={inputClass} />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your lunch neighborhood <span className="text-gray-400 font-normal">(optional)</span></label>
                <select value={form.neighborhood} onChange={e => setForm(f => ({...f, neighborhood: e.target.value}))} className={inputClass}>
                  <option value="">Select neighborhood</option>
                  {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button onClick={handleSignUp} disabled={loading}
                className="w-full bg-[#4A9FD5] text-white py-3.5 rounded-xl font-semibold text-base hover:bg-[#3a8fc5] transition-colors disabled:opacity-50 mt-2">
                {loading ? 'Creating account...' : 'Create free account'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <a href={loginHref} className="text-[#4A9FD5] font-medium hover:underline">Sign in</a>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ← <a href="/" className="hover:underline">Back to lunch specials</a>
        </p>
      </div>
    </main>
  );
}
