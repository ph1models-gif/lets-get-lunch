// One-time backfill: assigns a slug to every restaurant row where slug IS NULL.
// Idempotent — safe to rerun. Never touches a row that already has a slug,
// so existing slugs stay stable across reruns and future name/neighborhood edits.
//
// Usage: node scripts/backfill-restaurant-slugs.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)

const supabaseAdmin = createClient(
  'https://iqurlwenkozmxoyymnkg.supabase.co',
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function slugifyPart(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function generateUniqueSlug(name, neighborhood, existingSlugs) {
  const base = slugifyPart(name) || 'restaurant'
  if (!existingSlugs.has(base)) return base

  const hood = slugifyPart(neighborhood || '')
  const withHood = hood ? `${base}-${hood}` : base
  if (hood && !existingSlugs.has(withHood)) return withHood

  let n = 2
  while (existingSlugs.has(`${withHood}-${n}`)) n++
  return `${withHood}-${n}`
}

const BATCH_SIZE = 10

async function main() {
  const { data: restaurants, error } = await supabaseAdmin
    .from('restaurants')
    .select('id, name, neighborhood, slug')
    .order('created_at', { ascending: true })
  if (error) throw error

  const existingSlugs = new Set(restaurants.filter(r => r.slug).map(r => r.slug))
  const alreadyHadSlug = existingSlugs.size

  const updates = []
  for (const r of restaurants) {
    if (r.slug) continue
    const slug = generateUniqueSlug(r.name, r.neighborhood, existingSlugs)
    existingSlugs.add(slug)
    updates.push({ id: r.id, name: r.name, slug })
  }

  console.log(`Total restaurants: ${restaurants.length}`)
  console.log(`Already had a slug: ${alreadyHadSlug}`)
  console.log(`To backfill: ${updates.length}`)

  let succeeded = 0
  const errors = []
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(async u => {
      const { error: updErr } = await supabaseAdmin.from('restaurants').update({ slug: u.slug }).eq('id', u.id)
      return { u, updErr }
    }))
    for (const { u, updErr } of results) {
      if (updErr) errors.push({ id: u.id, name: u.name, slug: u.slug, error: updErr.message })
      else succeeded++
    }
    console.log(`  ...${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`)
  }

  console.log(`\nDone. Updated: ${succeeded}. Errors: ${errors.length}.`)
  if (errors.length) {
    console.log('Failed rows:')
    for (const e of errors) console.log(`  ${e.id} (${e.name}) -> ${e.slug}: ${e.error}`)
    process.exitCode = 1
  }
}

main().catch(e => {
  console.error('Backfill failed:', e)
  process.exitCode = 1
})
