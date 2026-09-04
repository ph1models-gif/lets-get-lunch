'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { NEIGHBORHOODS } from '../../../lib/neighborhoods';

type Deal = { id: string; special: string; price: number; days: string[] | null; times: string | null };
type Restaurant = {
  id: string; name: string; address: string; neighborhood: string; cuisine: string;
  hours: string | null; bio: string | null; photo_url: string | null;
  work_friendly: boolean | null; wifi: boolean | null; is_active: boolean; deals?: Deal[];
};

const inputClass = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-base focus:outline-none focus:border-[#4A9FD5]";

export default function EditorPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Restaurant>>>({});
  const [dealDrafts, setDealDrafts] = useState<Record<string, Partial<Deal>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function load(adminOverride?: boolean) {
    const admin = adminOverride ?? isAdmin;
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, address, neighborhood, cuisine, hours, bio, photo_url, work_friendly, wifi, is_active, deals(id, special, price, days, times)')
      .order('name');
    let rows = (data as any as Restaurant[]) || [];

    // The DB's public-read policy lets any signed-in editor see every active
    // restaurant, not just the ones they're granted (writes stay correctly
    // scoped either way) - filter client-side to what this editor can
    // actually edit, using restaurant_permissions, which editors can read
    // for their own user_id. Admins see everything, as intended.
    if (!admin) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perms } = await supabase
        .from('restaurant_permissions')
        .select('restaurant_id')
        .eq('user_id', user?.id);
      const granted = new Set((perms || []).map((p: any) => p.restaurant_id));
      rows = rows.filter(r => granted.has(r.id));
    }
    setRestaurants(rows);
  }

  async function toggleActive(r: Restaurant) {
    setTogglingId(r.id);
    const { data, error } = await supabase.from('restaurants').update({ is_active: !r.is_active }).eq('id', r.id).select('id');
    setTogglingId(null);
    if (error) { alert(`Couldn't update: ${error.message}`); return; }
    if (!data || data.length === 0) { alert("Couldn't update: you no longer have edit access to this restaurant — ask the admin to grant it."); }
    await load();
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/admin/login'); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
      if (data?.role !== 'editor' && data?.role !== 'admin') { router.push('/admin/login'); return; }
      const admin = data.role === 'admin';
      setIsAdmin(admin);
      setChecking(false);
      await load(admin);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function field(r: Restaurant, key: keyof Restaurant) {
    return (drafts[r.id]?.[key] ?? r[key]) as any;
  }

  function setField(r: Restaurant, key: keyof Restaurant, value: any) {
    setDrafts(prev => ({ ...prev, [r.id]: { ...prev[r.id], [key]: value } }));
  }

  async function saveRestaurant(r: Restaurant) {
    const draft = drafts[r.id];
    if (!draft) return;
    setSaving(r.id);
    const { data, error } = await supabase.from('restaurants').update(draft).eq('id', r.id).select('id');
    setSaving(null);
    if (error) { alert(`Couldn't save: ${error.message}`); return; }
    if (!data || data.length === 0) { alert("Couldn't save: you no longer have edit access to this restaurant — ask the admin to grant it."); await load(); return; }
    setDrafts(prev => { const n = { ...prev }; delete n[r.id]; return n; });
    setSavedFlash(r.id);
    setTimeout(() => setSavedFlash(null), 1500);
    await load();
  }

  function dealField(d: Deal, key: keyof Deal) {
    return (dealDrafts[d.id]?.[key] ?? d[key]) as any;
  }

  function setDealField(d: Deal, key: keyof Deal, value: any) {
    setDealDrafts(prev => ({ ...prev, [d.id]: { ...prev[d.id], [key]: value } }));
  }

  async function saveDeal(d: Deal) {
    const draft = dealDrafts[d.id];
    if (!draft) return;
    setSaving(d.id);
    const { data, error } = await supabase.from('deals').update(draft).eq('id', d.id).select('id');
    setSaving(null);
    if (error) { alert(`Couldn't save: ${error.message}`); return; }
    if (!data || data.length === 0) { alert("Couldn't save: you no longer have edit access to this restaurant — ask the admin to grant it."); await load(); return; }
    setDealDrafts(prev => { const n = { ...prev }; delete n[d.id]; return n; });
    setSavedFlash(d.id);
    setTimeout(() => setSavedFlash(null), 1500);
    await load();
  }

  if (checking) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your restaurants</h1>
        <p className="text-sm text-gray-500 mb-6">
          You can edit listing details and specials for the restaurants below — nothing else on the site.
        </p>

        {restaurants.length === 0 && (
          <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-2xl p-5">
            You don&apos;t have access to any restaurants yet — ask the admin to grant you access.
          </p>
        )}

        <div className="space-y-3">
          {restaurants.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="font-medium text-gray-900 flex items-center gap-2">
                  {r.name}
                  {!r.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Hidden</span>}
                </span>
                <span className="text-gray-400 text-sm">{r.neighborhood}</span>
              </button>

              {expanded === r.id && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${r.is_active ? 'bg-gray-50' : 'bg-amber-50'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.is_active ? 'Listing is visible' : 'Listing is hidden'}</p>
                      <p className="text-xs text-gray-500">{r.is_active ? "Hide it if they're no longer running the lunch special." : "Hidden from the site, but not deleted — nothing is lost."}</p>
                    </div>
                    <button onClick={() => toggleActive(r)} disabled={togglingId === r.id}
                      className={`text-sm px-3 py-1.5 rounded-lg border font-medium disabled:opacity-50 ${r.is_active ? 'border-amber-200 text-amber-700 hover:bg-amber-100' : 'border-green-200 text-green-700 hover:bg-green-100'}`}>
                      {togglingId === r.id ? 'Working…' : r.is_active ? 'Hide listing' : 'Show listing'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input className={inputClass} value={field(r, 'name') || ''} onChange={e => setField(r, 'name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                    <input className={inputClass} value={field(r, 'address') || ''} onChange={e => setField(r, 'address', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Neighborhood</label>
                      <select className={inputClass} value={field(r, 'neighborhood') || ''} onChange={e => setField(r, 'neighborhood', e.target.value)}>
                        {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cuisine</label>
                      <input className={inputClass} value={field(r, 'cuisine') || ''} onChange={e => setField(r, 'cuisine', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
                    <input className={inputClass} value={field(r, 'hours') || ''} onChange={e => setField(r, 'hours', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Bio</label>
                    <textarea className={inputClass} rows={3} value={field(r, 'bio') || ''} onChange={e => setField(r, 'bio', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Photo URL</label>
                    <input className={inputClass} value={field(r, 'photo_url') || ''} onChange={e => setField(r, 'photo_url', e.target.value)} />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!!field(r, 'work_friendly')} onChange={e => setField(r, 'work_friendly', e.target.checked)} className="w-4 h-4 accent-[#4A9FD5]" />
                      Work-friendly
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!!field(r, 'wifi')} onChange={e => setField(r, 'wifi', e.target.checked)} className="w-4 h-4 accent-[#4A9FD5]" />
                      Wifi
                    </label>
                  </div>
                  <button onClick={() => saveRestaurant(r)} disabled={!drafts[r.id] || saving === r.id}
                    className="bg-[#4A9FD5] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3a8fc5] disabled:opacity-50">
                    {saving === r.id ? 'Saving…' : savedFlash === r.id ? 'Saved ✓' : 'Save listing details'}
                  </button>

                  {r.deals && r.deals.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-gray-50 space-y-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase">Lunch specials</h3>
                      {r.deals.map(d => (
                        <div key={d.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Special</label>
                            <textarea className={inputClass} rows={2} value={dealField(d, 'special') || ''} onChange={e => setDealField(d, 'special', e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Price ($)</label>
                              <input type="number" className={inputClass} value={dealField(d, 'price') ?? ''} onChange={e => setDealField(d, 'price', Number(e.target.value))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Times</label>
                              <input className={inputClass} placeholder="e.g. 11:30am–2:30pm" value={dealField(d, 'times') || ''} onChange={e => setDealField(d, 'times', e.target.value)} />
                            </div>
                          </div>
                          <button onClick={() => saveDeal(d)} disabled={!dealDrafts[d.id] || saving === d.id}
                            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium text-sm hover:bg-gray-50 disabled:opacity-50">
                            {saving === d.id ? 'Saving…' : savedFlash === d.id ? 'Saved ✓' : 'Save special'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
