'use client';
import MapComponent from './components/Map';
import NeighborhoodSearch from './components/NeighborhoodSearch';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  cuisine: string;
  emoji: string;
  work_friendly: boolean;
  walk_in: boolean;
  wifi: boolean;
  rating: number;
  seats: number;
  hours: string;
  photo_url: string | null;
  photo_urls: string[] | null;
  deals: { special: string; price: number; courses: number }[];
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState(100);
  const [laptopOnly, setLaptopOnly] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [walkInOnly, setWalkInOnly] = useState(false);
  const [selectedHood, setSelectedHood] = useState('');
  const mapPanRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const [userFirstName, setUserFirstName] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*, deals(*)')
      .eq('is_active', true);
    if (!error && data) setRestaurants(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('name').eq('id', user.id).single().then(({ data }) => {
          if (data?.name) setUserFirstName(data.name.split(' ')[0]);
        });
      }
    }).catch(() => {});
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filters = ['All','Italian','Japanese/Sushi','Asian','French','American','Seafood','Mediterranean','Latin/Mexican','Indian','Vegan-Friendly','Steakhouse','BBQ'];

  const filtered = restaurants.filter(r => {
    const deal = r.deals?.[0];
    if (!deal) return false;
    // Filter by today's day
    const todayDay = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
    const days = deal.days && deal.days.length > 0 ? deal.days : ['Mon','Tue','Wed','Thu','Fri'];
    if (!days.includes(todayDay)) return false;
    if (selectedHood) {
      if (!r.neighborhood.toLowerCase().includes(selectedHood.toLowerCase())) return false;
    } else if (search) {
      const s = search.toLowerCase();
      const keywords: Record<string, boolean> = {
        'laptop': r.work_friendly, 'wifi': r.wifi, 'wi-fi': r.wifi,
        'quiet': !r.work_friendly, 'walk-in': r.walk_in, 'walkin': r.walk_in,
        'outlets': r.work_friendly, 'work': r.work_friendly,
      };
      const keywordMatch = Object.entries(keywords).some(([k, v]) => s.includes(k) && v);
      const textMatch = r.name.toLowerCase().includes(s) || r.neighborhood.toLowerCase().includes(s) || r.cuisine.toLowerCase().includes(s) || deal.special.toLowerCase().includes(s);
      if (!keywordMatch && !textMatch) return false;
    }
    if (filter === 'Vegan-Friendly' && !r.cuisine.toLowerCase().includes('vegan')) return false;
    if (filter === 'Seafood' && !r.cuisine.toLowerCase().includes('seafood')) return false;
    if (filter === 'Asian' && !r.cuisine.toLowerCase().includes('asian')) return false;
    if (filter === 'Japanese/Sushi' && !r.cuisine.toLowerCase().includes('japanese') && !r.cuisine.toLowerCase().includes('sushi')) return false;
    if (filter === 'Latin/Mexican' && !r.cuisine.toLowerCase().includes('latin') && !r.cuisine.toLowerCase().includes('mexican')) return false;
    if (!['All','Vegan-Friendly','Seafood','Asian','Japanese/Sushi','Latin/Mexican'].includes(filter) && !r.cuisine.toLowerCase().includes(filter.toLowerCase().split('/')[0])) return false;
    if (deal.price > maxPrice) return false;
    if (laptopOnly && !r.work_friendly) return false;
    if (wifiOnly && !r.wifi) return false;
    if (walkInOnly && !r.walk_in) return false;
    return true;
  });

  function specialsLeft(id: string): number {
    const n = id.replace(/-/g, '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return (n % 7) + 4;
  }

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-900 text-lg">Let&apos;s Get Lunch</span>
        </div>
        <div className="flex gap-3">
{userFirstName ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Hi, {userFirstName}</span>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
                className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
            </div>
          ) : (
            <a href="/login" className="text-sm bg-[#4A9FD5] text-white px-4 py-1.5 rounded-full font-medium hover:bg-[#3a8fc5]">Sign in</a>
          )}
        </div>
      </nav>

      <section className="bg-gradient-to-b from-[#EEF6FC] to-white px-4 pt-6 pb-4 text-center">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
          NYC&apos;s best lunch deals, <span className="text-[#4A9FD5]">at the table.</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-xl mx-auto mb-4">
          Prix-fixe deals across NYC · Real tables · Most under $35
        </p>
        <div className="max-w-lg mx-auto flex gap-2 mb-4">
          <NeighborhoodSearch
            onChange={val => { setSearch(val); if (!val) setSelectedHood(''); }}
            onSelect={(hood, borough, coords) => {
              setSearch(hood);
              setSelectedHood(hood);
              if (coords && mapPanRef.current) mapPanRef.current(coords.lat, coords.lng);
            }}
          />
          <button className="bg-[#4A9FD5] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#3a8fc5]">
            Search
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 justify-start md:justify-center">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-[#4A9FD5] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-4 mt-2 justify-center">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={laptopOnly} onChange={e => setLaptopOnly(e.target.checked)} className="rounded" />
            💻 Laptop friendly
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={wifiOnly} onChange={e => setWifiOnly(e.target.checked)} className="rounded" />
            📶 Free WiFi
          </label>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Max: ${maxPrice === 100 ? "Any" : "$"+maxPrice}</span>
            <input type="range" min="20" max="100" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} className="w-16" />
          </div>
        </div>
      </section>

      <MapComponent onPanReady={(fn) => { mapPanRef.current = fn; }} activeIds={filtered.map(r => r.id)} />

      <section className="px-4 py-3">
        {loading
          ? <p className="text-sm text-gray-400">Loading restaurants...</p>
          : <p className="text-sm text-gray-500">{filtered.length} lunch specials available today</p>
        }
      </section>

      <section className="px-4 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-gray-50 rounded-2xl border border-gray-100 h-64 animate-pulse" />
          ))
        ) : (
          filtered.map(r => {
            const deal = r.deals?.[0];
            return (
              <a key={r.id} href={`/restaurants/${r.id}`}
                className="block bg-white rounded-2xl border border-gray-200 hover:border-[#4A9FD5] hover:shadow-md transition-all no-underline">
                <div className="h-44 rounded-t-2xl overflow-hidden bg-gray-50">
                  {r.photo_url
                    ? <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-6xl">{r.emoji}</div>
                  }
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900">{r.name}</h3>
                    <span className="font-bold text-[#4A9FD5] text-lg">${deal?.price}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{r.neighborhood} · {r.cuisine} · {r.hours}</p>
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">{deal?.special}</p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {(() => {
                      const days = deal?.days || ['Mon','Tue','Wed','Thu','Fri'];
                      if (days.length === 7) return <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full">Daily</span>;
                      if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) return <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full">Mon–Fri</span>;
                      return <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full">{days.join(', ')}</span>;
                    })()}
                    {r.work_friendly && <span className="text-xs bg-blue-50 text-[#4A9FD5] px-2 py-1 rounded-full font-medium">💻 Work-friendly</span>}
                    {r.wifi && <span className="text-xs bg-blue-50 text-[#4A9FD5] px-2 py-1 rounded-full font-medium">📶 WiFi</span>}
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">🔥 {specialsLeft(r.id)} specials left</span>
                  </div>
                  <div className="w-full py-2.5 bg-[#4A9FD5] text-white rounded-xl text-sm font-medium text-center">
                    View deal
                  </div>
                </div>
              </a>
            );
          })
        )}
      </section>

      <section className="bg-[#EEF6FC] px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Empty tables at lunch?</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">Join Let&apos;s Get Lunch and fill your midday seats.</p>
        <a href="/list-your-restaurant" className="inline-block bg-[#4A9FD5] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#3a8fc5]">
          List your restaurant — it&apos;s free
        </a>
      </section>

      <footer className="px-4 py-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-700">Let&apos;s Get Lunch</span>
          <span className="text-gray-400 text-sm">· NYC · 2026</span>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/list-your-restaurant" className="hover:text-gray-600">For Restaurants</a>
          <a href="/login" className="hover:text-gray-600">Sign In</a>
          <a href="/admin" className="hover:text-gray-600">Admin</a>
        </div>
      </footer>
    </main>
  );
}
