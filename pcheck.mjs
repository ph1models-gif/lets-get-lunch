import { createClient } from '@supabase/supabase-js';
const s = createClient('https://iqurlwenkozmxoyymnkg.supabase.co', 'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4');
const { data, error } = await s.from('restaurants').select('id, name, phone, website').eq('is_active', true).limit(10);
if (error) { console.log('ERROR:', error.message); process.exit(1); }
const withPhone = data.filter(r => r.phone);
const withWeb = data.filter(r => r.website);
console.log('Sampled:', data.length, '| have phone:', withPhone.length, '| have website:', withWeb.length);
console.log('Sample:', JSON.stringify(data.slice(0,3).map(r => ({n:r.name, phone:r.phone, web:r.website}))));
