import { createClient } from '@supabase/supabase-js';
const s = createClient('https://iqurlwenkozmxoyymnkg.supabase.co', 'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4');
const { data, error } = await s.from('restaurants').select('id, name, lat, lng, is_active, deals(price, days)').eq('is_active', true);
if (error) { console.log('ERROR:', error.message); process.exit(1); }
console.log('Active restaurants:', data.length);
const withDeals = data.filter(r => r.deals && r.deals.length > 0);
console.log('With at least one deal:', withDeals.length);
const wed = withDeals.filter(r => { const d = r.deals[0]; const days = d.days && d.days.length ? d.days : ['Mon','Tue','Wed','Thu','Fri']; return days.includes('Wed'); });
console.log('Open Wednesday:', wed.length);
const under100 = withDeals.filter(r => r.deals[0].price <= 100);
console.log('Priced 100 or under:', under100.length);
const hasCoords = withDeals.filter(r => r.lat != null && r.lng != null);
console.log('Has lat/lng:', hasCoords.length);
console.log('Sample days values:', JSON.stringify(withDeals.slice(0,5).map(r => r.deals[0].days)));
