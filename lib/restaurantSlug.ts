// Same slugify pattern already used in app/newsletter/admin/page.tsx.
export function slugifyPart(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// name -> collision -> +neighborhood -> collision -> numeric suffix.
// Caller must add the returned slug to `existingSlugs` before generating the next one.
export function generateUniqueSlug(
  name: string,
  neighborhood: string | null | undefined,
  existingSlugs: Set<string>
): string {
  const base = slugifyPart(name) || 'restaurant'
  if (!existingSlugs.has(base)) return base

  const hood = slugifyPart(neighborhood || '')
  const withHood = hood ? `${base}-${hood}` : base
  if (hood && !existingSlugs.has(withHood)) return withHood

  let n = 2
  while (existingSlugs.has(`${withHood}-${n}`)) n++
  return `${withHood}-${n}`
}
