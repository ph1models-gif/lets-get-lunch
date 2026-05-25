'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const [msg, setMsg] = useState('Signing you in...');

  useEffect(() => {
    async function finish() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setMsg('Something went wrong. Redirecting...');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
      }
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('id', user.id).maybeSingle();
      if (!existing) {
        const googleName =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) || '';
        await supabase.from('profiles').insert({
          id: user.id,
          name: googleName,
          email: user.email,
          neighborhood: null,
        });
      }
      window.location.href = '/';
    }
    finish();
  }, []);

  return (
    <main className="min-h-screen bg-[#EEF6FC] flex items-center justify-center px-4">
      <p className="text-gray-600 text-sm">{msg}</p>
    </main>
  );
}
