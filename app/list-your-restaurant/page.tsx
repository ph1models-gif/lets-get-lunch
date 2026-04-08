'use client';
import { useState } from 'react';

export default function ListYourRestaurant() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    restaurant: '', contact: '', email: '', phone: '',
    address: '', neighborhood: '', cuisine: '', seats: '',
    hours: '', special: '', price: '', workFriendly: 'no',
    wifi: 'no', message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({...form, [e.target.name]: e.target.value});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#4A9FD5] focus:ring-1 focus:ring-[#4A9FD5]";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (submitted) return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">You're on the list!</h1>
        <p className="text-gray-500 mb-6">We'll review your restaurant and be in touch within 48 hours to get you set up on Let's Get Lunch.</p>
        <a href="/" className="inline-block bg-[#4A9FD5] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#3a8fc5]">Back to home</a>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-900">Let's Get Lunch</span>
        </a>
        <a href="/login" className="text-sm bg-[#4A9FD5] text-white px-4 py-1.5 rounded-full">Sign in</a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">🏪</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">List your restaurant</h1>
          <p className="text-gray-500 text-lg">Fill your empty lunch seats with customers who stay, order more, and come back. Free to get started.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            {emoji:'👥', title:'More customers', desc:'Fill daytime seats that would otherwise stay empty'},
            {emoji:'💰', title:'More revenue', desc:'Guests stay longer, order drinks and dessert'},
            {emoji:'🔄', title:'Repeat visits', desc:'Work-friendly spaces bring regulars back weekly'},
          ].map(b => (
            <div key={b.title} className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{b.emoji}</div>
              <div className="font-semibold text-gray-900 text-sm mb-1">{b.title}</div>
              <div className="text-xs text-gray-500">{b.desc}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Restaurant details</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Restaurant name *</label>
                <input name="restaurant" required value={form.restaurant} onChange={handleChange} placeholder="e.g. The Smith" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Neighborhood *</label>
                  <input name="neighborhood" required value={form.neighborhood} onChange={handleChange} placeholder="e.g. Midtown" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cuisine type *</label>
                  <input name="cuisine" required value={form.cuisine} onChange={handleChange} placeholder="e.g. Italian" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Full address *</label>
                <input name="address" required value={form.address} onChange={handleChange} placeholder="123 Main St, New York, NY" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Lunch special</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>What's your lunch special? *</label>
                <input name="special" required value={form.special} onChange={handleChange} placeholder="e.g. Pasta + salad + dessert" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Price (must be under $35) *</label>
                  <input name="price" required value={form.price} onChange={handleChange} placeholder="e.g. $29" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Lunch hours *</label>
                  <input name="hours" required value={form.hours} onChange={handleChange} placeholder="e.g. 11:30am – 3pm" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Available lunch seats</label>
                  <input name="seats" value={form.seats} onChange={handleChange} placeholder="e.g. 20" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Work-friendly? (laptops ok)</label>
                  <select name="workFriendly" value={form.workFriendly} onChange={handleChange} className={inputClass}>
                    <option value="yes">Yes — laptops welcome</option>
                    <option value="no">No — dining only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Free WiFi available?</label>
                <select name="wifi" value={form.wifi} onChange={handleChange} className={inputClass}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Contact information</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Your name *</label>
                <input name="contact" required value={form.contact} onChange={handleChange} placeholder="Owner or manager name" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="your@email.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="(212) 555-0100" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Anything else you'd like us to know?</label>
                <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us about your space, vibe, or any special perks..." rows={3} className={inputClass} />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors">
            Submit your restaurant — it's free
          </button>
          <p className="text-center text-xs text-gray-400">We review every submission and respond within 48 hours.</p>
        </form>
      </div>

      <footer className="px-4 py-8 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">© 2026 Let's Get Lunch · NYC</p>
      </footer>
    </main>
  );
}
