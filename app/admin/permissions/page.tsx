'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

type Restaurant = { id: string; name: string; neighborhood: string | null };
type Editor = { user_id: string; email: string | null; restaurant_ids: string[] };

export default function AdminPermissionsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  }

  async function loadEditors() {
    const res = await fetch('/api/admin/list-editors', { headers: await authHeader() });
    const json = await res.json();
    if (res.ok) setEditors(json.editors || []);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (data?.role !== 'admin') { router.push('/admin/login'); return; }
      setChecking(false);

      const { data: rests } = await supabase.from('restaurants').select('id, name, neighborhood').order('name');
      setRestaurants(rests || []);
      await loadEditors();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    setError('');
    const res = await fetch('/api/admin/invite-editor', {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const json = await res.json();
    setInviting(false);
    if (!res.ok) { setError(json.error || 'Failed to send invite'); return; }
    setInviteEmail('');
    await loadEditors();
  }

  async function toggleAccess(restaurantId: string, grant: boolean) {
    if (!selectedEditor) return;
    setBusyIds(prev => new Set(prev).add(restaurantId));
    const res = await fetch(`/api/admin/${grant ? 'grant-access' : 'revoke-access'}`, {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedEditor, restaurant_id: restaurantId }),
    });
    if (res.ok) await loadEditors();
    setBusyIds(prev => { const n = new Set(prev); n.delete(restaurantId); return n; });
  }

  const currentEditor = editors.find(e => e.user_id === selectedEditor);
  const grantedSet = useMemo(() => new Set(currentEditor?.restaurant_ids || []), [currentEditor]);
  const filteredRestaurants = useMemo(
    () => restaurants.filter(r => r.name.toLowerCase().includes(search.toLowerCase())),
    [restaurants, search]
  );

  if (checking) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Editor access</h1>
          <a href="/admin/edit-history" className="text-sm text-[#4A9FD5] hover:underline">Edit history &rarr;</a>
        </div>
        <p className="text-sm text-gray-500 mb-6">Grant staff (like Olga) edit access to specific restaurants — nothing else.</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Invite a new editor</h2>
          <div className="flex gap-2">
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="editor@example.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#4A9FD5]" />
            <button onClick={handleInvite} disabled={inviting}
              className="bg-[#4A9FD5] text-white px-5 py-3 rounded-xl font-semibold hover:bg-[#3a8fc5] disabled:opacity-50 whitespace-nowrap">
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 h-fit">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Editors</h2>
            {editors.length === 0 && <p className="text-sm text-gray-400">No editors yet.</p>}
            <div className="space-y-1">
              {editors.map(ed => (
                <button key={ed.user_id} onClick={() => setSelectedEditor(ed.user_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedEditor === ed.user_id ? 'bg-[#EEF6FC] text-[#4A9FD5] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {ed.email || ed.user_id}
                  <span className="block text-xs text-gray-400">{ed.restaurant_ids.length} restaurant{ed.restaurant_ids.length === 1 ? '' : 's'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            {!selectedEditor ? (
              <p className="text-sm text-gray-400">Select an editor to manage their restaurant access.</p>
            ) : (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search restaurants…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base mb-3 focus:outline-none focus:border-[#4A9FD5]" />
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
                  {filteredRestaurants.map(r => {
                    const granted = grantedSet.has(r.id);
                    const busy = busyIds.has(r.id);
                    return (
                      <label key={r.id} className="flex items-center justify-between py-2.5 px-1 cursor-pointer">
                        <span className="text-sm text-gray-800">
                          {r.name}
                          {r.neighborhood && <span className="text-gray-400"> · {r.neighborhood}</span>}
                        </span>
                        <input type="checkbox" checked={granted} disabled={busy}
                          onChange={e => toggleAccess(r.id, e.target.checked)}
                          className="w-5 h-5 accent-[#4A9FD5]" />
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
