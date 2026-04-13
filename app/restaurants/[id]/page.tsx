'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  cuisine: string;
  emoji: string;
  work_friendly: boolean;
  walk_in: boolean;
  wifi: boolean;
  rating: number;
  seats: number;
  hours: string;
  bio: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  deals: { special: string; price: number; courses: number }[];
}

export default function RestaurantPage() {
  const { id } = useParams();
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'form'|'success'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [resCode, setResCode] = useState('');
  const [form, setForm] = useState({ name:'', contact:'', party_size:'2', preferred_time:'12:00 pm', note:'' });
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [r, setR] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('restaurants')
        .select('*, deals(*)')
        .eq('id', id)
        .single();
      setR(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🍽️</div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </main>
  );

  if (!r) return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h1>
        <a href="/" className="text-[#4A9FD5] hover:underline">Back to home</a>
      </div>
    </main>
  );

  const deal = r.deals?.[0];
  const specialsLeft = (() => {
    const n = r.id.replace(/-/g, '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    return (n % 7) + 4;
  })();

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-[#4A9FD5] hover:underline text-sm font-medium">
          &larr; Back to results
        </a>
        <a href="/list-your-restaurant" className="text-sm text-gray-500 hover:text-gray-700">For restaurants</a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero photo */}
        {(activePhoto || r.photo_url) ? (
          <div className="w-full h-64 rounded-2xl overflow-hidden mb-3">
            <img src={activePhoto || r.photo_url!} alt={r.name} className="w-full h-full object-cover transition-all duration-300" />
          </div>
        ) : (
          <div className="w-full h-64 bg-[#EEF6FC] rounded-2xl flex items-center justify-center text-8xl mb-3">
            {r.emoji}
          </div>
        )}
        {/* Thumbnail strip */}
        {(r.photo_url || (r.photo_urls && r.photo_urls.length > 0)) && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {r.photo_url && (
              <div
                key="main"
                onMouseEnter={() => setActivePhoto(r.photo_url)}
                onMouseLeave={() => setActivePhoto(null)}
                className={`w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all ${(!activePhoto || activePhoto === r.photo_url) ? 'border-[#4A9FD5]' : 'border-transparent'}`}
              >
                <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
              </div>
            )}
            {r.photo_urls && r.photo_urls.map((url, i) => (
              <div
                key={i}
                onMouseEnter={() => setActivePhoto(url)}
                onMouseLeave={() => setActivePhoto(null)}
                className={`w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all ${activePhoto === url ? 'border-[#4A9FD5]' : 'border-transparent'}`}
              >
                <img src={url} alt={`${r.name} photo ${i + 2}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{r.name}</h1>
            <p className="text-gray-500 mt-1">{r.neighborhood} · {r.cuisine}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-[#4A9FD5]">${deal?.price}</span>
            <p className="text-xs text-gray-400">per person</p>
          </div>
        </div>

        {r.bio && (
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">{r.bio}</p>
        )}
        <div className="flex items-center gap-1 mb-6">
          <span className="text-gray-400 text-sm">Prix-fixe lunch</span>
        </div>

        <div className="bg-[#EEF6FC] rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-lg">Today&apos;s lunch deal</h2>
          <p className="text-gray-700 text-base leading-relaxed mb-4">{deal?.special}</p>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>🕐 {r.hours}</span>
            <span>🔥 {specialsLeft} specials left</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`rounded-xl p-4 text-sm font-medium flex flex-col items-center gap-1 ${r.work_friendly ? 'bg-blue-50 text-[#4A9FD5]' : 'bg-gray-50 text-gray-400'}`}>
            <span>💻</span>
            <span>{r.work_friendly ? 'Laptop ok' : 'No laptops'}</span>
          </div>
<div className={`rounded-xl p-4 text-sm font-medium flex flex-col items-center gap-1 ${r.wifi ? 'bg-blue-50 text-[#4A9FD5]' : 'bg-gray-50 text-gray-400'}`}>
            <span>📶</span>
            <span>{r.wifi ? 'Free WiFi' : 'No WiFi'}</span>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl p-4 mb-8 flex items-center gap-3">
          <span className="text-xl">📍</span>
          <div>
            <p className="text-sm font-medium text-gray-900">{r.address}</p>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(r.address)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4A9FD5] hover:underline">
              Open in Google Maps
            </a>
          </div>
        </div>

        <button
          onClick={() => { setShowModal(true); setModalStep('form'); }}
          className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors mb-3">
          Reserve this lunch special
        </button>
        <p className="text-center text-xs text-gray-400">Free to reserve · Instant confirmation code</p>

        {/* Reservation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">×</button>

              {modalStep === 'form' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Reserve your lunch special</h2>
                  <p className="text-sm text-gray-500 mb-5">{r.name} · ${deal?.price} per person</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                      <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                        placeholder="First and last name"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A9FD5]" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email or phone</label>
                      <input value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))}
                        placeholder="your@email.com or (212) 555-0100"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A9FD5]" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Party size</label>
                      <div className="flex gap-3">
                        {['1','2','3','4'].map(n => (
                          <button key={n} onClick={() => setForm(f => ({...f, party_size: n}))}
                            className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${form.party_size === n ? 'border-[#4A9FD5] bg-[#EEF6FC] text-[#4A9FD5]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred time</label>
                      <select value={form.preferred_time} onChange={e => setForm(f => ({...f, preferred_time: e.target.value}))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A9FD5]">
                        {['11:30 am','12:00 pm','12:30 pm','1:00 pm','1:30 pm','2:00 pm'].map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quick note <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))}
                        placeholder="e.g. Quiet corner if possible"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A9FD5]" />
                    </div>

                    <button
                      disabled={submitting || !form.name || !form.contact}
                      onClick={async () => {
                        setSubmitting(true);
                        try {
                          const res = await fetch('/api/reserve', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              restaurant_id: r.id,
                              restaurant_name: r.name,
                              restaurant_email: null,
                              name: form.name,
                              contact: form.contact,
                              party_size: parseInt(form.party_size),
                              preferred_time: form.preferred_time,
                              note: form.note,
                            })
                          });
                          const data = await res.json();
                          if (data.code) { setResCode(data.code); setModalStep('success'); }
                        } catch(e) { console.error(e); }
                        setSubmitting(false);
                      }}
                      className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
                      {submitting ? 'Sending...' : 'Send Reservation Request'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re confirmed!</h2>
                  <p className="text-gray-500 mb-6">Show this code at {r.name} to receive your lunch special</p>
                  <div className="bg-[#EEF6FC] rounded-2xl py-6 px-8 mb-6">
                    <p className="text-xs text-gray-500 mb-2">Your reservation code</p>
                    <p className="text-4xl font-bold text-[#4A9FD5] tracking-widest">{resCode}</p>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">{form.contact.includes('@') ? 'A confirmation has been sent to your email.' : 'Screenshot this code for your records.'}</p>
                  <button onClick={() => setShowModal(false)} className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="px-4 py-8 border-t border-gray-100 text-center mt-8">
        <p className="text-sm text-gray-400">© 2026 Let&apos;s Get Lunch · NYC</p>
      </footer>
    </main>
  );
}
