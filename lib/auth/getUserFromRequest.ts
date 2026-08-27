import { NextRequest } from 'next/server'
import { supabaseAdmin } from '../supabaseAdmin'

export type RbacRole = 'admin' | 'editor'

export type AuthedUser = {
  id: string
  email: string | null
  role: RbacRole | null
}

// Resolves the caller of a Route Handler from its Authorization: Bearer
// <access_token> header (same pattern app/api/claim/route.ts already uses
// for customer auth), then looks up their row in user_roles via the
// service-role client. Returns null if there's no valid token or no user -
// callers decide what to do with a null role (Phase A routes require
// role === 'admin', so a signed-in user with no role row is still refused).
export async function getUserFromRequest(req: NextRequest): Promise<AuthedUser | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !userData?.user) return null

  const { data: roleRow } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  return {
    id: userData.user.id,
    email: userData.user.email ?? null,
    role: (roleRow?.role as RbacRole | undefined) ?? null,
  }
}
