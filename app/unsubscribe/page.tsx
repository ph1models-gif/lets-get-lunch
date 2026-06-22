'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (!email) { setStatus('error'); return; }
    setStatus('working');
    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(r => r.json())
      .then(d => setStatus(d.ok ? 'done' : 'error'))
      .catch(() => setStatus('error'));
  }, [email]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', background: '#fff', padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
        {status === 'working' && <p style={{ color: '#666', fontSize: 16 }}>Updating your preferences…</p>}
        {status === 'done' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 8 }}>You're unsubscribed</h1>
            <p style={{ color: '#666', fontSize: 16, lineHeight: 1.5 }}>
              We won't email <strong>{email}</strong> about lunch deals anymore. You can still browse
              {' '}<a href="https://www.letsgetlunch.nyc" style={{ color: '#4A9FD5', textDecoration: 'none' }}>Let's Get Lunch</a> anytime.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#666', fontSize: 16, lineHeight: 1.5 }}>
              We couldn't process that unsubscribe link. Email
              {' '}<a href="mailto:hello@letsgetlunch.nyc" style={{ color: '#4A9FD5', textDecoration: 'none' }}>hello@letsgetlunch.nyc</a> and we'll take care of it.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading…</p></div>}>
      <UnsubscribeInner />
    </Suspense>
  );
}
