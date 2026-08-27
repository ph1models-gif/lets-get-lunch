'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#4A9FD5]";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'loading' | 'signin' | 'setPassword'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const isInvite = typeof window !== 'undefined' && window.location.hash.includes('type=invite');
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isInvite) {
        setMode('setPassword');
      } else if (session) {
        await routeByRole();
      } else {
        setMode('signin');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function routeByRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMode('signin'); return; }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (data?.role === 'admin') { router.push('/admin/permissions'); return; }
    if (data?.role === 'editor') { router.push('/admin/editor'); return; }
    setError('Your account has no admin/editor role assigned yet. Contact the site admin.');
    setMode('signin');
    await supabase.auth.signOut();
  }

  async function handleSignIn() {
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) { setError('Incorrect email or password.'); return; }
    await routeByRole();
  }

  async function handleSetPassword() {
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== password2) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) { setError('Failed to set password. Please try again.'); return; }
    await routeByRole();
  }

  if (mode === 'loading') return null;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">
          {mode === 'setPassword' ? 'Set your password' : 'Staff sign in'}
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          {mode === 'setPassword' ? "You've been invited — set a password to finish setting up your account." : "Let's Get Lunch admin/editor access"}
        </p>

        {mode === 'signin' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleSignIn} disabled={submitting}
              className="w-full bg-[#4A9FD5] text-white py-3.5 rounded-xl font-semibold hover:bg-[#3a8fc5] disabled:opacity-50">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        )}

        {mode === 'setPassword' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} className={inputClass} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={handleSetPassword} disabled={submitting}
              className="w-full bg-[#4A9FD5] text-white py-3.5 rounded-xl font-semibold hover:bg-[#3a8fc5] disabled:opacity-50">
              {submitting ? 'Saving…' : 'Set password & continue'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
