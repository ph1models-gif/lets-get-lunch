'use client';
import { useState, FormEvent } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function subscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/newsletter-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('done');
      } else {
        setStatus('error');
        setError(data.error || 'Something went wrong. Try again.');
      }
    } catch {
      setStatus('error');
      setError('Something went wrong. Try again.');
    }
  }

  if (status === 'done') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 text-center">
        <p className="text-[#4A9FD5] font-medium">You&apos;re subscribed — check your inbox for a confirmation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
      <p className="text-center font-semibold text-gray-900 mb-1">Get it in your inbox</p>
      <p className="text-center text-sm text-gray-500 mb-4">Weekly lunch picks from Let&apos;s Get Lunch. Unsubscribe anytime.</p>
      <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#4A9FD5]"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-[#4A9FD5] text-white rounded-xl px-6 py-3 font-semibold hover:bg-[#3a8fc5] disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm mt-2 text-center">{error}</p>}
    </div>
  );
}
