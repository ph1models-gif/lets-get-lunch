'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

type Change = { field: string; before: any; after: any };
type Entry = {
  id: string;
  tableName: 'restaurants' | 'deals';
  rowId: string;
  restaurantName: string | null;
  isDeal: boolean;
  dealSpecial: string | null;
  editorEmail: string;
  createdAt: string;
  changes: Change[];
};

function displayValue(v: any) {
  if (v === null || v === undefined || v === '') return '(empty)';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(empty)';
  return String(v);
}

export default function EditHistoryPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/edit-history', { headers: await authHeader() });
    const json = await res.json();
    if (res.ok) setEntries(json.entries || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (data?.role !== 'admin') { router.push('/admin/login'); return; }
      setChecking(false);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function revert(id: string) {
    if (!confirm('Undo this change? This restores the old value for the field(s) below.')) return;
    setRevertingId(id);
    setError('');
    const res = await fetch('/api/admin/revert-edit', {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    setRevertingId(null);
    if (!res.ok) { setError(json.error || 'Failed to revert'); return; }
    await load();
  }

  if (checking) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <a href="/admin/permissions" className="text-sm text-[#4A9FD5] hover:underline">&larr; Editor access</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Edit history</h1>
        <p className="text-sm text-gray-500 mb-6">
          Every change to a listing or lunch special, most recent first — who made it, and what changed.
          Changes go live immediately; use Undo here if one needs fixing.
        </p>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-2xl p-5">No edits logged yet.</p>
        )}

        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {e.restaurantName || '(unknown restaurant)'}
                    {e.isDeal && <span className="text-gray-400 font-normal"> · lunch special</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {e.editorEmail} · {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => revert(e.id)} disabled={revertingId === e.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap">
                  {revertingId === e.id ? 'Undoing…' : 'Undo'}
                </button>
              </div>
              <div className="space-y-1">
                {e.changes.map((c, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    <span className="font-medium">{c.field}</span>: {' '}
                    <span className="text-gray-400 line-through">{displayValue(c.before)}</span>
                    {' → '}
                    <span>{displayValue(c.after)}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
