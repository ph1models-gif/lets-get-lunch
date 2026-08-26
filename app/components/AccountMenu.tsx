'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { NEIGHBORHOODS } from '../../lib/neighborhoods';

export default function AccountMenu({ userFirstName }: { userFirstName: string }) {
  const [open, setOpen] = useState(false);
  const [showClaims, setShowClaims] = useState(false);
  const [showArea, setShowArea] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        Hi, {userFirstName}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          <button
            onClick={() => { setShowClaims(true); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            My Claims
          </button>
          <button
            onClick={() => { setShowArea(true); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Preferred Lunch Area
          </button>
          <button
            onClick={() => { setShowSettings(true); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Account Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      )}
      {showClaims && <MyClaimsModal onClose={() => setShowClaims(false)} />}
      {showArea && <PreferredAreaModal onClose={() => setShowArea(false)} />}
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 relative max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function MyClaimsModal({ onClose }: { onClose: () => void }) {
  const [claims, setClaims] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('You need to be signed in.'); return; }
      try {
        const res = await fetch('/api/account/claims', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!res.ok) { setError(json.error || 'Failed to load claims.'); return; }
        setClaims(json.claims);
      } catch (e) {
        setError('Failed to load claims.');
      }
    })();
  }, []);

  return (
    <ModalShell title="My Claims" onClose={onClose}>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && claims === null && <p className="text-sm text-gray-500">Loading…</p>}
      {!error && claims?.length === 0 && <p className="text-sm text-gray-500">You haven&apos;t claimed any exclusive specials yet.</p>}
      {claims && claims.length > 0 && (
        <div className="space-y-3">
          {claims.map((c, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-900">{c.restaurant_name || 'Restaurant'}</p>
              {c.special && <p className="text-xs text-gray-500 mb-1">{c.special}</p>}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold text-[#4A9FD5]">{c.display_code}</span>
                {c.created_at && (
                  <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function PreferredAreaModal({ onClose }: { onClose: () => void }) {
  const [neighborhood, setNeighborhood] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('neighborhood').eq('id', user.id).single();
      if (data?.neighborhood) setNeighborhood(data.neighborhood);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('You need to be signed in.'); setSaving(false); return; }
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ neighborhood: neighborhood || null })
      .eq('id', user.id);
    setSaving(false);
    if (updateErr) { setError('Failed to save. Please try again.'); return; }
    setSaved(true);
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <ModalShell title="Preferred Lunch Area" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-4">
        Pick the neighborhood you usually eat lunch in — the map will open centered there.
      </p>
      <select
        value={neighborhood}
        onChange={(e) => setNeighborhood(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base mb-4 focus:outline-none focus:border-[#4A9FD5]"
      >
        <option value="">No preference</option>
        {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-full text-sm font-semibold text-white bg-[#4A9FD5] hover:bg-[#3a8fc5] disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
      </button>
    </ModalShell>
  );
}

const EMAIL_FREQUENCY_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: 'daily', label: 'Daily', desc: "Today's exclusive lunches" },
  { value: 'weekly', label: 'Weekly', desc: 'The Monday roundup' },
  { value: 'monthly', label: 'Monthly', desc: 'Once a month' },
  { value: 'off', label: 'Off', desc: "No emails — I'll check the map myself" },
];

function AccountSettingsModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<string | null>(null);
  const [savingFrequency, setSavingFrequency] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (user.email) setEmail(user.email);
      const { data } = await supabase.from('profiles').select('email_frequency').eq('id', user.id).single();
      setFrequency(data?.email_frequency || 'weekly');
    })();
  }, []);

  async function handleFrequencyChange(value: string) {
    const prev = frequency;
    setFrequency(value);
    setSavingFrequency(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFrequency(prev); setSavingFrequency(false); return; }
    const { error } = await supabase
      .from('profiles')
      .update({ email_frequency: value, email_pref_updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) setFrequency(prev);
    setSavingFrequency(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 relative max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-1">Email</p>
          <p className="text-sm text-gray-800">{email || '—'}</p>
        </div>
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-900 mb-1">Email frequency</p>
          <p className="text-xs text-gray-500 mb-3">How often should we send you lunch?</p>
          {EMAIL_FREQUENCY_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => handleFrequencyChange(o.value)}
              disabled={savingFrequency || frequency === null}
              className={`w-full text-left px-4 py-2.5 rounded-xl mb-2 border transition-colors disabled:opacity-60 ${frequency === o.value ? 'border-[#4A9FD5] bg-[#EEF6FC]' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <span className="text-sm font-medium text-gray-900">{o.label}</span>
              <span className="block text-xs text-gray-500">{o.desc}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Delete Account
          </button>
        </div>
      </div>
      {showDeleteConfirm && <DeleteAccountModal onClose={() => setShowDeleteConfirm(false)} />}
    </div>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('You need to be signed in to delete your account.');
        setDeleting(false);
        return;
      }
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Something went wrong. Please try again.');
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete your account?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This permanently deletes your account and profile. Any exclusive deal codes or reservation
          requests you&apos;ve made stay on record for our restaurant partners, but we remove your name
          and email from them — they can no longer be traced back to you.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          Type <span className="font-semibold">DELETE</span> to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base mb-4 focus:outline-none focus:border-red-400"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || deleting}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting…' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
