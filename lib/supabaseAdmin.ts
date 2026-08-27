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
    // Force every request this client makes to bypass Next.js's Data Cache.
    // `export const dynamic = 'force-dynamic'` on a route is supposed to be
    // equivalent to cache: 'no-store' on every fetch inside it, but that
    // didn't hold for this client's calls in practice: confirmed live that
    // GET /api/account/claims (force-dynamic, x-vercel-cache: BYPASS on the
    // outer response) still returned a stale row set - missing a claim
    // created after the account's *first* claims fetch - identical direct
    // REST calls with the same service-role key returned the fresh row
    // every time. Overriding fetch here bypasses whatever internal cache
    // was catching this, at the source, for every route that uses
    // supabaseAdmin - not just this one.
    global: {
      fetch: (input, init) => fetch(input as any, { ...(init as any), cache: 'no-store' }),
    },
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
