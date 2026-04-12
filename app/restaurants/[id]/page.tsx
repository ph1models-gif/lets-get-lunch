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
            <span>💺 {r.seats} seats left</span>
            <span>🍽️ {deal?.courses}-course</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`rounded-xl p-4 text-sm font-medium flex flex-col items-center gap-1 ${r.work_friendly ? 'bg-blue-50 text-[#4A9FD5]' : 'bg-gray-50 text-gray-400'}`}>
            <span>💻</span>
            <span>{r.work_friendly ? 'Laptop ok' : 'No laptops'}</span>
          </div>
          <div className={`rounded-xl p-4 text-sm font-medium flex flex-col items-center gap-1 ${r.walk_in ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
            <span>🚶</span>
            <span>{r.walk_in ? 'Walk-ins' : 'Resy only'}</span>
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

        <button className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors mb-3">
          Reserve a table
        </button>
        <p className="text-center text-xs text-gray-400">Free to reserve · Cancel anytime</p>
      </div>

      <footer className="px-4 py-8 border-t border-gray-100 text-center mt-8">
        <p className="text-sm text-gray-400">© 2026 Let&apos;s Get Lunch · NYC</p>
      </footer>
    </main>
  );
}
