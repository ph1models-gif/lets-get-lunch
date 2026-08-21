// Posts are authored with a plain /restaurants/{slug} link in the body
// pointing at the deal being written about (existing authoring convention —
// e.g. the Mamazul post body ends with exactly this). Pull the restaurant
// slug from that link and strip the raw URL out of the body text, so both
// the email and the web post page can render it as a styled "Claim this
// exclusive lunch" button instead of a bare visible URL — derived from the
// post's own content each render, not hardcoded. Posts with no such link
// (not tied to a specific deal) just get no button.
const RESTAURANT_LINK_RE = /https?:\/\/(?:www\.)?letsgetlunch\.nyc\/restaurants\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?/i

export function extractRestaurantSlug(body: string): { cleanBody: string; restaurantSlug: string | null } {
  const match = body.match(RESTAURANT_LINK_RE)
  if (!match) return { cleanBody: body, restaurantSlug: null }
  const cleanBody = body
    .replace(match[0], '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { cleanBody, restaurantSlug: match[1] }
}
