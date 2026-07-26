import { createClient } from '@supabase/supabase-js';
import HomeClient from './HomeClient';
import { HOMEPAGE_RESTAURANT_SELECT, Restaurant } from './types';

export const dynamic = 'force-dynamic';

// A page-local client whose fetch always opts out of Next's Data Cache, so a
// restaurant/deal edited or deactivated in Supabase shows up immediately
// instead of on the next deploy (same pattern as /newsletter).
function getSupabase() {
  return createClient(
    'https://iqurlwenkozmxoyymnkg.supabase.co',
    'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4',
    { global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } }
  );
}

export default async function Home() {
  const { data } = await getSupabase()
    .from('restaurants')
    .select(HOMEPAGE_RESTAURANT_SELECT)
    .eq('is_active', true);

  return <HomeClient initialRestaurants={(data as unknown as Restaurant[]) ?? []} />;
}
