import { createClient, SupabaseClient } from '@supabase/supabase-js'

// SERVER-SIDE ONLY. Never import into a 'use client' file.
// Lazily creates the service_role client on first use, so the build doesn't
// require the key to be present at module-load / page-data-collection time.
const supabaseUrl = 'https://iqurlwenkozmxoyymnkg.supabase.co'

let _client: SupabaseClient | null = null

function getAdmin(): SupabaseClient {
  if (_client) return _client
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in the environment')
  }
  _client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _client
}

// Proxy so existing `supabaseAdmin.from(...)` calls work unchanged,
// but the real client (and the key check) is only built on first method access.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdmin()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
