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


function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one symbol (e.g. !@#$).';
  return null;
}

type ModalStep = 'book' | 'password' | 'signin' | 'success';

export default function RestaurantPage() {
  const { id } = useParams();
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [r, setR] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<ModalStep>('book');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resCode, setResCode] = useState('');
  const [userName, setUserName] = useState('');
  const [userFirstName, setUserFirstName] = useState('');

  // Book form
  const [form, setForm] = useState({
    name: '', email: '', party_size: '2', preferred_time: '12:00 pm',
  });

  // Auth
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('restaurants')
        .select('*, deals(*)')
        .eq('id', id)
        .single();
      setR(data);
      setLoading(false);

      // Pre-fill if already signed in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();
          if (profile?.name) {
            setForm(f => ({ ...f, name: profile.name, email: user.email || '' }));
            setUserName(profile.name);
          setUserFirstName(parts[0] || '');
          }
        }
      } catch(e) { /* not signed in, that's fine */ }
    }
    load();
  }, [id]);

  async function openModal() {
    setAuthError('');
    setPassword('');
    setStep('book');
    setShowModal(true);
  }

  async function handleReserve() {
    if (!form.email) return;
    setSubmitting(true);
    setAuthError('');

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Already signed in — go straight to reservation
      await submitReservation(user.id);
    } else {
      // Not signed in — show password step to create account
      setStep('password');
      setSubmitting(false);
    }
  }

  async function handleCreateAndReserve() {
    const pwErr = validatePassword(password);
    if (pwErr) { setAuthError(pwErr); return; }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match. Please try again.'); return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setAuthError('');

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password,
    });

    if (error) {
      // Email already exists — prompt sign in
      if (error.message.toLowerCase().includes('already')) {
        setAuthError('You already have an account. Sign in below.');
        setSignInEmail(form.email);
        setStep('signin');
      } else {
        setAuthError(error.message);
      }
      setSubmitting(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name: `${form.firstName} ${form.lastName}`,
          contact: form.email,
      });
      await submitReservation(data.user.id);
    }
  }

  async function handleSignInAndReserve() {
    if (!signInEmail || !signInPassword) return;
    setSubmitting(true);
    setAuthError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });

    if (error) {
      setAuthError('Incorrect email or password.');
      setSubmitting(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.user.id)
        .single();
      if (profile?.name) setForm(f => ({ ...f, name: profile.name }));
      await submitReservation(data.user.id);
    }
  }

  async function submitReservation(userId: string) {
    try {
      const res = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: r!.id,
          restaurant_name: r!.name,
          restaurant_email: null,
          user_id: userId,
          name: `${form.firstName} ${form.lastName}`,
          contact: form.email,
          contact: form.email,
          party_size: parseInt(form.party_size),
          preferred_time: form.preferred_time,
          note: null,
        }),
      });
      const data = await res.json();
      if (data.code) {
        setResCode(data.code);
        setStep('success');
      } else {
        setAuthError('Something went wrong. Please try again.');
      }
    } catch (e) {
      setAuthError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

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

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#4A9FD5]";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <main className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-[#4A9FD5] text-sm font-medium">&larr; Back to results</a>
        {userFirstName ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Hi, {userFirstName}</span>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
              className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        ) : (
          <a href="/login" className="text-sm bg-[#4A9FD5] text-white px-4 py-1.5 rounded-full font-medium hover:bg-[#3a8fc5]">Sign in</a>
        )}
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
              <div onMouseEnter={() => setActivePhoto(r.photo_url)} onMouseLeave={() => setActivePhoto(null)}
                className={`w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all ${(!activePhoto || activePhoto === r.photo_url) ? 'border-[#4A9FD5]' : 'border-transparent'}`}>
                <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
              </div>
            )}
            {r.photo_urls && r.photo_urls.map((url, i) => (
              <div key={i} onMouseEnter={() => setActivePhoto(url)} onMouseLeave={() => setActivePhoto(null)}
                className={`w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all ${activePhoto === url ? 'border-[#4A9FD5]' : 'border-transparent'}`}>
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

        {r.bio && <p className="text-gray-500 text-sm mb-4 leading-relaxed">{r.bio}</p>}
        <p className="text-gray-400 text-sm mb-6">Prix-fixe lunch</p>

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
            <a href={`https://maps.google.com/?q=${encodeURIComponent(r.address)}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#4A9FD5] hover:underline">Open in Google Maps</a>
          </div>
        </div>

        <button onClick={openModal}
          className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors mb-3">
          Reserve this lunch special
        </button>
        <p className="text-center text-xs text-gray-400">Free to reserve · Instant confirmation code</p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              {/* Handle bar for mobile */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

              <button onClick={() => setShowModal(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-2xl hidden sm:block">×</button>

              {/* STEP: book */}
              {step === 'book' && (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Reserve your lunch</h2>
                  <p className="text-sm text-gray-500 mb-6">{r.name} · ${deal?.price} per person</p>

                  {authError && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl mb-4">{authError}</p>}

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>First name</label>
                        <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                          placeholder="First" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Last name</label>
                        <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                          placeholder="Last" className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="your@email.com" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Party size</label>
                      <select value={form.party_size} onChange={e => setForm(f => ({ ...f, party_size: e.target.value }))}
                        className={inputClass}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Preferred time</label>
                      <select value={form.preferred_time} onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))}
                        className={inputClass}>
                        {['11:00 am','11:30 am','12:00 pm','12:30 pm','1:00 pm','1:30 pm','2:00 pm','2:30 pm','3:00 pm'].map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <button onClick={handleReserve} disabled={submitting || !form.email}
                      className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50 mt-2">
                      {submitting ? 'One moment...' : 'Reserve Now'}
                    </button>

                    {userName ? (
                      <p className="text-center text-xs text-gray-400">Signed in as {form.email}</p>
                    ) : (
                      <p className="text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <button onClick={() => { setSignInEmail(form.email); setStep('signin'); }}
                          className="text-[#4A9FD5] font-medium">Sign in</button>
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* STEP: password — create account */}
              {step === 'password' && (
                <>
                  <button onClick={() => setStep('book')} className="text-[#4A9FD5] text-sm mb-4 block">← Back</button>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Almost done!</h2>
                  <p className="text-sm text-gray-500 mb-6">One last step — set a password so you can manage your reservations.</p>

                  {authError && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl mb-4">{authError}</p>}

                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Create a password</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Min 8 chars, uppercase, number, symbol" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Confirm password</label>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Type password again" className={inputClass} />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
                      )}
                    </div>
                    <button onClick={handleCreateAndReserve} disabled={submitting || !password || password !== confirmPassword}
                      className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
                      {submitting ? 'Confirming...' : 'Confirm Reservation'}
                    </button>

                  </div>
                </>
              )}

              {/* STEP: sign in */}
              {step === 'signin' && (
                <>
                  <button onClick={() => setStep('book')} className="text-[#4A9FD5] text-sm mb-4 block">← Back</button>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back!</h2>
                  <p className="text-sm text-gray-500 mb-6">Sign in to complete your reservation.</p>

                  {authError && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl mb-4">{authError}</p>}

                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Email</label>
                      <input type="email" value={signInEmail} onChange={e => setSignInEmail(e.target.value)}
                        placeholder="your@email.com" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Password</label>
                      <input type="password" value={signInPassword} onChange={e => setSignInPassword(e.target.value)}
                        placeholder="Your password" className={inputClass} />
                    </div>
                    <button onClick={handleSignInAndReserve} disabled={submitting || !signInEmail || !signInPassword}
                      className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
                      {submitting ? 'Signing in...' : 'Sign In & Reserve'}
                    </button>
                  </div>
                </>
              )}

              {/* STEP: success */}
              {step === 'success' && (
                <div className="text-center py-4">
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">You&apos;re confirmed!</h2>
                  <p className="text-gray-500 mb-4">Show this at {r.name}</p>
                  <div className="bg-[#EEF6FC] rounded-2xl py-5 px-6 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Your reservation code</p>
                    <p className="text-4xl font-bold text-[#4A9FD5] tracking-widest mb-4">{resCode}</p>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(resCode)}&color=4A9FD5&bgcolor=EEF6FC`}
                      alt="QR Code"
                      className="w-40 h-40 mx-auto rounded-xl"
                    />
                  </div>
                  <div className="text-left bg-gray-50 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs text-gray-400 mb-1">Restaurant address</p>
                    <p className="text-sm font-medium text-gray-900">{r.address}</p>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Confirmation sent to {form.email}</p>
                  <button onClick={() => setShowModal(false)}
                    className="w-full border border-gray-200 text-gray-700 py-4 rounded-xl font-medium text-lg hover:bg-gray-50">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="px-4 py-8 border-t border-gray-100 text-center mt-8">
        <p className="text-sm text-gray-400">© 2026 Let&apos;s Get Lunch · NYC</p>
      </footer>
    </main>
  );
}
