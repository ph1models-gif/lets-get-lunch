'use client';
import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';

const NEIGHBORHOODS = [
  "Midtown","Midtown East","Midtown West","Upper East Side","Upper West Side",
  "Chelsea","West Village","Greenwich Village","SoHo","NoHo","Tribeca",
  "Financial District","Lower East Side","East Village","Gramercy Park",
  "Murray Hill","Kips Bay","Harlem","Hell's Kitchen","Chinatown","Little Italy",
  "Battery Park City","Union Square","Lenox Hill","Yorkville","Washington Heights",
  "Inwood","Morningside Heights","Williamsburg","Dumbo","Brooklyn Heights",
  "Park Slope","Cobble Hill","Carroll Gardens","Boerum Hill","Fort Greene",
  "Clinton Hill","Bushwick","Greenpoint","Red Hook","Crown Heights",
  "Prospect Heights","Downtown Brooklyn","Astoria","Long Island City",
  "Flushing","Jackson Heights","Forest Hills","Sunnyside","Ridgewood",
  "Fordham","Riverdale","Mott Haven","St. George","Stapleton"
];

const CUISINES = [
  "American","Italian","Japanese/Sushi","French","Mexican/Latin",
  "Chinese","Indian","Mediterranean","Greek","Thai","Korean",
  "Vietnamese","Middle Eastern","Seafood","Steakhouse","BBQ",
  "Vegan/Plant-Based","Bakery/Cafe","Other"
];

const HOURS_OPTIONS = [
  "11am–2pm","11am–2:30pm","11am–3pm","11:30am–2pm",
  "11:30am–2:30pm","11:30am–3pm","12pm–2pm","12pm–2:30pm",
  "12pm–3pm","12pm–3:30pm"
];

export default function ListYourRestaurant() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    restaurant: '', contact: '', email: '', phone: '',
    address: '', neighborhood: '', cuisine: '', cuisineOther: '',
    seats: '', hours: '', special: '', price: '',
    workFriendly: 'no', wifi: 'no', message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({...form, [e.target.name]: e.target.value});
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (i: number) => {
    setImages(imgs => imgs.filter((_,j)=>j!==i));
    setPreviews(ps => ps.filter((_,j)=>j!==i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const finalCuisine = form.cuisine === 'Other' ? form.cuisineOther : form.cuisine;

    // Upload first photo to Supabase Storage if provided
    let photo_url = null;
    if (images.length > 0) {
      const file = images[0];
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('restaurant-photos')
        .upload(fileName, file, { contentType: file.type });

      if (uploadErr) {
        setError('Photo upload failed. Please try again.');
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('restaurant-photos')
        .getPublicUrl(fileName);

      photo_url = urlData.publicUrl;
    }

    const { error: err } = await supabase.from('vendors').insert({
      restaurant_name: form.restaurant,
      contact_name: form.contact,
      email: form.email,
      phone: form.phone,
      address: form.address,
      neighborhood: form.neighborhood,
      cuisine: finalCuisine,
      seats: form.seats,
      hours: form.hours,
      special: form.special,
      price: form.price,
      work_friendly: form.workFriendly,
      wifi: form.wifi,
      message: form.message,
      status: 'pending',
      photo_url,
    });

    setLoading(false);
    if (err) {
      setError('Something went wrong. Please try again.');
    } else {
      setSubmitted(true);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#4A9FD5] focus:ring-1 focus:ring-[#4A9FD5]";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (submitted) return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">You&apos;re on the list!</h1>
        <p className="text-gray-500 mb-6">We&apos;ll review your restaurant and be in touch within 48 hours to get you set up on Let&apos;s Get Lunch.</p>
        <a href="/" className="inline-block bg-[#4A9FD5] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#3a8fc5]">Back to home</a>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-semibold text-gray-900">Let&apos;s Get Lunch</span>
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

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
                  <select name="neighborhood" required value={form.neighborhood} onChange={handleChange} className={inputClass}>
                    <option value="">Select neighborhood...</option>
                    {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cuisine type *</label>
                  <select name="cuisine" required value={form.cuisine} onChange={handleChange} className={inputClass}>
                    <option value="">Select cuisine...</option>
                    {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {form.cuisine === 'Other' && (
                    <input name="cuisineOther" value={form.cuisineOther} onChange={handleChange} placeholder="Please specify..." className={`${inputClass} mt-2`} required />
                  )}
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
                <label className={labelClass}>Describe your lunch special *</label>
                <input name="special" required value={form.special} onChange={handleChange} placeholder="e.g. Pasta + salad + dessert" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Price (must be under $35) *</label>
                  <input name="price" required value={form.price} onChange={handleChange} placeholder="e.g. $29" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Lunch service hours *</label>
                  <select name="hours" required value={form.hours} onChange={handleChange} className={inputClass}>
                    <option value="">Select hours...</option>
                    {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Available lunch seats</label>
                  <input name="seats" value={form.seats} onChange={handleChange} placeholder="e.g. 20" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Laptop friendly?</label>
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
            <h2 className="font-semibold text-gray-900 mb-4">Food photos</h2>
            <p className="text-sm text-gray-500 mb-4">Upload photos of your lunch dishes. Food photos get 3x more clicks.</p>
            <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#4A9FD5] transition-colors">
              <input type="file" multiple accept="image/*" onChange={handleImages} className="hidden" />
              <div className="text-3xl mb-2">📸</div>
              <div className="text-sm font-medium text-gray-700">Click to upload food photos</div>
              <div className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB each</div>
            </label>
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {previews.map((p, i) => (
                  <div key={i} className="relative">
                    <Image src={p} alt="Food preview" width={300} height={96} className="w-full h-24 object-cover rounded-xl" unoptimized />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
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
                <label className={labelClass}>Anything else you&apos;d like us to know?</label>
                <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell us about your space, vibe, or any special perks..." rows={3} className={inputClass} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
            {loading ? 'Submitting...' : "Submit your restaurant — it's free"}
          </button>
          <p className="text-center text-xs text-gray-400">We review every submission and respond within 48 hours.</p>
        </form>
      </div>

      <footer className="px-4 py-8 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">© 2026 Let&apos;s Get Lunch · NYC</p>
      </footer>
    </main>
  );
}
