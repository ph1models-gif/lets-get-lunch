'use client';
import MapComponent from './components/Map';
import { useState } from 'react';

const restaurants = [
  { id: 1, name: "Osteria Morini", neighborhood: "SoHo", cuisine: "Italian", special: "Tagliatelle bolognese + arugula salad + tiramisu", price: 32, emoji: "🍝", workFriendly: true, rating: 4.8, seats: 12, hours: "11:30am–3pm" },
  { id: 2, name: "Sushi Yasuda", neighborhood: "Midtown East", cuisine: "Japanese", special: "8-piece omakase + miso soup + green tea", price: 35, emoji: "🍱", workFriendly: false, rating: 4.9, seats: 6, hours: "12pm–2:30pm" },
  { id: 3, name: "The Smith", neighborhood: "Midtown", cuisine: "American", special: "Burger + fries + house salad + soft drink", price: 28, emoji: "🍔", workFriendly: true, rating: 4.6, seats: 18, hours: "11am–3pm" },
  { id: 4, name: "Avra Estiatorio", neighborhood: "Midtown East", cuisine: "Greek", special: "Grilled branzino + Greek salad + baklava", price: 34, emoji: "🐟", workFriendly: false, rating: 4.7, seats: 8, hours: "12pm–3pm" },
  { id: 5, name: "Café Boulud", neighborhood: "Upper East Side", cuisine: "French", special: "Soupe du jour + steak frites + crème brûlée", price: 35, emoji: "🥩", workFriendly: true, rating: 4.8, seats: 10, hours: "12pm–2:30pm" },
  { id: 6, name: "Via Carota", neighborhood: "West Village", cuisine: "Italian", special: "Cacio e pepe + insalata verde + panna cotta", price: 30, emoji: "🍃", workFriendly: true, rating: 4.9, seats: 14, hours: "11:30am–3pm" },
  { id: 7, name: "Momofuku Noodle Bar", neighborhood: "East Village", cuisine: "Asian", special: "Ramen + steamed buns + soft drink", price: 26, emoji: "🍜", workFriendly: true, rating: 4.7, seats: 20, hours: "11am–3pm" },
  { id: 8, name: "Le Bernardin", neighborhood: "Midtown", cuisine: "French Seafood", special: "Tuna carpaccio + halibut + chocolate mousse", price: 35, emoji: "🦞", workFriendly: false, rating: 5.0, seats: 4, hours: "12pm–2:30pm" },
];

export default function Home() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [maxPrice, setMaxPrice] = useState(35);
  const [laptopOnly, setLaptopOnly] = useState(false);
  const [walkInOnly, setWalkInOnly] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [selected, setSelected] = useState<number|null>(null);

  const filters = ['All', 'Italian', 'Japanese/Sushi', 'French', 'American', 'Seafood', 'Mediterranean', 'Latin/Mexican', 'Indian', 'Vegan-Friendly', 'Steakhouse', 'BBQ', ];

  const filtered = restaurants.filter(r => {
    if (search) {
      const s = search.toLowerCase();
      const keywords: Record<string, boolean> = {
        'laptop': r.workFriendly, 'wifi': r.workFriendly, 'wi-fi': r.workFriendly,
        'quiet': !r.workFriendly, 'walk-in': r.walkIn, 'walkin': r.walkIn,
        'outlets': r.workFriendly, 'work': r.workFriendly,
      };
      const keywordMatch = Object.entries(keywords).some(([k, v]) => s.includes(k) && v);
      const textMatch = r.name.toLowerCase().includes(s) || r.neighborhood.toLowerCase().includes(s) || r.cuisine.toLowerCase().includes(s) || r.special.toLowerCase().includes(s);
      if (!keywordMatch && !textMatch) return false;
    }
    if (filter === 'Vegan-Friendly' && !r.cuisine.toLowerCase().includes('vegan')) return false;
    if (filter === 'Seafood' && !r.cuisine.toLowerCase().includes('seafood')) return false;
    if (!['All','Vegan-Friendly','Seafood'].includes(filter) && !r.cuisine.toLowerCase().includes(filter.toLowerCase().split('/')[0])) return false;
    if (r.price > maxPrice) return false;
    if (laptopOnly && !r.workFriendly) return false;
    if (walkInOnly && !r.walkIn) return false;
    if (veganOnly && !r.cuisine.toLowerCase().includes('vegan')) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-900 text-lg">Let&apos;s Get Lunch</span>
        </div>
        <div className="flex gap-3">
          <a href="/list-your-restaurant" className="text-sm text-[#4A9FD5] font-medium hover:underline">List your restaurant</a>
          <a href="/login" className="text-sm bg-[#4A9FD5] text-white px-4 py-1.5 rounded-full font-medium hover:bg-[#3a8fc5]">Sign in</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#EEF6FC] to-white px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          NYC&apos;s best lunch deals,<br />
          <span className="text-[#4A9FD5]">at the table — not the desk.</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
          Discover today’s best prix-fixe lunch deals in Manhattan, Brooklyn & beyond. Real tables, real service, real value — all under $35. Many spots have Wi-Fi, outlets, and zero judgment if you linger with your laptop.
        </p>
        <div className="max-w-lg mx-auto flex gap-2">
          <NeighborhoodSearch
            onChange={val => setSearch(val)}
            onSelect={(hood, borough, coords) => {
              setSearch(hood);
            }}
          />
          <button className="bg-[#4A9FD5] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#3a8fc5]">
            Search
          </button>
        </div>
      </section>

      <MapComponent />

      {/* Filters */}
      <section className="px-4 py-4 border-b border-gray-100 sticky top-[57px] bg-white z-40">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[#4A9FD5] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-2 whitespace-nowrap">
            <span className="text-sm text-gray-500">Max: ${maxPrice}</span>
            <input type="range" min="20" max="35" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} className="w-20" />
          </div>
        </div>
      </section>

      {/* Results count */}
      <section className="px-4 py-3">
        <p className="text-sm text-gray-500">{filtered.length} lunch specials available today</p>
      </section>

      {/* Restaurant grid */}
      <section className="px-4 pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => (
          <div
            key={r.id}
            onClick={() => setSelected(selected === r.id ? null : r.id)}
            className={`bg-white rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
              selected === r.id ? 'border-[#4A9FD5] shadow-md' : 'border-gray-200'
            }`}
          >
            {/* Food photo placeholder */}
            <div className={`h-44 rounded-t-2xl flex items-center justify-center text-6xl ${
              selected === r.id ? 'bg-[#EEF6FC]' : 'bg-gray-50'
            }`}>
              {r.emoji}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900">{r.name}</h3>
                <span className="font-bold text-[#4A9FD5] text-lg">${r.price}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{r.neighborhood} · {r.cuisine} · {r.hours}</p>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">{r.special}</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {r.workFriendly && (
                  <span className="text-xs bg-blue-50 text-[#4A9FD5] px-2 py-1 rounded-full font-medium">💻 Work-friendly</span>
                )}
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">⭐ {r.rating}</span>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{r.seats} seats left</span>
              </div>
              <button className="w-full py-2.5 bg-[#4A9FD5] text-white rounded-xl text-sm font-medium hover:bg-[#3a8fc5] transition-colors">
                Reserve a table
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* For restaurants CTA */}
      <section className="bg-[#EEF6FC] px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Empty tables at lunch?</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          Join Let&apos;s Get Lunch and fill your midday seats with customers who stay, order drinks, and come back.
        </p>
        <a href="/list-your-restaurant" className="inline-block bg-[#4A9FD5] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#3a8fc5]">
          List your restaurant — it&apos;s free
        </a>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-700">Let&apos;s Get Lunch</span>
          <span className="text-gray-400 text-sm">· NYC · 2026</span>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/about" className="hover:text-gray-600">About</a>
          <a href="/list-your-restaurant" className="hover:text-gray-600">For Restaurants</a>
          <a href="/login" className="hover:text-gray-600">Sign In</a>
        </div>
      </footer>
    </main>
  );
}
