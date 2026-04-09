'use client';
import { useParams } from 'next/navigation';

const restaurants = [
  { id:1, name:"Osteria Morini", neighborhood:"SoHo", cuisine:"Italian", special:"Tagliatelle bolognese + arugula salad + tiramisu", price:32, emoji:"🍝", workFriendly:true, walkIn:true, rating:4.8, seats:12, hours:"11:30am–3pm", address:"218 Lafayette St, New York, NY" },
  { id:2, name:"Sushi Yasuda", neighborhood:"Midtown East", cuisine:"Japanese", special:"8-piece omakase + miso soup + green tea", price:35, emoji:"🍱", workFriendly:false, walkIn:false, rating:4.9, seats:6, hours:"12pm–2:30pm", address:"204 E 43rd St, New York, NY" },
  { id:3, name:"The Smith", neighborhood:"Midtown", cuisine:"American", special:"Burger + fries + house salad + soft drink", price:28, emoji:"🍔", workFriendly:true, walkIn:true, rating:4.6, seats:18, hours:"11am–3pm", address:"956 2nd Ave, New York, NY" },
  { id:4, name:"Avra Estiatorio", neighborhood:"Midtown East", cuisine:"Greek", special:"Grilled branzino + Greek salad + baklava", price:34, emoji:"🐟", workFriendly:false, walkIn:false, rating:4.7, seats:8, hours:"12pm–3pm", address:"141 E 48th St, New York, NY" },
  { id:5, name:"Cafe Boulud", neighborhood:"Upper East Side", cuisine:"French", special:"Soupe du jour + steak frites + creme brulee", price:35, emoji:"🥩", workFriendly:true, walkIn:false, rating:4.8, seats:10, hours:"12pm–2:30pm", address:"20 E 76th St, New York, NY" },
  { id:6, name:"Via Carota", neighborhood:"West Village", cuisine:"Italian", special:"Cacio e pepe + insalata verde + panna cotta", price:30, emoji:"🍃", workFriendly:true, walkIn:true, rating:4.9, seats:14, hours:"11:30am–3pm", address:"51 Grove St, New York, NY" },
  { id:7, name:"Momofuku Noodle Bar", neighborhood:"East Village", cuisine:"Asian", special:"Ramen + steamed buns + soft drink", price:26, emoji:"🍜", workFriendly:true, walkIn:true, rating:4.7, seats:20, hours:"11am–3pm", address:"171 1st Ave, New York, NY" },
  { id:8, name:"Le Bernardin", neighborhood:"Midtown", cuisine:"French Seafood", special:"Tuna carpaccio + halibut + chocolate mousse", price:35, emoji:"🦞", workFriendly:false, walkIn:false, rating:5.0, seats:4, hours:"12pm–2:30pm", address:"155 W 51st St, New York, NY" },
];

export default function RestaurantPage() {
  const { id } = useParams();
  const r = restaurants.find(x => x.id === Number(id));

  if (!r) return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h1>
        <a href="/" className="text-[#4A9FD5] hover:underline">Back to home</a>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-[#4A9FD5] hover:underline text-sm font-medium">
          &larr; Back to results
        </a>
        <a href="/list-your-restaurant" className="text-sm text-gray-500 hover:text-gray-700">For restaurants</a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="w-full h-56 bg-[#EEF6FC] rounded-2xl flex items-center justify-center text-8xl mb-6">
          {r.emoji}
        </div>

        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{r.name}</h1>
            <p className="text-gray-500 mt-1">{r.neighborhood} · {r.cuisine}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-[#4A9FD5]">${r.price}</span>
            <p className="text-xs text-gray-400">per person</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-6">
          <span className="text-yellow-400">★</span>
          <span className="font-medium text-gray-800">{r.rating}</span>
          <span className="text-gray-400 text-sm">· Prix-fixe lunch</span>
        </div>

        <div className="bg-[#EEF6FC] rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 text-lg">Today&apos;s lunch deal</h2>
          <p className="text-gray-700 text-base leading-relaxed mb-4">{r.special}</p>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>🕐 {r.hours}</span>
            <span>💺 {r.seats} seats left</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`rounded-xl p-4 text-sm font-medium flex items-center gap-2 ${r.workFriendly ? 'bg-blue-50 text-[#4A9FD5]' : 'bg-gray-50 text-gray-400'}`}>
            💻 {r.workFriendly ? 'Laptop friendly' : 'No laptops'}
          </div>
          <div className={`rounded-xl p-4 text-sm font-medium flex items-center gap-2 ${r.walkIn ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
            🚶 {r.walkIn ? 'Walk-ins welcome' : 'Reservation required'}
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
