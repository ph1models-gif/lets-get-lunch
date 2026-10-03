'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { validatePassword, PASSWORD_RULES } from '../../lib/password';
import PasswordInput from '../components/PasswordInput';


export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'update'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check if we have a recovery token in the URL (user clicked email link)
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setStep('update');
    }

    // Listen for password recovery event
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('update');
      }
    });
  }, []);

  async function handleRequestReset() {
    setLoading(true); setError(''); setSuccess('');
    if (!email) { setError('Please enter your email.'); setLoading(false); return; }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.letsgetlunch.nyc/reset-password',
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Check your email — we sent a password reset link.');
    }
    setLoading(false);
  }

  async function handleUpdatePassword() {
    setLoading(true); setError('');
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); setLoading(false); return; }
    if (password !== confirmPassword) {
      setError('Passwords do not match.'); setLoading(false); return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password updated! Redirecting...');
      setTimeout(() => { window.location.href = '/'; }, 2000);
    }
    setLoading(false);
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A9FD5]";

  return (
    <main className="min-h-screen bg-[#EEF6FC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl">🍽️</span>
              <span className="text-2xl font-bold text-gray-900">Let&apos;s Get Lunch</span>
            </div>
          </a>
          <h1 className="text-xl font-semibold text-gray-800">
            {step === 'request' ? 'Reset your password' : 'Set a new password'}
          </h1>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</p>}
          {success && <p className="text-green-600 text-sm bg-green-50 px-4 py-3 rounded-xl mb-4">{success}</p>}

          {step === 'request' && !success && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" className={inputClass} />
              </div>
              <button onClick={handleRequestReset} disabled={loading}
                className="w-full bg-[#4A9FD5] text-white py-3.5 rounded-xl font-semibold hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </div>
          )}

          {step === 'update' && !success && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                <PasswordInput value={password} onChange={setPassword}
                  placeholder="New password" autoComplete="new-password" className={inputClass} />
                <p className="text-gray-500 text-xs mt-1">{PASSWORD_RULES}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword}
                  placeholder="Type password again" autoComplete="new-password" className={inputClass} />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
                )}
              </div>
              <button onClick={handleUpdatePassword} disabled={loading}
                className="w-full bg-[#4A9FD5] text-white py-3.5 rounded-xl font-semibold hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <a href="/login" rel="nofollow" className="text-[#4A9FD5] font-medium hover:underline">Back to sign in</a>
          </p>
        </div>
      </div>
    </main>
  );
}
