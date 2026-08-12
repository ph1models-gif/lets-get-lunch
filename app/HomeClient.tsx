'use client';
import dynamic from 'next/dynamic';
import MapComponent from './components/Map';
import NeighborhoodSearch from './components/NeighborhoodSearch';
import StickySignupButton from './components/StickySignupButton';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Image from 'next/image';
import { HOMEPAGE_RESTAURANT_SELECT, Restaurant } from './types';
import { getCookie } from '../lib/cookies';
import { SIGNUP_MODAL_DELAY_MS, SIGNUP_MODAL_COOKIE } from '../lib/signupModal';

// Lazy-loaded: the modal is never needed for LCP (it's intentionally delayed
// by SIGNUP_MODAL_DELAY_MS anyway), so keep it out of the initial bundle.
const SignupModal = dynamic(() => import('./components/SignupModal'), { ssr: false });

const CARD_MIN_HEIGHT = 'min-h-[384px]';

export default function HomeClient({ initialRestaurants }: { initialRestaurants: Restaurant[] }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(100);
  const [laptopOnly, setLaptopOnly] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [walkInOnly, setWalkInOnly] = useState(false);
  const [selectedHood, setSelectedHood] = useState('');
  const mapPanRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const [mapBounds, setMapBounds] = useState<{north: number, south: number, east: number, west: number} | null>(null);
  const [userFirstName, setUserFirstName] = useState('');
  const [claimMode, setClaimMode] = useState(false);
  const [loginHref, setLoginHref] = useState('/login');
  const [showSignupModal, setShowSignupModal] = useState(false);
  // Kept in sync via effect below so the delayed timer always reads the
  // current logged-in state instead of a stale closure value.
  const userFirstNameRef = useRef('');
  useEffect(() => { userFirstNameRef.current = userFirstName; }, [userFirstName]);

  const handleLocationSettled = useCallback(() => {
    // Scoped to /claim only — the rest of the site is unaffected. Read the
    // path directly (rather than the claimMode state) so this is correct
    // regardless of timing relative to the mount effect that sets it.
    if (!window.location.pathname.startsWith('/claim')) return;
    setTimeout(() => {
      if (userFirstNameRef.current) return; // logged in, never show
      if (getCookie(SIGNUP_MODAL_COOKIE)) return; // already seen within the last 7 days
      setShowSignupModal(true);
    }, SIGNUP_MODAL_DELAY_MS);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/claim')) {
      setClaimMode(true);
    }
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    const safe = path.startsWith('/') && !path.startsWith('//') ? path : '/';
    setLoginHref(`/login?next=${safe}`);
  }, []);

  async function refreshRestaurants() {
    const { data, error } = await supabase
      .from('restaurants')
      .select(HOMEPAGE_RESTAURANT_SELECT)
      .eq('is_active', true);
    if (!error && data) setRestaurants(data as unknown as Restaurant[]);
  }

  useEffect(() => {
    // Initial list already came from the server (see page.tsx); only
    // re-fetch on refocus so edits made elsewhere (admin, /claim) show up
    // without a full reload.
    window.addEventListener('focus', refreshRestaurants);
    // Check auth state and listen for changes
    const checkUser = async (user: any) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('name').eq('id', user.id).single();
        if (data?.name) setUserFirstName(data.name.split(' ')[0]);
        else setUserFirstName('there');
      } else {
        setUserFirstName('');
      }
    };
    supabase.auth.getUser().then(({ data: { user } }) => checkUser(user)).catch(() => {});
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user ?? null);
    });
    return () => {
      window.removeEventListener('focus', refreshRestaurants);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const CUISINE_PILLS: { label: string; value: string }[] = [
    { label: 'Italian', value: 'Italian' },
    { label: 'American', value: 'American' },
    { label: 'Japanese/Sushi', value: 'Japanese/Sushi' },
    { label: 'French', value: 'French' },
    { label: 'Mediterranean', value: 'Mediterranean' },
    { label: 'Mexican/Latin', value: 'Mexican/Latin' },
    { label: 'Steakhouse', value: 'Steakhouse' },
    { label: 'Thai', value: 'Thai' },
    { label: 'Indian', value: 'Indian' },
    { label: 'Greek', value: 'Greek' },
    { label: 'Seafood', value: 'Seafood' },
    { label: 'Korean', value: 'Korean' },
    { label: 'Spanish', value: 'Spanish' },
    { label: 'Vegan', value: 'Vegan/Plant-Based' },
  ];
  const togglePill = (v: string) => setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const filtered = restaurants.filter(r => {
    const deal = r.deals?.[0];
    if (!deal) return false;
    // Filter by map bounds (if map has reported them and restaurant has coords)
    if (mapBounds && r.lat != null && r.lng != null) {
      if (r.lat > mapBounds.north || r.lat < mapBounds.south) return false;
      if (r.lng > mapBounds.east || r.lng < mapBounds.west) return false;
    }
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
    if (selected.length > 0 && !selected.includes(r.cuisine)) return false;
    if (deal.price > maxPrice) return false;
    if (laptopOnly && !r.work_friendly) return false;
    if (wifiOnly && !r.wifi) return false;
    if (walkInOnly && !r.walk_in) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <div className="flex flex-col leading-tight md:hidden">
            <span className="font-[family-name:var(--font-bebas)] tracking-wide text-2xl text-gray-900">Let&apos;s Get <span className="text-[#4A9FD5]">Lunch</span></span>
            <span className="text-[11px] text-gray-500 -mt-0.5">NYC&apos;s best lunch specials, <span className="text-[#4A9FD5]">at the table.</span></span>
          </div>
          <span className="hidden md:block font-semibold text-gray-900 text-lg">Let&apos;s Get Lunch</span>
        </div>
        <div className="flex gap-3">
{userFirstName ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Hi, {userFirstName}</span>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
                className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
            </div>
          ) : (
            claimMode ? (
              <a href="/signup" className="text-sm bg-gray-900 text-white px-5 py-2 rounded-full font-semibold hover:bg-black shadow-sm text-center leading-tight max-w-[140px] sm:max-w-none">Claim <span className="text-[#4A9FD5]">exclusive</span> specials</a>
            ) : (
              <a href={loginHref} className="text-sm bg-[#4A9FD5] text-white px-4 py-1.5 rounded-full font-medium hover:bg-[#3a8fc5]">Sign in</a>
            )
          )}
        </div>
      </nav>

      <section className="bg-gradient-to-b from-[#EEF6FC] to-white px-4 pt-3 pb-3 md:pt-6 md:pb-4 text-center">
        <h1 className="hidden md:block text-2xl md:text-4xl font-bold text-gray-900 mb-2">
          NYC&apos;s best lunch specials, <span className="text-[#4A9FD5]">at the table.</span>
        </h1>
        <p className="hidden md:block text-gray-500 text-sm max-w-xl mx-auto mb-4">
          Prix-fixe specials across NYC · Real tables · Most under $35
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
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 justify-start md:justify-center">
          {CUISINE_PILLS.map(p => (
            <button key={p.value} onClick={() => togglePill(p.value)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selected.includes(p.value) ? 'bg-[#4A9FD5] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {p.label}
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

      <MapComponent onPanReady={(fn) => { mapPanRef.current = fn; }} activeIds={filtered.map(r => r.id)} onBoundsChange={setMapBounds} onLocationSettled={handleLocationSettled} restaurants={restaurants} />

      <section className="px-4 py-3">
        <p className="text-sm text-gray-500">{filtered.length} lunch {filtered.length === 1 ? 'special' : 'specials'} in this area · Scroll for details ↓</p>
      </section>

      <section className="px-4 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r, idx) => {
          const deal = r.deals?.[0];
          const isExclusive = !!deal?.is_exclusive;
          return (
            <a key={r.id} href={`/restaurants/${r.slug}`}
              className={`block bg-white rounded-2xl border hover:shadow-md transition-all no-underline ${CARD_MIN_HEIGHT} ${isExclusive ? 'border-2 border-[#4A9FD5]' : 'border-gray-200 hover:border-[#4A9FD5]'}`}>
              <div className="h-44 rounded-t-2xl overflow-hidden bg-gray-50 relative">
                {r.photo_url
                  ? <Image
                      src={r.photo_url}
                      alt={r.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      priority={idx < 2}
                    />
                  : <div className="w-full h-full flex items-center justify-center text-6xl">{r.emoji}</div>
                }
              </div>
              <div className="p-4">
                {isExclusive && (
                  <span className="inline-block mb-2 text-xs font-semibold bg-[#4A9FD5] text-white px-3 py-1 rounded-full">
                    ✦ Exclusive
                  </span>
                )}
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900">{r.name}</h3>
                  <span className="font-bold text-[#4A9FD5] text-lg">${deal?.price}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{r.neighborhood} · {r.cuisine} · {r.hours}</p>
                <p className="text-sm text-gray-700 mb-3 leading-relaxed line-clamp-2">{deal?.special}</p>
                <div className="flex gap-2 flex-wrap mb-3">
                  {(() => {
                    const days = deal?.days || ['Mon','Tue','Wed','Thu','Fri'];
                    if (days.length === 7) return <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full">Daily</span>;
                    if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) return <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full">Mon–Fri</span>;
                    return <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-full">{days.join(', ')}</span>;
                  })()}
                  {r.work_friendly && <span className="text-xs bg-blue-50 text-[#4A9FD5] px-2 py-1 rounded-full font-medium">💻 Work-friendly</span>}
                  {r.wifi && <span className="text-xs bg-blue-50 text-[#4A9FD5] px-2 py-1 rounded-full font-medium">📶 WiFi</span>}
                </div>
                <div className="w-full py-2.5 bg-[#4A9FD5] text-white rounded-xl text-sm font-medium text-center">
                  {isExclusive ? 'View exclusive special' : 'View special'}
                </div>
              </div>
            </a>
          );
        })}
      </section>

      <section className="bg-[#EEF6FC] px-4 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-gray-200">

          {/* For diners */}
          <div className="text-center md:px-8">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">For diners</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Know someone who&apos;d love this?</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">Share Let&apos;s Get Lunch with a friend who eats out often.</p>
            <button onClick={async () => {
              const shareData = { title: 'Let\'s Get Lunch', text: 'Check out the best prix-fixe lunch specials in NYC!', url: 'https://www.letsgetlunch.nyc' };
              if (navigator.share) {
                try { await navigator.share(shareData); } catch (e) { /* user cancelled */ }
              } else {
                try {
                  await navigator.clipboard.writeText('https://www.letsgetlunch.nyc');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (e) { /* clipboard failed */ }
              }
            }}
              className="inline-block bg-white border border-[#4A9FD5] text-[#4A9FD5] px-8 py-3 rounded-xl font-medium hover:bg-blue-50 transition-colors">
              {copied ? '✓ Link copied' : '📤 Share it'}
            </button>
          </div>

          {/* Mobile-only divider */}
          <div className="md:hidden border-t border-gray-200 my-2"></div>

          {/* For restaurants */}
          <div className="text-center md:px-8">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">For restaurants</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Got a great lunch special?</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">List it on Let&apos;s Get Lunch — free, takes 5 minutes.</p>
            <a href="/list-your-restaurant" className="inline-block bg-[#4A9FD5] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#3a8fc5] transition-colors">
              List your lunch special
            </a>
          </div>

          {/* Mobile-only divider */}
          <div className="md:hidden border-t border-gray-200 my-2"></div>

          {/* Newsletter */}
          <div className="text-center md:px-8">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">The newsletter</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">The best curated lunch specials in NYC.</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">See what&apos;s new.</p>
            <a href="/newsletter" className="inline-block bg-white border border-[#4A9FD5] text-[#4A9FD5] px-8 py-3 rounded-xl font-medium hover:bg-blue-50 transition-colors">
              Read the newsletter →
            </a>
          </div>

        </div>
      </section>

      <footer className="px-4 py-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-700">Let&apos;s Get Lunch</span>
          <span className="text-gray-400 text-sm">· NYC · 2026</span>
          <a href="https://instagram.com/letsgetlunch.nyc" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="ml-2 text-gray-300 hover:text-[#4A9FD5] transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.18 8.8 2.16 12 2.16zm0 5.68a4.16 4.16 0 100 8.32 4.16 4.16 0 000-8.32zm0 6.86a2.7 2.7 0 110-5.4 2.7 2.7 0 010 5.4zm4.34-6.98a.97.97 0 100-1.94.97.97 0 000 1.94z"/></svg>
          </a>
          <a href="https://tiktok.com/@lets.get.lunch" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-gray-300 hover:text-[#4A9FD5] transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.6 5.82A4.28 4.28 0 0115.54 3h-3.09v12.4a2.59 2.59 0 01-2.59 2.5 2.59 2.59 0 01-2.59-2.59 2.59 2.59 0 013.39-2.47V9.7a5.68 5.68 0 00-.8-.06A5.68 5.68 0 004.2 15.3 5.68 5.68 0 009.86 21a5.68 5.68 0 005.66-5.7V8.85a7.35 7.35 0 004.3 1.38V7.14a4.28 4.28 0 01-3.22-1.32z"/></svg>
          </a>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/list-your-restaurant" className="hover:text-gray-600">For Restaurants</a>
          <a href="mailto:hello@letsgetlunch.nyc" className="hover:text-gray-600">Contact Us</a>
          <a href="/privacy" className="hover:text-gray-600">Privacy</a>
          <a href="/terms" className="hover:text-gray-600">Terms</a>
          {userFirstName ? (
            <>
              <span className="text-gray-600">Hi, {userFirstName}</span>
              <button onClick={async () => { await supabase.auth.signOut(); setUserFirstName(''); }} className="hover:text-gray-600">Sign Out</button>
            </>
          ) : (
            <a href="/login" className="hover:text-gray-600">Sign In</a>
          )}
        </div>
      </footer>

      {claimMode && !userFirstName && <StickySignupButton href={loginHref.replace('/login', '/signup')} />}
      {showSignupModal && <SignupModal onClose={() => setShowSignupModal(false)} />}
    </main>
  );
}
