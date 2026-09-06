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

// Word-level diff for text fields (bio, hours, address...). Instead of
// printing the whole old value and the whole new value - which makes a
// one-word edit in a long paragraph nearly impossible to spot - show the
// text once with only the added words highlighted and the removed words
// struck through. Standard LCS over whitespace-delimited tokens; the
// paragraphs here are short enough that the O(n*m) table is trivial.
type DiffPart = { type: 'same' | 'add' | 'del'; text: string };

function wordDiff(before: string, after: string): DiffPart[] {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { push('same', a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('del', a[i]); i++; }
    else { push('add', b[j]); j++; }
  }
  while (i < m) { push('del', a[i]); i++; }
  while (j < n) { push('add', b[j]); j++; }
  return parts;
}

// Plain-English labels for fields Brian actually recognizes; anything else
// falls back to turning the raw column name into "Title Case".
const FIELD_LABELS: Record<string, string> = {
  is_active: 'Visible on site',
  name: 'Restaurant name',
  address: 'Address',
  neighborhood: 'Neighborhood',
  cuisine: 'Cuisine',
  phone: 'Phone',
  website: 'Website',
  hours: 'Hours',
  bio: 'Description',
  photo_url: 'Main photo',
  photo_urls: 'Extra photos',
  wifi: 'Has wifi',
  work_friendly: 'Work-friendly',
  walk_in: 'Walk-ins accepted',
  seats: 'Seats',
  rating: 'Rating',
  special: 'Special',
  price: 'Price',
  days: 'Days offered',
  times: 'Times offered',
  is_exclusive: 'Exclusive (LGX) deal',
};

function fieldLabel(field: string) {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

// is_active reads better as a plain statement of what happened than as a
// yes/no diff - that's the field Brian actually asked to see more clearly.
function changeLine(c: Change) {
  if (c.field === 'is_active') {
    return c.after === false ? 'Hidden from the site' : 'Made visible on the site again';
  }
  return null;
}

// How to render the before/after of one changed field. Multi-word text edits
// get the highlighted word diff; everything else (yes/no toggles, prices,
// filling in or clearing a field) stays as a plain "old → new".
function ChangeDetail({ c }: { c: Change }) {
  const bothStrings = typeof c.before === 'string' && typeof c.after === 'string';
  const hasWords = bothStrings && (c.before.includes(' ') || c.after.includes(' '));
  const notHuge = bothStrings && c.before.length < 4000 && c.after.length < 4000;

  if (bothStrings && hasWords && notHuge && c.before !== '' && c.after !== '') {
    return (
      <>
        {wordDiff(c.before, c.after).map((p, k) => {
          if (p.text.trim() === '') return <span key={k}>{p.text}</span>;
          if (p.type === 'add') return <span key={k} className="bg-green-100 text-green-900 rounded px-0.5">{p.text}</span>;
          if (p.type === 'del') return <span key={k} className="bg-red-100 text-red-900 line-through rounded px-0.5">{p.text}</span>;
          return <span key={k}>{p.text}</span>;
        })}
      </>
    );
  }

  return (
    <>
      <span className="text-gray-400 line-through">{displayValue(c.before)}</span>
      {' → '}
      <span>{displayValue(c.after)}</span>
    </>
  );
}

export default function EditHistoryPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

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
      setEmail(user.email || '');
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
        <div className="flex items-center gap-3 text-sm">
          <a href="/admin/permissions" className="text-[#4A9FD5] hover:underline">&larr; Editor access</a>
          <a href="/admin" className="text-gray-500 hover:underline">Admin dashboard</a>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/admin/login'); }}
            className="text-gray-500 hover:underline"
          >
            Sign out{email ? ` (${email})` : ''}
          </button>
        </div>
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
                {e.changes.map((c, i) => {
                  const plain = changeLine(c);
                  return (
                    <p key={i} className="text-sm text-gray-700 leading-relaxed">
                      {plain ? (
                        <span className="font-medium">{plain}</span>
                      ) : (
                        <>
                          <span className="font-medium">{fieldLabel(c.field)}</span>: {' '}
                          <ChangeDetail c={c} />
                        </>
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
