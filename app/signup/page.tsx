'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const NEIGHBORHOODS = [
  'Midtown','Midtown East','Midtown West','Upper East Side','Upper West Side',
  'Chelsea','West Village','Greenwich Village','SoHo','NoHo','Nolita','Tribeca',
  'Financial District','Lower East Side','East Village','Gramercy Park',
  'Murray Hill','Kips Bay','Flatiron','NoMad','Harlem',"Hell's Kitchen",
  'Chinatown','Little Italy','Battery Park City','Union Square','Hudson Yards',
  'Lenox Hill','Yorkville','Carnegie Hill','East Harlem','Washington Heights',
  'Inwood','Morningside Heights','Hamilton Heights','Sugar Hill',
  'Williamsburg','Dumbo','Brooklyn Heights','Park Slope','Cobble Hill',
  'Carroll Gardens','Boerum Hill','Fort Greene','Clinton Hill','Bushwick',
  'Greenpoint','Red Hook','Gowanus','Crown Heights','Bed-Stuy','Bay Ridge',
  'Sunset Park','Windsor Terrace','Prospect Lefferts Gardens','Flatbush',
  'Prospect Heights','Downtown Brooklyn','Astoria','Long Island City',
  'Flushing','Jackson Heights','Woodside','Rego Park','Elmhurst','Corona',
  'Forest Hills','Sunnyside','Ridgewood','Fordham','Riverdale','Mott Haven',
  'St. George','Stapleton'
];

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one symbol (e.g. !@#$).';
  return null;
}

export default function SignupPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', neighborhood: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignUp() {
    setLoading(true); setError('');
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('All fields are required.'); setLoading(false); return;
    }
    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); setLoading(false); return; }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.'); setLoading(false); return;
    }
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id, name: fullName,
        neighborhood: form.neighborhood || null,
      });
      setSuccess(true);
      setTimeout(() => { window.location.href = '/'; }, 2000);
    }
    setLoading(false);
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4A9FD5]";

  return (
    <main className="min-h-screen bg-[#EEF6FC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-3xl">🍽️</span>
              <span className="text-2xl font-bold text-gray-900">Let&apos;s Get Lunch</span>
            </div>
          </a>
          <h1 className="text-xl font-semibold text-gray-800">Create your free account</h1>
          <p className="text-sm text-gray-500 mt-1">Reserve NYC&apos;s best prix-fixe lunch deals in seconds</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          {success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in!</h2>
              <p className="text-gray-500 text-sm">Taking you to Let&apos;s Get Lunch...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))}
                    placeholder="First" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))}
                    placeholder="Last" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  placeholder="your@email.com" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                  placeholder="Min 8 chars, uppercase, number, symbol" className={inputClass} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({...f, confirmPassword: e.target.value}))}
                  placeholder="Type password again" className={inputClass} />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your neighborhood <span className="text-gray-400 font-normal">(optional)</span></label>
                <select value={form.neighborhood} onChange={e => setForm(f => ({...f, neighborhood: e.target.value}))} className={inputClass}>
                  <option value="">Select neighborhood</option>
                  {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button onClick={handleSignUp} disabled={loading}
                className="w-full bg-[#4A9FD5] text-white py-3.5 rounded-xl font-semibold text-base hover:bg-[#3a8fc5] transition-colors disabled:opacity-50 mt-2">
                {loading ? 'Creating account...' : 'Create free account'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <a href="/login" className="text-[#4A9FD5] font-medium hover:underline">Sign in</a>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ← <a href="/" className="hover:underline">Back to lunch deals</a>
        </p>
      </div>
    </main>
  );
}
