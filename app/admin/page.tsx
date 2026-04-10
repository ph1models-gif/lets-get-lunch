'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';

interface Vendor {
  id: string;
  restaurant_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  neighborhood: string;
  cuisine: string;
  seats: string;
  hours: string;
  special: string;
  price: string;
  work_friendly: string;
  wifi: string;
  message: string;
  status: string;
  created_at: string;
  photo_url: string | null;
  photo_urls: string[] | null;
}

export default function AdminPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);

  const ADMIN_PASSWORD = 'lunch2026';

  useEffect(() => {
    if (authed) loadVendors();
  }, [authed]);

  async function loadVendors() {
    setLoading(true);
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });
    setVendors(data || []);
    setLoading(false);
  }

  async function approve(v: Vendor) {
    setProcessing(v.id);
    const { data: rest } = await supabase
      .from('restaurants')
      .insert({
        name: v.restaurant_name,
        neighborhood: v.neighborhood,
        address: v.address,
        cuisine: v.cuisine,
        emoji: '🍽️',
        work_friendly: v.work_friendly === 'yes',
        walk_in: true,
        wifi: v.wifi === 'yes',
        rating: 4.5,
        seats: parseInt(v.seats) || 10,
        hours: v.hours,
        is_active: true,
        photo_url: v.photo_url || null,
        photo_urls: v.photo_urls || null,
      })
      .select()
      .single();

    if (rest) {
      await supabase.from('deals').insert({
        restaurant_id: rest.id,
        special: v.special,
        price: parseFloat(v.price.replace('$', '')),
        courses: 2,
      });
    }

    await supabase.from('vendors').update({ status: 'approved' }).eq('id', v.id);
    await loadVendors();
    setProcessing(null);
  }

  async function reject(id: string) {
    setProcessing(id);
    await supabase.from('vendors').update({ status: 'rejected' }).eq('id', id);
    await loadVendors();
    setProcessing(null);
  }

  if (!authed) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-gray-900">Admin access</h1>
          <p className="text-gray-500 text-sm mt-1">Let&apos;s Get Lunch</p>
        </div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setAuthed(password === ADMIN_PASSWORD)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#4A9FD5] mb-3"
        />
        <button
          onClick={() => setAuthed(password === ADMIN_PASSWORD)}
          className="w-full bg-[#4A9FD5] text-white py-3 rounded-xl font-medium hover:bg-[#3a8fc5]">
          Sign in
        </button>
        {password && password !== ADMIN_PASSWORD && (
          <p className="text-red-500 text-sm text-center mt-3">Incorrect password</p>
        )}
      </div>
    </main>
  );

  const pending = vendors.filter(v => v.status === 'pending');
  const approved = vendors.filter(v => v.status === 'approved');
  const rejected = vendors.filter(v => v.status === 'rejected');

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-900">Admin</span>
          <span className="text-gray-400 text-sm">· Let&apos;s Get Lunch</span>
        </div>
        <a href="/" className="text-sm text-[#4A9FD5] hover:underline">View site</a>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-amber-500">{pending.length}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-green-500">{approved.length}</div>
            <div className="text-sm text-gray-500">Approved</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <div className="text-2xl font-bold text-red-400">{rejected.length}</div>
            <div className="text-sm text-gray-500">Rejected</div>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">Loading submissions...</p>
        ) : pending.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500">No pending submissions</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Pending review ({pending.length})</h2>
            {pending.map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {(v.photo_url || (v.photo_urls && v.photo_urls.length > 0)) && (
                  <div className="flex gap-2 p-4 pb-0">
                    {v.photo_url && (
                      <div className="relative">
                        <Image src={v.photo_url} alt="Main photo" width={160} height={120} className="w-40 h-28 object-cover rounded-xl" unoptimized />
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">Main</span>
                      </div>
                    )}
                    {v.photo_urls && v.photo_urls.map((url, i) => (
                      <Image key={i} src={url} alt={`Photo ${i+1}`} width={120} height={120} className="w-28 h-28 object-cover rounded-xl" unoptimized />
                    ))}
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{v.restaurant_name}</h3>
                      <p className="text-gray-500 text-sm">{v.neighborhood} · {v.cuisine}</p>
                      <p className="text-gray-400 text-xs mt-1">{new Date(v.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(v)}
                        disabled={processing === v.id}
                        className="bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                        {processing === v.id ? '...' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => reject(v.id)}
                        disabled={processing === v.id}
                        className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-200 disabled:opacity-50">
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border-t border-gray-50 pt-4">
                    <div><span className="text-gray-400">Deal:</span> <span className="text-gray-700">{v.special}</span></div>
                    <div><span className="text-gray-400">Price:</span> <span className="text-gray-700">{v.price}</span></div>
                    <div><span className="text-gray-400">Hours:</span> <span className="text-gray-700">{v.hours}</span></div>
                    <div><span className="text-gray-400">Seats:</span> <span className="text-gray-700">{v.seats}</span></div>
                    <div><span className="text-gray-400">Address:</span> <span className="text-gray-700">{v.address}</span></div>
                    <div><span className="text-gray-400">Laptop:</span> <span className="text-gray-700">{v.work_friendly}</span></div>
                    <div><span className="text-gray-400">WiFi:</span> <span className="text-gray-700">{v.wifi}</span></div>
                    <div><span className="text-gray-400">Contact:</span> <span className="text-gray-700">{v.contact_name}</span></div>
                    <div><span className="text-gray-400">Email:</span> <span className="text-gray-700">{v.email}</span></div>
                    <div><span className="text-gray-400">Phone:</span> <span className="text-gray-700">{v.phone}</span></div>
                    {v.message && <div className="col-span-2"><span className="text-gray-400">Notes:</span> <span className="text-gray-700">{v.message}</span></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {approved.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold text-gray-900 mb-4">Recently approved ({approved.length})</h2>
            <div className="space-y-2">
              {approved.map(v => (
                <div key={v.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {v.photo_url && (
                      <Image src={v.photo_url} alt="" width={40} height={40} className="w-10 h-10 object-cover rounded-lg" unoptimized />
                    )}
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{v.restaurant_name}</span>
                      <span className="text-gray-400 text-xs ml-2">{v.neighborhood}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Approved</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
