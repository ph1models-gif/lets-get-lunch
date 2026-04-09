import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iqurlwenkozmxoyymnkg.supabase.co';
const supabaseKey = 'sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4';

export const supabase = createClient(supabaseUrl, supabaseKey);
