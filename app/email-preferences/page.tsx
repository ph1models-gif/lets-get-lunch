'use client';
import { useState, useEffect } from 'react';

const OPTIONS = [
  { value: 'daily', label: 'Daily', desc: "Today's exclusive lunches" },
  { value: 'weekly', label: 'Weekly', desc: 'The Monday roundup' },
  { value: 'monthly', label: 'Monthly', desc: 'Once a month' },
  { value: 'off', label: 'Off', desc: "No emails — I'll check the map myself" },
];

export default function EmailPreferences() {
  const [token, setToken] = useState('');
  const [freq, setFreq] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    if (!t) { setError('This link is missing its code.'); setLoading(false); return; }
    fetch(`/api/email-preferences?token=${encodeURIComponent(t)}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setFreq(d.frequency); else setError('This link is invalid or expired.'); })
      .catch(() => setError('Something went wrong.'))
      .finally(() => setLoading(false));
  }, []);

  async function save(newFreq: string) {
    setFreq(newFreq);
    setSaving(true); setSaved(false); setError('');
    try {
      const r = await fetch('/api/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, frequency: newFreq }),
      });
      const d = await r.json();
      if (d.ok) { setSaved(true); } else { setError('Could not save. Try again.'); }
    } catch { setError('Could not save. Try again.'); }
    setSaving(false);
  }

  const [unsubbed, setUnsubbed] = useState(false);
  async function unsubscribeAll() {
    setSaving(true); setError('');
    try {
      const r = await fetch('/api/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (d.ok) { setUnsubbed(true); setFreq('off'); } else { setError('Could not unsubscribe. Try again.'); }
    } catch { setError('Could not unsubscribe. Try again.'); }
    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#EEF6FC] flex items-start justify-center px-4 pt-10 pb-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <a href="/"><img src="/logo.jpg" alt="Let's Get Lunch" className="h-24 w-auto rounded-2xl inline-block" /></a>
          <h1 className="text-xl font-semibold text-gray-800 mt-4">Email preferences</h1>
          <p className="text-sm text-gray-500 mt-1">How often should we send you lunch?</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">Loading...</p>
          ) : error ? (
            <p className="text-center text-red-600 text-sm py-8">{error}</p>
          ) : (
            <>
              {OPTIONS.map(o => (
                <button key={o.value} onClick={() => save(o.value)} disabled={saving}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-2 border transition-colors ${freq === o.value ? 'border-[#4A9FD5] bg-[#EEF6FC]' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <span className="font-medium text-gray-900">{o.label}</span>
                  <span className="block text-xs text-gray-500">{o.desc}</span>
                </button>
              ))}
              {saved && <p className="text-center text-sm text-[#4A9FD5] mt-3 font-medium">Saved ✓</p>}
              <p className="text-center mt-5">
                {unsubbed ? (
                  <span className="text-xs text-gray-500">You&apos;ve been unsubscribed. You can still browse and claim specials anytime.</span>
                ) : (
                  <button onClick={unsubscribeAll} disabled={saving} className="text-xs text-gray-500 hover:underline">Unsubscribe from all emails</button>
                )}
              </p>
            </>
          )}
        </div>
      </div>
      <p className="text-center mt-5">
        <a href="/" className="text-sm text-[#4A9FD5] hover:underline">← Back to lunch specials</a>
      </p>
    </main>
  );
}
