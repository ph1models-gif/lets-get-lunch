# Let's Get Lunch — Project Notes
**Last updated: May 10, 2026 (late evening)**

## ✅ Recently Fixed (May 10, 2026)
- **`website` column added to `restaurants` table** — type text, nullable, no CHECK constraint
- **Backfilled 96 restaurants with websites** from vendors.website via SQL JOIN on normalized name match. Used dry-run preview first. No data overwrites — UPDATE clause protected existing values.
- **Fixed Ako Sushi vendor row** — had two URLs glued together with a space (`...akosushi.com/menu.pdf https://instagram.com/...`). Cleaned to `https://www.akosushi.com`.
- **Data hygiene insight**: vendor form should strip whitespace from website on insert; recommend single-URL validation pattern when we touch the vendor form again.

## ✅ Recently Fixed (May 2, 2026)
- **Required Website field on vendor signup form** — `/list-your-restaurant` now requires a Website field (right after Address). Auto-prefixes `https://` if user types bare domain like `joespizza.com`. Saves to vendors.website column.
- **`website` column added to vendors table** — Supabase column, type text, nullable (so existing 50 rows stay valid)
- **Map race-condition bug fixed** — pins on homepage map now correctly match today's filtered list from initial load through every search/clear cycle. Root cause: async Google Maps load could finish AFTER React's first useEffect ran, so initMap created markers with default visibility and the visibility logic never re-ran. Fix: added activeIdsRef, applied initial visibility at marker creation time, kept existing useEffect for live updates. (app/components/MapInner.tsx)
- **NEIGHBORHOODS unified** — created lib/neighborhoods.ts as single source of truth (76 neighborhoods, NYC-wide, with NEIGHBORHOOD_GROUPS for borough-grouped dropdowns). Patched 4 files (admin, login, signup, list-your-restaurant) to import from there. Added Meatpacking District. Resolved silent drift between previously-divergent local lists.
- **Search + filter bar on Active Listings** — text search by name/address, neighborhood dropdown (auto-populated from existing listings), cuisine dropdown (canonical CUISINES list), Show hidden checkbox, Clear button, "X of Y listings shown" count
- **Restore button on rejected vendors** — Contacts tab now has ↻ Restore button on rejected rows that moves them back to Pending Submissions for re-review

## 🎯 NEXT SESSION — START HERE

Schema + backfill done May 10 (96 restaurants have websites). Remaining code work:

1. **Update approval flow** (app/admin/page.tsx) — when vendor → restaurant, copy website through. Find the approve handler, add `website: vendor.website` to the insert.
2. **Add Website field to admin Active Listings edit form** (app/admin/page.tsx) — so Olga can fill in the ~40 restaurants approved before the field existed, and edit existing ones.
3. **Add Website field to admin Pending Review & Edit form** (app/admin/page.tsx) — so Olga can correct websites before approving.
4. **Add Website field to admin "+ Add listing" form** (app/admin/page.tsx) — for consistency when adding directly.

Estimated 60-90 min total. All 4 are app/admin/page.tsx edits, so we can batch them in one session.

After this is done, partner/aggregator feature (below) is unblocked.

## 🗺️ FEATURE IDEA — Map-driven list filtering (Airbnb pattern)

**Problem**: 138 listings concentrated in Manhattan + a few in Brooklyn. Outer-borough users see sparse maps and may think site is dead. Beyond density, even in core areas the list doesn't sync with what's visible on the map.

**Goal**: When user pans/zooms the map, the list below filters to "what's visible in current map bounds." Like Airbnb.

**Three implementation options** (pick when revisiting):
1. **"Search this area" button** (~1 hour) — appears after map moves; user clicks to refresh list. Less aggressive than auto-update. Strong UX, this is what Airbnb actually does.
2. **Auto-sync** (~2-3 hours) — map pan triggers immediate list update. More magical but can feel jumpy. Needs Google Maps `bounds_changed` event + debouncing + filtering by lat/lng inside viewport.
3. **Empty-state-only fix** (~15 min) — quick win: if filtered list is empty for the visible area, show "No listings here today — try Manhattan or check back."

**Recommendation**: Option 1 (search-this-area button) when revisited. Matches user expectations from Airbnb/Zillow. Doesn't fight users who want to browse without re-filtering.

**Worth flagging**: Resy and OpenTable do NOT do this — they show a fixed list next to a map. That's also a valid pattern for a directory site. Don't assume map-sync is universally better; test with real users before committing.

**Priority**: Medium. Not blocking the deck. Real polish improvement once core features (partner/aggregator, remaining website forms) are done.

## 🎯 PARTNER/AGGREGATOR FEATURE (BIG — plan documented, not yet built)

Goal: differentiate "real partner" restaurants (full Resy-style booking) from "aggregator listings" (call/visit website only). This acknowledges current state honestly: most listings are aggregator scrapes, only Royal 35 is a true booking partner.

### Sequenced plan
**Phase 1 — Schema:**
- Add `is_partner boolean default false` to restaurants
- Add `phone text` to restaurants (currently only in vendors table)
- Add `website text` to restaurants (see "next session" tasks above)
- Backfill phone/website from vendors where possible
- Manually flip `is_partner=true` for Royal 35

**Phase 2 — Restaurant detail page** (app/restaurants/[id]/page.tsx):
- If `is_partner=true`: show existing reservation modal (no change)
- If `is_partner=false`: replace Reserve button with two CTAs — "Visit website" (links to website) and "Call to reserve" (tel: link to phone)
- Show small "Aggregator listing — call directly" disclosure for non-partners

**Phase 3 — Homepage map cards:**
- Add small "✓ Book instantly" badge to partners only

**Phase 4 — Server-side guard:**
- In `/api/reserve/route.ts`: load restaurant by ID, return 403 if `is_partner=false`
- Defense in depth — don't trust client-side hiding alone

### Open questions to resolve before building
- Do we have website for all aggregator listings? (Now collecting going forward via vendor form. Existing 50 need backfill.)
- Do we have phone for all aggregator listings? (Yes for vendor-submitted ones — in vendors.phone. Need to surface to restaurants table.)
- What's the copy on the "Aggregator listing" disclosure? (Brand-shaping language — should be discussed before coding.)

## ⚠️ ACTIVE BUGS (UNRESOLVED)

### Bug C — Confirmation emails landing in spam
- Email DOES send. Lands in Gmail spam.
- Fix: verify Resend SPF, DKIM, DMARC records on letsgetlunch.nyc DNS

### Bug D — Signup not saving email to profiles table
- Profile rows missing email field (NULL). ~half of existing rows.
- Email IS in auth.users (login works fine).
- LIKELY ROOT CAUSE: two signup paths (modal on restaurant page vs standalone /signup). One saves email, other doesn't. Diff handlers first.

### Bug E — Duplicate map() in admin edit form dropdowns
- app/admin/page.tsx ~lines 1107-1109 and 1115-1117
- Cuisine and Neighborhood selects each call `.map()` TWICE in a row → every option appears twice
- Easy fix: delete the duplicate map line in each select

### Bug F — CUISINES list still drifted across files
- admin/page.tsx and page.tsx have different CUISINES lists
- Should mirror lib/neighborhoods.ts pattern → create lib/cuisines.ts

### Bug G — Photo preview wonky in vendor review form
- Replace main photo → no preview shown until after Approve
- Data IS saved correctly (cosmetic only)
- Fix: add vendorMainPreview / vendorExtraPreviews state, generate URL.createObjectURL(file) previews when files picked
- Pattern already exists on Active Listings edit form — copy that approach

## 📋 V1 PENDING TODO (priority order)
1. **Complete website pipeline** — see "Next Session — Start Here" above
2. **Partner/aggregator feature** — see plan above
3. FIX Bug C — email deliverability (SPF/DKIM/DMARC in Resend dashboard)
4. FIX Bug D — signup email to profiles table
5. FIX Bug E — duplicate map() lines (5-min easy win)
6. FIX Bug F — unify CUISINES into lib/cuisines.ts
7. FIX Bug G — photo preview in vendor review form
8. Add duplicate-vendor detection badge in admin pending (~20 min)
9. Photos on 8 original seeded restaurants
10. QR code on success screen in modal
11. Scannable /confirm/[code] page with security token
12. Manual code lookup in admin

## 🚀 V2 ROADMAP
- Guest invitation feature (high priority post-deck — viral loop, $0 CAC)
- User profile page
- Restaurant notification emails
- Redemption analytics
- Repeat customer loyalty
- Tracked referral codes
- Welcome email
- SEO meta tags
- Soft delete
- Static QR at host stand
- PWA wrapper (recommended path before native app)
- Brunch as second deal type per restaurant (NOT a separate app)

## 💭 OPEN PRODUCT QUESTIONS (deferred)
- Next-day specials cutover (5pm? 6pm?). Risks: cognitive whiplash, no data to choose hour. Counter-proposal: today + tomorrow side-by-side after 3pm. Most lunch ends at 4pm anyway. Revisit when there's user data.
- Investor dashboard / metrics page. Better short-term solution: Tuesday-noon screenshots in deck.


- **Restaurant count**: 138 approved (up from 50 when notes started). One VA (Olga) doing all the work, second VA ghosted. 100+ is the inflection point where features like search/filter, duplicate detection, neighborhood SEO, and partner/aggregator UX matter much more.

## 🧠 STRATEGIC DECISIONS (locked in)
- **Lunch is flagship. Brunch is upsell.** letsgetbrunch.nyc owned defensively, parked. Same DB, same users, same admin. Brunch becomes a second deal type per restaurant later. Customer is the asset, not the daypart.
- **PWA before native App Store launch.** One app, not two. Daypart-aware UI. Build native ONLY when there's data showing users want it.
- **Investor / fundraising readiness.** USER NEEDS A DECK. Has business plan, no deck. Different tools. Use Tuesday-noon screenshots, not site spoofing. Current traction headline: 30-40 restaurants signed up via VA outreach.
- **Map POI clicks left enabled** (Resy/OpenTable pattern, not DoorDash). Contextual richness > sterilized map.

## Live URLs
- Site: https://www.letsgetlunch.nyc
- Repo: https://github.com/ph1models-gif/lets-get-lunch
- Server: root@openclaw2-1.tail2e11b9.ts.net (password: cawKT79UgEbV)
- Project path: /home/ocuser/.openclaw/workspace/lets-get-lunch
- Admin: /admin (password: lunch2026)
- Defensive domain owned: letsgetbrunch.nyc (parked)

## Tech Stack
- Next.js 14.2.3, TypeScript, Tailwind CSS
- Supabase (DB, Auth, Storage)
- Vercel (auto-deploy on push to main)
- Resend (transactional emails)
- Google Workspace (brian@, hello@, restaurants@letsgetlunch.nyc)

## How We Work
- SSH into server → edit files → git add -A && git commit && git push
- Vercel auto-deploys on push to main
- python3 patches often get cut off in terminal — verify with grep after
- When python heredocs fail, fall back to sed -i
- ⚠️ sed -i with patterns like </div> can match in MANY places — verify with grep -c after
- Always cat existing file before editing
- Always cp file to backups/ before non-trivial edits
- ALWAYS run `npm run build` and check for "Compiled successfully" before pushing major changes
- Terminal display sometimes scrambles long pastes (cosmetic only — verify with wc -l and tail)
- For React/Map/async race conditions: don't trust useEffect alone — set initial state at object creation, then use useEffect for live updates
- HTML5 input types like `type="url"` validate BEFORE JS submit handlers run. If you need JS-side massaging (like auto-prefix), use `type="text"` and validate in JS.

## Database
- restaurants: id, name, neighborhood, address, cuisine, bio, work_friendly, walk_in, wifi, seats, hours, is_active, photo_url, photo_urls, lat, lng, website (NEEDS: phone, is_partner)
- deals: id, restaurant_id, special, price, courses, days (text[] DEFAULT Mon-Fri), is_active
- vendors: id, restaurant_name, contact_name, email, phone, address, website, neighborhood, cuisine, seats, hours, special, price, work_friendly, wifi, bio, days, message, status, photo_url, photo_urls, created_at
- profiles: id (→auth.users), name, email, phone, neighborhood, dietary_prefs, created_at
- reservations: id, restaurant_id, user_id, name, contact, party_size, preferred_time, note, confirmation_code, code, status, created_at

## Admin Dashboard — 6 Tabs
1. Pending Submissions — vendor cards, Review & Edit, Quick Approve, Reject. Photos clickable for lightbox. (NEEDS: Website field in Review & Edit form)
2. Active Listings — edit form, Hide/Delete. Search by name/address + filter by neighborhood/cuisine + show hidden. (NEEDS: Website field in edit form)
3. Reservations — Today/All toggle, summary stats, 🔁 repeat booker badges
4. + Add Listing — direct restaurant creation. (NEEDS: Website field)
5. Users — total signups, joined this week, list with name/email/neighborhood/date
6. Contacts — all vendor submissions with clickable mailto/tel links. ↻ Restore button on rejected rows.

## Working Features
- Homepage map with price pins (correctly filtered by today's day from initial load), neighborhood search, cuisine filters, laptop/wifi checkboxes, price slider, day-of-week filtering
- Detail page with photos, deal card, days badge, address, share button, Reserve button
- Reservation modal (4 states: book → password → signin → success) with QR code in email
- Auth-aware navbar with real-time updates
- Login page with split First/Last name, strong password validation
- /signup standalone page
- /reset-password full flow
- Vendor signup form (NEW: includes required Website field with auto-prefix)
- Confirmation email with QR, restaurant address, unsubscribe footer
- Custom blue dot favicon
- Hours range 10:30am–4:30pm
- Admin photo lightbox
- Admin Active Listings search + filters
- Admin Restore rejected vendors

## Password Rules
Min 8 chars, 1 uppercase, 1 number, 1 symbol

## Key Decisions
- Two-step modal (book then password) for conversion
- Login defaults to Sign In tab
- Email aliases over separate accounts
- Stay on Google Workspace
- "Today" default in reservations with All Time toggle
- Auth uses Supabase localStorage (default) — works because all auth-checking pages are 'use client'
- One product, one brand. Daypart variants via deal types, not separate apps.
- PWA before native app
- lib/neighborhoods.ts is the single source of truth — never define NEIGHBORHOODS locally again
- New required fields use type="text" + JS validation (not type="url") so we can auto-prefix gracefully
