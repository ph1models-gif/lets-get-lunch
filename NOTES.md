# Let's Get Lunch — Project Notes
**Last updated: May 10, 2026 (late evening)**

## ✅ Recently Fixed (May 18-19, 2026 — long session)

### Bug D — Signup not saving email to profiles (FIXED)
- Root cause: /login signup tab was missing email field in profiles.insert. /signup and reservation modal were already correct.
- One-line fix in app/login/page.tsx — added email field to the insert.
- Backfilled 8 existing NULL email rows: UPDATE profiles SET email = u.email FROM auth.users u WHERE profiles.id = u.id AND profiles.email IS NULL.
- Cleaned up Brian's test auth accounts (deleted 3, kept brian@letsgetlunch.nyc). Accidentally deleted Brian's profile row during cleanup, recreated via INSERT. Lesson: confirm UUIDs against emails before bulk profile deletes.

### Bug C — Email deliverability (DNS DONE — reputation pending)
- Resend domain verified with SPF + DKIM (Google + Resend DKIM records).
- Added DMARC TXT record to GoDaddy: _dmarc = v=DMARC1; p=none; rua=mailto:brian@letsgetlunch.nyc.
- Removed a pre-existing GoDaddy-default DMARC that pointed to onsecureserver.net with p=quarantine.
- Brian trained his Gmail to inbox the address.
- Future: after a few weeks of clean monitoring, bump p=none to p=quarantine.

### Admin: auto-geocode address on edit save
- saveEdit in app/admin/page.tsx now re-geocodes via Google's API when admin saves an edit. lat/lng are overwritten with whatever Google returns.
- Falls back to whatever's in the form if geocoding fails (network/API issue) so a blip can't wipe coordinates.
- Already proved its value — Brian caught a SoHo listing Olga had submitted with a wrong address; fix-and-save moved the pin to the right block automatically.

### Map UX overhaul
- Default map center moved from Times Square to Madison Square Park (40.7425, -73.9879). Default zoom raised from 13 to 16.
- Auto-zoom to user when in NYC bounds. Geolocation block checks rough NYC bounding box (lat 40.49-40.92, lng -74.27 to -73.68). If user is in NYC: pan + zoom to 15. Outside NYC: stay at Madison Square Park default.
- Mobile peek pattern. Map height shrunk to 50vh on mobile (was 420px fixed), capped at 420px on desktop via maxHeight, minHeight 280px. List count + first card now peek above the fold.
- Hero (H1 + tagline) initially hidden on mobile via hidden md:block, then later redesigned (see Header redesign below).
- Search button removed. Was redundant with autocomplete which already pans the map on selection.
- Map-list sync (Airbnb auto-sync pattern). Map emits bounds via onBoundsChange callback debounced via the 'idle' event. Page holds mapBounds state and filters the visible list by lat/lng inside bounds. Both count text and list update live as user pans/zooms.
- Dynamic count text now reads: "X lunch specials in this area · Scroll for details ↓".
- iOS Safari zoom-on-input bug fixed. NeighborhoodSearch input fontSize raised from 14px to 16px. NEW RULE: every input/textarea/select with mobile usage must be ≥16px font, else Safari auto-zooms on focus and breaks layout.
- Google POI clicks disabled (clickableIcons: false on map). Reverses the earlier "POI clicks left enabled" decision — popups confused users on mobile.
- Map click closes restaurant popup. Standard Google Maps UX (tap map = close info window). Was missing.
- Neighborhood search zoom fixed. Was hardcoded to setZoom(14) — felt like zooming OUT after we raised the default to 16. Changed to 16 to match.
- InfoWindow disableAutoPan changed from true to false so Google centers the popup in view when user taps a pin near the edge of the visible area.

### Header redesign (mobile-first brand identity)
- Added Bebas Neue font via next/font/google in app/layout.tsx (Inter still default for body).
- Top nav brand block restructured to two lines:
  - Line 1: "Let's Get **Lunch**" in Bebas Neue, "Lunch" in brand blue (#4A9FD5)
  - Line 2: "NYC's best lunch deals, **at the table.**" — small gray text, "at the table." in blue
- Mirrors the logo aesthetic (heavy condensed sans-serif, blue Lunch accent).

### Website pipeline (carried over from May 17)
- All admin tasks done in app/admin/page.tsx:
  - Approval flow had website: vendor.website (done May 10)
  - Active Listings edit form had website field (done May 10)
  - Added Website input to Pending vendor Review & Edit form
  - Added Website field to + Add Listing form (state, insert, reset, UI)
  - Added Website display to Active Listings card view (clickable link)

### Workflow lesson — Safari mobile caching
- Multiple times this session things "looked broken" on phone that were just browser cache. First mobile debug step: force-close the Safari/Chrome tab (swipe up dismiss, not just navigate away) and open letsgetlunch.nyc in a fresh tab.

## 🎯 NEXT SESSION — START HERE

Three big items, in priority order:

### 1. Tier 1 / Tier 2 partner feature + reservation modal close UX (HIGH — investor readiness)

**Partner/Tier work:**
- Suppress QR code on Tier 1 reservation confirmations (success modal + confirmation email).
- Replace "show this code at the door" copy with website + phone CTAs for Tier 1.
- Tier 2 (Royal 35 only for now) keeps the existing QR + "show code" flow.
- Schema work first:
  - Add is_partner boolean default false to restaurants table.
  - Flip Royal 35 to is_partner=true.
  - Add phone text column to restaurants, backfill from vendors.phone.
- Full plan in "Partner/Aggregator Feature" section below.
- Brian flagged this as a blocker before angel investor outreach.

**Reservation modal close UX (bundle with Tier 1 work — same file, app/restaurants/[id]/page.tsx):**
- Mobile users have no clear way to dismiss the "Reserve your lunch" bottom-sheet modal once it opens. Brian hit this himself testing on phone — "Back to results" is the only exit and it's not visible until you scroll up past the modal contents.
- Fix: add an X close button top-right of the modal, AND make tapping the gray backdrop close the modal. Standard mobile modal pattern.
- This is a real conversion blocker — if a user opens the modal then changes their mind, getting unstuck shouldn't require muscle memory.

### 2. lib/cuisines.ts refactor + "All" pill + Turkish + zip code search
Three related front-end items that all touch cuisine/search UX. Best done together:
- (a) Create lib/cuisines.ts as single source of truth (mirrors lib/neighborhoods.ts pattern). Closes Bug F. Currently three drifted lists: page.tsx filters array, list-your-restaurant CUISINES, admin CUISINES.
- (b) Add Turkish to the list (lots of Turkish restaurants Olga is finding).
- (c) Drop the "All" pill on mobile only (keep on desktop). Saves space and matches modern filter-chip UX.
- (d) Add zip code search to NeighborhoodSearch autocomplete. Recommended approach: hardcoded lib/zipcodes.ts file with ~180 NYC zips + lat/lng. Update placeholder: "Neighborhood — try 'Midtown'" → "Neighborhood or zip code".

### 3. iOS Safari zoom-on-input — apply rule everywhere
We fixed it on NeighborhoodSearch (14px → 16px). Same bug almost certainly on:
- Login page (email, password, name)
- /signup standalone
- /reset-password
- Reservation modal
- /list-your-restaurant vendor form
- Admin forms
Rule: every input/textarea/select on mobile must be ≥16px font (or Tailwind text-base).

## ✅ Recently Fixed (May 18-20, 2026 — multi-day session)

### CRITICAL INCIDENT — "no listings" was Supabase egress quota (May 20)
- Symptom: site showed map with zero pins and "0 lunch specials," looked location-related (Brian was in East Hampton). It was NOT location.
- Real cause: Supabase project hit its free-tier egress (bandwidth) quota and got restricted. The data fetch returned "exceed_cached_egress_quota" error, so restaurants array stayed empty. Map still rendered (Google Maps is independent of the data).
- Fix: upgraded Supabase to Pro plan ($25/month). Restriction lifted within minutes, site came back.
- Lesson: empty listings + working map = check the data fetch / Supabase status FIRST, before touching filter code. The map rendering does not mean the data loaded.
- Diagnostic that nailed it: a small node script (check.mjs) querying the DB directly returned the egress error. (Supabase creds are hardcoded in lib/supabase.ts, not in .env.local.)

### SCALING / COST NOTES (future work, not urgent)
- At ~1000 active users, expected Supabase cost is roughly $25-60/month depending on engagement and photo sizes. Pro includes 250GB egress; overage ~$0.09/GB.
- Almost all egress is restaurant PHOTOS served from Supabase storage on every page load. Two optimizations would massively cut cost and allow scaling to 10k+ users on the $25 plan:
  1. Put a CDN (e.g. Cloudflare free tier) in front of images, OR use Next.js next/image so Vercel serves optimized images and takes load off Supabase.
  2. Compress/resize on upload — cards need ~100KB thumbnails, not 2-3MB phone photos. Load full image only on detail page.
- Do these BEFORE real traffic ramps.

### Bug D — Signup not saving email to profiles (FIXED)
- Root cause: /login signup tab was missing email field in profiles.insert. /signup and reservation modal were already correct.
- Fix in app/login/page.tsx — added email field to the insert.
- Backfilled 8 NULL email rows: UPDATE profiles SET email = u.email FROM auth.users u WHERE profiles.id = u.id AND profiles.email IS NULL.
- Cleaned up Brian's test auth accounts (deleted 3, kept brian@letsgetlunch.nyc). Accidentally deleted then recreated Brian's profile row. Lesson: confirm UUIDs against emails before bulk profile deletes.

### Bug C — Email deliverability (DNS DONE — reputation pending)
- Resend domain verified with SPF + DKIM (Google + Resend records).
- Added DMARC TXT to GoDaddy: _dmarc = v=DMARC1; p=none; rua=mailto:brian@letsgetlunch.nyc. Removed old GoDaddy-default DMARC (onsecureserver.net, p=quarantine).
- First Google DMARC report (May 18) confirmed SPF + DKIM both PASS, disposition none. Working.
- Future: after weeks of clean reports, bump p=none to p=quarantine.

### Admin: auto-geocode address on edit save
- saveEdit in app/admin/page.tsx re-geocodes via Google API on save; lat/lng overwritten with Google's result. Falls back to form values if geocoding fails.
- Proven: fixed a mislocated SoHo listing (Le Coucou / "Starr restaurants", 138 Lafayette St) that was pinned out near Staten Island.

### Map UX overhaul
- Default center moved to Madison Square Park (40.7425, -73.9879), zoom raised 13 to 16.
- Auto-zoom to user when inside NYC bounding box (lat 40.49-40.92, lng -74.27 to -73.68): pan + zoom 15. Outside NYC: stays at default.
- Mobile peek pattern: map 50vh (was 420px fixed), maxHeight 420px desktop, minHeight 280px. Count + first card peek above fold.
- Search button removed (autocomplete pans map on select).
- Map-list sync (Airbnb auto-sync): map emits bounds via onBoundsChange (debounced via 'idle'), page filters list by lat/lng inside bounds.
- Dynamic count text: "X lunch specials in this area · Scroll for details ↓".
- iOS Safari zoom-on-input fixed: NeighborhoodSearch input 14px to 16px. RULE: every mobile input must be ≥16px font.
- Google POI clicks disabled (clickableIcons: false). Map click closes restaurant popup. InfoWindow disableAutoPan true to false (popup centers in view on tap).
- Neighborhood search zoom fixed: was setZoom(14) which zoomed OUT after default became 16; now setZoom(16).

### Header redesign (mobile + desktop split)
- Added Bebas Neue via next/font/google in app/layout.tsx (Inter still body default; bebas as --font-bebas variable).
- MOBILE: two-line brand — "Let's Get **Lunch**" (Bebas, Lunch in blue #4A9FD5) + small "NYC's best lunch deals, **at the table.**" (at the table. in blue). md:hidden.
- DESKTOP: reverted to the old plain "Let's Get Lunch" (Inter, font-semibold text-lg) in the nav, with the big centered hero below unchanged. hidden md:block.
- Net: mobile gets the new branded look, desktop looks like it did pre-May-20.

### Website pipeline (carried over from May 17)
- All admin tasks done in app/admin/page.tsx: approval insert, edit form, pending review form, + Add Listing form, and Active Listings card display all handle website field.

### Workflow lessons
- Safari mobile caches aggressively. First mobile debug step: force-close the tab (swipe-up dismiss) and reopen — multiple "broken" reports this session were just cache.
- Terminal heredoc gotcha: don't let stray text (like a pasted closing tag) land on the command line; it causes cascading syntax errors. Paste one clean block at a time.

## 🎯 NEXT SESSION — START HERE

### 1. Tier 1 / Tier 2 partner feature + reservation modal close UX (HIGH — investor readiness)
Both touch app/restaurants/[id]/page.tsx — do together.
- Partner/Tier: suppress QR on Tier 1 reservation confirmations (success modal + email); replace "show code at door" with website + phone CTAs; Tier 2 (Royal 35) keeps QR. Schema first: add is_partner boolean default false to restaurants, flip Royal 35 true, add phone text to restaurants and backfill from vendors.phone.
- Reservation modal close UX: mobile users can't dismiss the "Reserve your lunch" bottom-sheet. Add X button top-right + tap-backdrop-to-close. Brian hit this himself.

### 2. lib/cuisines.ts refactor + Turkish + drop "All" on mobile + zip search
- Create lib/cuisines.ts as single source of truth (mirrors lib/neighborhoods.ts). Closes Bug F. Three drifted lists today: page.tsx filters (line 75), list-your-restaurant CUISINES (line 7), admin CUISINES (line 57).
- Add "Turkish" (lots of Turkish spots Olga is finding).
- Drop the "All" pill on mobile only (keep desktop).
- Zip code search: hardcoded lib/zipcodes.ts (~180 NYC zips + lat/lng). Placeholder to "Neighborhood or zip code".

### 3. Image optimization for egress (see SCALING NOTES above)
- next/image or CDN + compress-on-upload. Real cost-saver before traffic grows.

### 4. iOS Safari zoom-on-input everywhere else
- Login, /signup, /reset-password, reservation modal, /list-your-restaurant, admin forms — all inputs ≥16px.

## ✅ Recently Fixed (May 17, 2026)
- **Website pipeline complete** — all 4 admin tasks done in app/admin/page.tsx:
  1. Approval flow already had `website: vendor.website` (done May 10)
  2. Active Listings edit form already had website field (done May 10)
  3. Added Website input to Pending vendor Review & Edit form
  4. Added Website field to + Add Listing form (state, insert, reset, UI)
  5. Added Website display to Active Listings card view (clickable link, shows above Contact)
- **Bug D fixed — signup not saving email to profiles** — /login signup tab was missing `email` field in profiles.insert (the other 2 signup paths /signup and reservation modal were already correct). Added the line. Verified, built clean, pushed.
- **Backfilled 8 profile rows with NULL emails** — UPDATE profiles SET email = u.email FROM auth.users u WHERE profiles.id = u.id AND profiles.email IS NULL. All clean now.
- **Personal cleanup** — deleted 3 test accounts of Brian's (brian@newyorkheadshots.com, ph1models@gmail.com, info@keith-photography.com). Kept brian@letsgetlunch.nyc. Note: accidentally deleted Brian's own profile row during cleanup — recreated via INSERT. Lesson: double-check UUIDs against email before bulk profile deletes.

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
