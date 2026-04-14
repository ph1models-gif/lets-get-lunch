'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

const NEIGHBORHOODS = [
  'Midtown','Midtown East','Midtown West','Upper East Side','Upper West Side',
  'Chelsea','West Village','Greenwich Village','SoHo','NoHo','Tribeca',
  'Financial District','Lower East Side','East Village','Gramercy Park',
  'Murray Hill','Harlem','Hell's Kitchen','Chinatown','Battery Park City',
  'Union Square','Lenox Hill','Yorkville','Washington Heights','Inwood',
  'Morningside Heights','Williamsburg','Dumbo','Brooklyn Heights','Park Slope',
  'Cobble Hill','Carroll Gardens','Boerum Hill','Fort Greene','Clinton Hill',
  'Bushwick','Greenpoint','Red Hook','Gowanus','Crown Heights','Downtown Brooklyn',
  'Astoria','Long Island City','Flushing','Jackson Heights','Forest Hills',
  'Sunnyside','Woodside','Ridgewood','Fordham','Riverdale','Mott Haven',
  'St. George','Stapleton'
];


function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one symbol (e.g. !@#$).';
  return null;
}

export default function LoginPage() {
  const [tab, setTab] = useState<'signup'|'signin'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', neighborhood: ''
  });

  async function handleSignIn() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: signInForm.email, password: signInForm.password,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    window.location.href = '/';
  }

  async function handleSignUp() {
    setLoading(true); setError('');
    if (!signUpForm.firstName || !signUpForm.lastName || !signUpForm.email || !signUpForm.password) {
      setError('All fields except neighborhood are required.'); setLoading(false); return;
    }
    const pwError = validatePassword(signUpForm.password);
    if (pwError) { setError(pwError); setLoading(false); return; }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError('Passwords do not match. Please try again.'); setLoading(false); return;
    }
    const fullName = `${signUpForm.firstName.trim()} ${signUpForm.lastName.trim()}`;
    const { data, error } = await supabase.auth.signUp({
      email: signUpForm.email, password: signUpForm.password,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name: fullName,
        neighborhood: signUpForm.neighborhood || null,
      });
    }
    setSuccess("You're in! You can now make reservations.");
    setTimeout(() => { window.location.href = '/'; }, 1500);
    setLoading(false);
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-[#4A9FD5]";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#EEF6FC] to-white flex flex-col items-center justify-center px-4">
      <a href="/" className="flex items-center gap-2 mb-8">
        <span className="text-2xl">🍽️</span>
        <span className="font-bold text-gray-900 text-xl">Let&apos;s Get Lunch</span>
      </a>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {(['signup','signin'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-4 bg-green-50 px-4 py-3 rounded-xl">{success}</p>}

        {tab === 'signup' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                <input value={signUpForm.firstName} onChange={e => setSignUpForm(f => ({...f, firstName: e.target.value}))}
                  placeholder="First" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                <input value={signUpForm.lastName} onChange={e => setSignUpForm(f => ({...f, lastName: e.target.value}))}
                  placeholder="Last" className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={signUpForm.email} onChange={e => setSignUpForm(f => ({...f, email: e.target.value}))}
                placeholder="your@email.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={signUpForm.password} onChange={e => setSignUpForm(f => ({...f, password: e.target.value}))}
                placeholder="Min 8 chars, uppercase, number, symbol" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input type="password" value={signUpForm.confirmPassword} onChange={e => setSignUpForm(f => ({...f, confirmPassword: e.target.value}))}
                placeholder="Type password again" className={inputClass} />
              {signUpForm.confirmPassword && signUpForm.password !== signUpForm.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary lunch neighborhood <span className="text-gray-400 font-normal">(optional)</span></label>
              <select value={signUpForm.neighborhood} onChange={e => setSignUpForm(f => ({...f, neighborhood: e.target.value}))}
                className={inputClass}>
                <option value="">Select neighborhood</option>
                {NEIGHBORHOODS.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <button onClick={handleSignUp} disabled={loading}
              className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50 mt-2">
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={signInForm.email} onChange={e => setSignInForm(f => ({...f, email: e.target.value}))}
                placeholder="your@email.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={signInForm.password} onChange={e => setSignInForm(f => ({...f, password: e.target.value}))}
                placeholder="Your password" className={inputClass} />
            </div>
            <button onClick={handleSignIn} disabled={loading}
              className="w-full bg-[#4A9FD5] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#3a8fc5] transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <button onClick={() => setTab('signup')} className="text-[#4A9FD5] font-medium hover:underline">Create one free</button>
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-6"><a href="/" className="hover:text-gray-600">← Back to lunch deals</a></p>
    </main>
  );
}
