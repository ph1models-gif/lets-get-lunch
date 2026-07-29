import { createClient } from '@supabase/supabase-js';
import HomeClient from './HomeClient';
import { HOMEPAGE_RESTAURANT_SELECT, Restaurant } from './types';

// Restaurant list is revalidated every 60s instead of on every request.
// Admin edits/deactivations/exclusive-flag toggles can take up to 60s to
// show here (see NOTES.md) - acceptable for a lunch directory, and the
// existing focus-triggered client refetch in HomeClient already shows
// changes sooner for anyone with the tab open.
export const revalidate = 60;

// A page-local client whose fetch is tagged into Next's Data Cache with the
// same 60s revalidate window as the page, so a restaurant/deal edited in
// Supabase shows up within a minute instead of only on the next deploy.
function getSupabase() {
  return createClient(
    'https://iqurlwenkozmxoyymnkg.supabase.co',
    'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4',
    { global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60 } }) } }
  );
}

export default async function Home() {
  const { data } = await getSupabase()
    .from('restaurants')
    .select(HOMEPAGE_RESTAURANT_SELECT)
    .eq('is_active', true);

  return (
    <>
      {/* Warms the connection for the deferred Maps script (Wave 1) before it's requested */}
      <link rel="preconnect" href="https://maps.googleapis.com" />
      <HomeClient initialRestaurants={(data as unknown as Restaurant[]) ?? []} />
    </>
  );
}
