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

## 🐛🔴 DUPLICATE-CREATION BUG — CONFIRMED SYSTEM BUG (fix first thing next session)

CONCLUSION: the SYSTEM is creating duplicate restaurant rows, NOT Olga. Two independent pieces of proof:
1. "Sarabeth's Central Park South" — 3 rows, identical address, created within 0.8 SECONDS (May 20 21:11:20.8 / .3 / .6). Impossible by hand = one approval action fired the insert 3x.
2. Mission Ceviche (Brian watched it happen live): had 1 listing → learned there are 2 real locations (UES 1400 2nd Ave + Union Square 7 E 17th St, both legit) → EDITED one listing's ADDRESS → a THIRD row appeared. So editing an address INSERTED a new row instead of UPDATING the existing one.

### TWO suspected code paths to investigate (app/admin/page.tsx):
A) APPROVAL flow double-insert: the "Approve" action on a pending vendor isn't disabled during submit and/or doesn't guard against re-fire → multiple inserts (explains Sarabeth's sub-second triple). FIX: disable button while submitting; guard by checking name+address exists before insert; ensure insert can't run on re-render.
B) EDIT-ADDRESS-creates-row: editing an existing listing's address may be INSERTing instead of UPDATEing (explains Mission Ceviche 3rd row). Check saveEdit — confirm it does .update().eq('id', r.id) and is NOT falling into an insert path. (Possibly related to the auto-geocode-on-save change from May 18? Verify saveEdit still updates the same row id and didn't start creating new rows.)

### Mission Ceviche current state (3 rows — worked example for the fix):
- "Mission Ceviche" — 1400 2nd Ave UES — CORRECT Peruvian bio — currently HIDDEN — id starts (see admin)
- "Mission Ceviche Union Square" — 7 E 17th St — WRONG bio (says "Rustic Italian...pasta, pizza") — phone 212-680-4067 — this is the only row for the US location, KEEP but FIX BIO
- "Mission Ceviche Upper East Side" — 1400 2nd Ave UES (dup of #1) — WRONG "Rustic Italian" bio — phone 212-650-0014
- Resolution: UES has TWO rows (true dup) → keep one, fix its bio/website/phone, make visible, delete the other. US location → keep, fix bio. NOTE the wrong "Rustic Italian" bios appeared on the system-created rows — clue that duplication also copied/garbled data.

### CLEANUP PLAN (next session, AFTER fixing the bug so it stops recurring):
1. Fix bug paths A and B above first.
2. Then dedupe true same-address dups, keeping the row with correct data / any attached reservations (check reservations table before deleting — don't orphan). True dups: Fushimi (475 Driggs), Felice on Hudson (615 Hudson), Sarabeth's (40 W 59th x3), Mission Ceviche UES (1400 2nd Ave x2).
3. Human-review name collisions that are actually DISTINCT locations — do NOT delete: Arte Cafe (Chelsea vs UWS), Tacombi (FiDi 74 Broad vs the Amsterdam Ave one which is MISLABELED "Financial District" — fix its name+neighborhood).
4. Consider a DB unique constraint or pre-insert existence check on (name, address) to prevent future dups at the data layer.

## 🐛 DUPLICATE LISTINGS — diagnosed May 21, NOT yet cleaned (DO CAREFULLY NEXT SESSION)

280 active restaurants; 5 names appear more than once. Timestamp analysis shows TWO different causes — so do NOT bulk-delete (3 of the rows are legit/distinct):

### TRUE duplicates (same name + SAME address) — safe to dedupe, keep OLDEST:
- Fushimi — both 475 Driggs Ave, created 6 days apart (May 2 & May 8). Human re-submission. Keep 18b37fad (older), remove 9e9421e6.
- Felice on Hudson — both 615 Hudson St, created 2 days apart (May 4 & May 6). Human re-submission. Keep dcb07076 (older), remove a127766d.
- Sarabeth's Central Park South — THREE rows, same address (40 W 59th St), created within 0.8 SECONDS of each other (May 20 21:11:20.8 / 21.3 / 21.6). Keep one (e.g. 355ea3a9), remove the other two.

### NOT duplicates — distinct restaurants or mislabels, DO NOT DELETE, human-review:
- Arte Cafe — two DIFFERENT locations: 191 7th Ave (Chelsea) vs 106 W 73rd St (UWS). Both real. Maybe rename to distinguish (e.g. "Arte Cafe - Chelsea" / "Arte Cafe - UWS").
- Tacombi - Financial District — 74 Broad St (real FiDi) vs 377 Amsterdam Ave (UWS!). Second is MISLABELED — it's a UWS location wearing the FiDi name. Fix the name + neighborhood on the Amsterdam Ave one.

### ROOT CAUSE (the system bug to fix):
- The sub-second Sarabeth's triple = approval action firing the insert multiple times (double-click, or insert running on re-render / not disabled during submit). This is a real bug in the admin approval flow (app/admin/page.tsx).
- FIX NEXT SESSION: (1) disable the Approve button while submitting + guard against double-insert (check if a restaurant with same name+address already exists before inserting, or debounce/disable the button). (2) THEN clean the true duplicates above, checking first whether any duplicate row has reservations attached (don't orphan reservation data — keep the row that has reservations if they differ). (3) Human-review Arte Cafe + Tacombi.

### REFERENCE: Olga's master sheet
- Brian has a master tracking spreadsheet (NYC_Lunch_Restaurants_.xlsx): 281 approved rows, columns include Status, Uploaded By, Name, Address, Neighborhood, Cuisine, "Category (A or B)", deal, price, days, hours, phone, email, website, Instagram, 4 photo URLs, source URL, date verified, notes. This is the source-of-truth list to reconcile the DB against.
- "Category (A or B)" MEANING (confirmed by Brian): A = open for lunch AND has a defined prix-fixe lunch special (these go live on the site — they fit the premise). B = open for lunch but NO lunch special (not uploaded). Olga was told to focus on uploading A's only, to move fast and make the site look full.
- STRATEGIC VALUE: the B list is a pre-qualified OUTREACH PIPELINE — restaurants already known to serve lunch that could be pitched to create a lunch special (list free) and later upgrade to partner. Warm sales list for growing inventory AND the partner program. Don't lose it. Revisit for outreach once the A inventory is solid.

## ✅ Shipped (May 21, 2026 — Tier 1 hand-off session)

### Honest non-partner reservation hand-off (DONE — on-screen + email)
- Decision: keep the entire reservation flow/modal as-is. Only changed what happens AFTER "Reserve Now" — no QR for non-partners.
- On-screen success (app/restaurants/[id]/page.tsx): "You're confirmed!" → "You're all set!". Removed QR code + reservation code + "show this at the restaurant". Replaced with honest box: "[restaurant] isn't a Let's Get Lunch partner yet, so we can't book your table directly. Call ahead or just walk in — and mention you saw the lunch special on Let's Get Lunch." Plus tap-to-call phone button (r.phone) and Visit website link (r.website), each only rendering if present. Address box, email line, Done, Tell a friend all kept. Share text "I just booked" → "I just found".
- Email (app/api/reserve/route.ts): subject "Your lunch reservation —" → "Your lunch plan —". "You're confirmed!" → "You're all set!". Removed QR/code block. Same honest hand-off text + Call (tel:) + Website links. Reservation details box (restaurant/address/time/party size) and Add to Calendar KEPT. Extended the existing restaurant fetch to also select phone, website (route only received name/address before).
- Reservation still saves to the reservations table as a lead (resCode still generated server-side) — preserves demand data for future partner sales pitch.

### Phone column (schema + backfill)
- restaurants table had NO phone column (phone lived only on vendors). Added it: ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone text;
- Backfilled by name match: UPDATE restaurants r SET phone = v.phone FROM vendors v WHERE r.name = v.restaurant_name AND v.phone IS NOT NULL AND v.phone <> '' AND r.phone IS NULL;
- Result: 255 of 258 active restaurants got a phone. 3 didn't match (admin-renamed listings like Le Coucou / "Starr restaurants"). Fill those 3 by hand once phone is added to the admin forms.
- NOTE: vendors↔restaurants have NO foreign key — only matchable by name (vendors.restaurant_name = restaurants.name). Fuzzy link.
- STILL TODO: add phone field to admin edit form + Add Listing form so Brian/Olga can fill the 3 gaps and future ones. (The reservation page already reads phone fine via select('*').)

### Reservation modal close UX (DONE)
- Old X was hidden on mobile (hidden sm:block) and a faint floating ×. Replaced with a visible gray circle X (top-right, shows on all screens), added relative to the card so it anchors correctly.
- Added tap-the-backdrop-to-close (backdrop onClick closes; inner card stopPropagation so taps inside don't close).

### Lincoln Square neighborhood (DONE)
- Added "Lincoln Square" to lib/neighborhoods.ts (alphabetical, after Lenox Hill). Confirmed live in the dropdown.
- WHY/sequence lesson: tagging happens at upload time from the dropdown. Add the label BEFORE sending Olga to source an area, so listings are tagged correctly from the start — avoids manual re-tagging cleanup. (Olga works one neighborhood at a time; Brian directs which.)
- NEXT: send Olga to source the Lincoln Center / Columbus Circle / lower-UWS pocket (currently thin on the map) and tag them Lincoln Square.

## 🎯 STILL OPEN / NEXT SESSION
- Add phone field to admin edit + Add Listing forms (fill the 3 missing phones + future).
- lib/cuisines.ts refactor (Bug F) + add "Turkish" + drop "All" pill on mobile + zip code search (lib/zipcodes.ts). All touch the taxonomy layer — batch together.
- Partner/Tier 2 build: only when a real restaurant is ready to pay. is_partner flag, QR attribution, partner branch in reservation flow. Demand-logging table (count reservation intents per restaurant) is the warm-list/sales-pitch data.
- Insiders/reviewer program (UGC + social content) — phased: social accounts now (no code) → curated admin-queue submissions → public reviews once volume exists. PICK A NAME.
- Image optimization for egress (next/image or CDN + compress on upload) before traffic ramps.
- iOS input ≥16px on all remaining forms (login, signup, reset-password, vendor form, admin).

## 💡 STRATEGY & GROWTH NOTES (May 21, 2026) — for deck + marketing

### TWO SEPARATE "TIER" CONCEPTS — do not conflate (naming matters)
There are two unrelated systems that accidentally both got called "tier." Keep them distinct in all future docs:

1. **Partner restaurants (the revenue model)** — paying restaurants. Get QR-code attribution proving Let's Get Lunch sent them customers, plus future tools. This is what we charge for.
2. **Insiders / Reviewers (the community + content engine)** — power DINERS, not restaurants. They eat the lunches and leave real reviews + photos. Free user-generated content. NOT a revenue tier — a community/marketing program. Needs a non-confusing name (candidates: Insiders, Regulars, Tasters, LGL Locals). PICK A NAME before building.

### BUSINESS MODEL LOGIC (marketplace sequencing)
- Free listings = our inventory and our diner funnel. A directory at 20% coverage is a bad directory; removing free listings would gut both diner demand AND the value we sell to restaurants. So: LIST EVERYONE FREE.
- The paid relationship is reserved for partners who want attribution + proof-of-referral (QR check-in) + tools.
- The free tier is the flywheel; the partner tier is the revenue. Build the free side first, monetize once we have leverage (diner volume + demand data).
- Deck framing: "We list every prix-fixe lunch in NYC free — inventory + diner funnel. Revenue = partner tier: restaurants pay for attribution/proof-of-referral via QR check-in + tools. Free flywheel is built + one pilot partner (Royal 35); paid tier rolls out as we sign restaurants."

### TIER 1 (non-partner) RESERVATION — honest hand-off (DECISION)
- KEEP the existing reservation modal/flow exactly as-is (party size, time, Reserve Now). Do NOT remove or redesign it — it's a big part of the site and works.
- ONLY change what happens AFTER clicking Reserve Now for a non-partner restaurant: show an honest message — "This restaurant isn't a Let's Get Lunch partner yet, so call them directly or walk in to book" — with tap-to-call phone + website link.
- Rationale: never imply we booked a table we didn't. A confirmation/QR for a restaurant not on our system would burn diners the first time the restaurant has no idea what the code is.
- Partner restaurants (Royal 35) keep the QR confirmation flow.

### DEMAND-LOGGING IDEA (high value — powers partner sales)
- When a diner tries to reserve a non-partner restaurant, log the intent (restaurant id + timestamp). This becomes demand signal per restaurant.
- Sales pitch later: "23 diners tried to book you through us last month — want to actually capture them?" Killer Tier-2/partner conversion tool and great deck data.
- Not built yet. Needs a small table. Consider for next build once the honest hand-off is shipped.

### INSIDERS / REVIEWER PROGRAM (content + growth engine) — phased
- Concept: power diners leave real reviews + photos of the actual lunches. Authentic UGC = cheapest, most credible marketing for a local directory. Repost across social. Makes diners feel ownership.
- COLD-START WARNING: review systems are a trap early — empty reviews look worse than none. Don't ship public reviews until there's diner volume to fill them.
- PHASING:
  - Phase 1 (NOW, no code): start Let's Get Lunch Instagram/TikTok. Brian + a few early Insiders eat lunches, photograph, post. Promotion engine starts now, tests the content idea, builds audience.
  - Phase 2 (soon, light code): invited Insiders submit review + photo into an ADMIN QUEUE Brian approves (curated, not auto-live). Keeps quality high, avoids ghost town, Brian controls what becomes marketing content.
  - Phase 3 (later, real feature): public reviews on listing pages, diner profiles, "Insider" badge — once volume makes it look alive.
- Deck slide: "Growth & content: an Insiders program turns engaged diners into reviewers, generating authentic photo content we repurpose across social — community-driven marketing at near-zero cost."

### FOR THE MARKETING CHAT (hand-off summary)
- Start social accounts now (IG/TikTok), food-photo led.
- Insiders program is the content flywheel — recruit a handful of early power diners.
- Brand voice already established in header: "NYC's best lunch deals, at the table." (Bebas Neue, blue accent on "Lunch" and "at the table.")
- Site is live at letsgetlunch.nyc, ~269 listings, mobile-first.

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

## 🐛 DUPLICATE LISTINGS — diagnosed May 21, NOT yet cleaned (DO CAREFULLY NEXT SESSION)

280 active restaurants; 5 names appear more than once. Timestamp analysis shows TWO different causes — so do NOT bulk-delete (3 of the rows are legit/distinct):

### TRUE duplicates (same name + SAME address) — safe to dedupe, keep OLDEST:
- Fushimi — both 475 Driggs Ave, created 6 days apart (May 2 & May 8). Human re-submission. Keep 18b37fad (older), remove 9e9421e6.
- Felice on Hudson — both 615 Hudson St, created 2 days apart (May 4 & May 6). Human re-submission. Keep dcb07076 (older), remove a127766d.
- Sarabeth's Central Park South — THREE rows, same address (40 W 59th St), created within 0.8 SECONDS of each other (May 20 21:11:20.8 / 21.3 / 21.6). Keep one (e.g. 355ea3a9), remove the other two.

### NOT duplicates — distinct restaurants or mislabels, DO NOT DELETE, human-review:
- Arte Cafe — two DIFFERENT locations: 191 7th Ave (Chelsea) vs 106 W 73rd St (UWS). Both real. Maybe rename to distinguish (e.g. "Arte Cafe - Chelsea" / "Arte Cafe - UWS").
- Tacombi - Financial District — 74 Broad St (real FiDi) vs 377 Amsterdam Ave (UWS!). Second is MISLABELED — it's a UWS location wearing the FiDi name. Fix the name + neighborhood on the Amsterdam Ave one.

### ROOT CAUSE (the system bug to fix):
- The sub-second Sarabeth's triple = approval action firing the insert multiple times (double-click, or insert running on re-render / not disabled during submit). This is a real bug in the admin approval flow (app/admin/page.tsx).
- FIX NEXT SESSION: (1) disable the Approve button while submitting + guard against double-insert (check if a restaurant with same name+address already exists before inserting, or debounce/disable the button). (2) THEN clean the true duplicates above, checking first whether any duplicate row has reservations attached (don't orphan reservation data — keep the row that has reservations if they differ). (3) Human-review Arte Cafe + Tacombi.

### REFERENCE: Olga's master sheet
- Brian has a master tracking spreadsheet (NYC_Lunch_Restaurants_.xlsx): 281 approved rows, columns include Status, Uploaded By, Name, Address, Neighborhood, Cuisine, "Category (A or B)", deal, price, days, hours, phone, email, website, Instagram, 4 photo URLs, source URL, date verified, notes. This is the source-of-truth list to reconcile the DB against.
- "Category (A or B)" MEANING (confirmed by Brian): A = open for lunch AND has a defined prix-fixe lunch special (these go live on the site — they fit the premise). B = open for lunch but NO lunch special (not uploaded). Olga was told to focus on uploading A's only, to move fast and make the site look full.
- STRATEGIC VALUE: the B list is a pre-qualified OUTREACH PIPELINE — restaurants already known to serve lunch that could be pitched to create a lunch special (list free) and later upgrade to partner. Warm sales list for growing inventory AND the partner program. Don't lose it. Revisit for outreach once the A inventory is solid.

## ✅ Shipped (May 21, 2026 — Tier 1 hand-off session)

### Honest non-partner reservation hand-off (DONE — on-screen + email)
- Decision: keep the entire reservation flow/modal as-is. Only changed what happens AFTER "Reserve Now" — no QR for non-partners.
- On-screen success (app/restaurants/[id]/page.tsx): "You're confirmed!" → "You're all set!". Removed QR code + reservation code + "show this at the restaurant". Replaced with honest box: "[restaurant] isn't a Let's Get Lunch partner yet, so we can't book your table directly. Call ahead or just walk in — and mention you saw the lunch special on Let's Get Lunch." Plus tap-to-call phone button (r.phone) and Visit website link (r.website), each only rendering if present. Address box, email line, Done, Tell a friend all kept. Share text "I just booked" → "I just found".
- Email (app/api/reserve/route.ts): subject "Your lunch reservation —" → "Your lunch plan —". "You're confirmed!" → "You're all set!". Removed QR/code block. Same honest hand-off text + Call (tel:) + Website links. Reservation details box (restaurant/address/time/party size) and Add to Calendar KEPT. Extended the existing restaurant fetch to also select phone, website (route only received name/address before).
- Reservation still saves to the reservations table as a lead (resCode still generated server-side) — preserves demand data for future partner sales pitch.

### Phone column (schema + backfill)
- restaurants table had NO phone column (phone lived only on vendors). Added it: ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone text;
- Backfilled by name match: UPDATE restaurants r SET phone = v.phone FROM vendors v WHERE r.name = v.restaurant_name AND v.phone IS NOT NULL AND v.phone <> '' AND r.phone IS NULL;
- Result: 255 of 258 active restaurants got a phone. 3 didn't match (admin-renamed listings like Le Coucou / "Starr restaurants"). Fill those 3 by hand once phone is added to the admin forms.
- NOTE: vendors↔restaurants have NO foreign key — only matchable by name (vendors.restaurant_name = restaurants.name). Fuzzy link.
- STILL TODO: add phone field to admin edit form + Add Listing form so Brian/Olga can fill the 3 gaps and future ones. (The reservation page already reads phone fine via select('*').)

### Reservation modal close UX (DONE)
- Old X was hidden on mobile (hidden sm:block) and a faint floating ×. Replaced with a visible gray circle X (top-right, shows on all screens), added relative to the card so it anchors correctly.
- Added tap-the-backdrop-to-close (backdrop onClick closes; inner card stopPropagation so taps inside don't close).

### Lincoln Square neighborhood (DONE)
- Added "Lincoln Square" to lib/neighborhoods.ts (alphabetical, after Lenox Hill). Confirmed live in the dropdown.
- WHY/sequence lesson: tagging happens at upload time from the dropdown. Add the label BEFORE sending Olga to source an area, so listings are tagged correctly from the start — avoids manual re-tagging cleanup. (Olga works one neighborhood at a time; Brian directs which.)
- NEXT: send Olga to source the Lincoln Center / Columbus Circle / lower-UWS pocket (currently thin on the map) and tag them Lincoln Square.

## 🎯 STILL OPEN / NEXT SESSION
- Add phone field to admin edit + Add Listing forms (fill the 3 missing phones + future).
- lib/cuisines.ts refactor (Bug F) + add "Turkish" + drop "All" pill on mobile + zip code search (lib/zipcodes.ts). All touch the taxonomy layer — batch together.
- Partner/Tier 2 build: only when a real restaurant is ready to pay. is_partner flag, QR attribution, partner branch in reservation flow. Demand-logging table (count reservation intents per restaurant) is the warm-list/sales-pitch data.
- Insiders/reviewer program (UGC + social content) — phased: social accounts now (no code) → curated admin-queue submissions → public reviews once volume exists. PICK A NAME.
- Image optimization for egress (next/image or CDN + compress on upload) before traffic ramps.
- iOS input ≥16px on all remaining forms (login, signup, reset-password, vendor form, admin).

## 💡 STRATEGY & GROWTH NOTES (May 21, 2026) — for deck + marketing

### TWO SEPARATE "TIER" CONCEPTS — do not conflate (naming matters)
There are two unrelated systems that accidentally both got called "tier." Keep them distinct in all future docs:

1. **Partner restaurants (the revenue model)** — paying restaurants. Get QR-code attribution proving Let's Get Lunch sent them customers, plus future tools. This is what we charge for.
2. **Insiders / Reviewers (the community + content engine)** — power DINERS, not restaurants. They eat the lunches and leave real reviews + photos. Free user-generated content. NOT a revenue tier — a community/marketing program. Needs a non-confusing name (candidates: Insiders, Regulars, Tasters, LGL Locals). PICK A NAME before building.

### BUSINESS MODEL LOGIC (marketplace sequencing)
- Free listings = our inventory and our diner funnel. A directory at 20% coverage is a bad directory; removing free listings would gut both diner demand AND the value we sell to restaurants. So: LIST EVERYONE FREE.
- The paid relationship is reserved for partners who want attribution + proof-of-referral (QR check-in) + tools.
- The free tier is the flywheel; the partner tier is the revenue. Build the free side first, monetize once we have leverage (diner volume + demand data).
- Deck framing: "We list every prix-fixe lunch in NYC free — inventory + diner funnel. Revenue = partner tier: restaurants pay for attribution/proof-of-referral via QR check-in + tools. Free flywheel is built + one pilot partner (Royal 35); paid tier rolls out as we sign restaurants."

### TIER 1 (non-partner) RESERVATION — honest hand-off (DECISION)
- KEEP the existing reservation modal/flow exactly as-is (party size, time, Reserve Now). Do NOT remove or redesign it — it's a big part of the site and works.
- ONLY change what happens AFTER clicking Reserve Now for a non-partner restaurant: show an honest message — "This restaurant isn't a Let's Get Lunch partner yet, so call them directly or walk in to book" — with tap-to-call phone + website link.
- Rationale: never imply we booked a table we didn't. A confirmation/QR for a restaurant not on our system would burn diners the first time the restaurant has no idea what the code is.
- Partner restaurants (Royal 35) keep the QR confirmation flow.

### DEMAND-LOGGING IDEA (high value — powers partner sales)
- When a diner tries to reserve a non-partner restaurant, log the intent (restaurant id + timestamp). This becomes demand signal per restaurant.
- Sales pitch later: "23 diners tried to book you through us last month — want to actually capture them?" Killer Tier-2/partner conversion tool and great deck data.
- Not built yet. Needs a small table. Consider for next build once the honest hand-off is shipped.

### INSIDERS / REVIEWER PROGRAM (content + growth engine) — phased
- Concept: power diners leave real reviews + photos of the actual lunches. Authentic UGC = cheapest, most credible marketing for a local directory. Repost across social. Makes diners feel ownership.
- COLD-START WARNING: review systems are a trap early — empty reviews look worse than none. Don't ship public reviews until there's diner volume to fill them.
- PHASING:
  - Phase 1 (NOW, no code): start Let's Get Lunch Instagram/TikTok. Brian + a few early Insiders eat lunches, photograph, post. Promotion engine starts now, tests the content idea, builds audience.
  - Phase 2 (soon, light code): invited Insiders submit review + photo into an ADMIN QUEUE Brian approves (curated, not auto-live). Keeps quality high, avoids ghost town, Brian controls what becomes marketing content.
  - Phase 3 (later, real feature): public reviews on listing pages, diner profiles, "Insider" badge — once volume makes it look alive.
- Deck slide: "Growth & content: an Insiders program turns engaged diners into reviewers, generating authentic photo content we repurpose across social — community-driven marketing at near-zero cost."

### FOR THE MARKETING CHAT (hand-off summary)
- Start social accounts now (IG/TikTok), food-photo led.
- Insiders program is the content flywheel — recruit a handful of early power diners.
- Brand voice already established in header: "NYC's best lunch deals, at the table." (Bebas Neue, blue accent on "Lunch" and "at the table.")
- Site is live at letsgetlunch.nyc, ~269 listings, mobile-first.

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

## ✅ Recently Fixed (May 22, 2026)
- **Dark-mode white-on-white form bug** — Mac/Chrome users in dark mode saw white text on white background on signup/login forms. Root cause: default Next.js dark-mode block in globals.css flipped --foreground-rgb to white; inputs had no explicit color so they inherited it. Fix: removed the dark-mode block from globals.css + added text-gray-900 bg-white to signup/login inputClass. (commit 8def045)
- **Duplicate-restaurant root cause fixed** — approveVendor had no guard; double/triple-clicking Approve inserted 2-3 restaurant rows. Added a pre-insert check: queries for existing active restaurant with same name+address (case-insensitive), skips insert + alerts if found. (commit e50aca9). NO MORE NEW DUPES.

## 🐛 OPEN — Clean up 9 existing duplicate rows (Supabase, when ready)
Root cause now fixed (commit e50aca9), but pre-existing dupes remain in DB. Brian prefers code over Supabase, so this is deferred until he has energy for SQL.

TRUE dupes to delete (5 rows — VERIFY 0 reservations first):
- 69c66e11-7bc9-4e95-84d1-1fe855f9cbce (Sarabeth's CPS dupe 2)
- fe336910-897e-4c99-9e18-7e215b830c4c (Sarabeth's CPS dupe 3)
- a127766d-acdd-4c5b-bbd1-7446ab6d0f27 (Felice on Hudson, newer)
- 9e9421e6-faa4-41b8-b842-e7637f67bc9c (Fushimi, newer)
- 505bfded-5fb8-48b2-8c6d-d7ee041c4aba (Hawksmoor NYC, is_active=false)

NOT dupes (real 2nd locations — KEEP BOTH): Arte Cafe (Chelsea 191 7th Ave + UWS 106 W 73rd) — consider renaming to disambiguate.
AMBIGUOUS (Brian's call): Piccola Cucina Enoteca (same address 196 Spring St but websites differ SoHo vs uptown), Tacombi Financial District (not yet inspected).

CLEANUP SEQUENCE (next Supabase session):
1. Run reservations+deals count on the 5 IDs above — confirm reservations=0 for each
2. Screenshot rows as reversibility snapshot
3. DELETE FROM deals WHERE restaurant_id IN (5 ids)
4. DELETE FROM restaurants WHERE id IN (5 ids)
5. Verify: SELECT name, COUNT(*) FROM restaurants GROUP BY name HAVING COUNT(*)>1

## ✅ Shipped (May 23, 2026) — Bug F + Bug E: single-source cuisines
- Created lib/cuisines.ts as the single source of truth for cuisines (mirrors lib/neighborhoods.ts pattern). Alphabetical, "Other" pinned last.
- Wired BOTH app/admin/page.tsx and app/list-your-restaurant/page.tsx (Olga's upload form) to import { CUISINES } from '../../lib/cuisines' — removed the two drifted local CUISINES consts. All dropdowns (vendor form, admin Add Listing, admin Pending Review&Edit, admin Active Listings edit) now read from one list.
- Added 4 cuisines: Spanish (covers 6 existing Spanish restaurants that had no matching option), Turkish (matches existing Turka Restaurant), Asian Fusion, Brazilian.
- Killed Bug E: admin had a DUPLICATE CUISINES.map() (old line 1181, the one missing value={c}) rendering the list twice in the Active Listings edit dropdown. Removed it.
- No renames, no merges, zero data migration. Verified live across all 5 dropdowns via screenshots.
- TODO (separate, deferred): homepage search pills (app/page.tsx ~line 75 `filters`) still use the OLD different vocabulary ('Asian','Latin/Mexican','Vegan-Friendly') and substring-match filter logic — NOT yet unified with lib/cuisines.ts. Decide later whether to expand homepage pills to match (careful change: homepage filter logic has special-case substring matching).

## ✅ RESOLVED (May 24, 2026) — Duplicate listings cleaned up
Root cause was already fixed (approveVendor guard, commit e50aca9). Brian then cleaned the pre-existing dupes manually in the admin/Supabase. Verified via script (dupcheck2) + screenshots:
- True system dupes deleted, oldest kept: Sarabeth's Central Park South (355ea3a9 kept), Felice on Hudson (dcb07076 kept), Fushimi (18b37fad kept).
- Mislabeled dupe removed: Tacombi - Financial District now only the real FiDi row (74 Broad St, 5693015a); the mislabeled 377 Amsterdam Ave row is gone.
- Distinct-location name collision relabeled (NOT deleted): "Arte Cafe" = 191 7th Ave/Chelsea; "Arte Cafe UWS" = 106 W 73rd St/Upper West Side. Both kept, renamed to distinguish.
- Mission Ceviche: one clean row per real location — "Mission Ceviche Union Square" (7 E 17th St) + "Mission Ceviche Upper East Side" (1400 2nd Ave).
- Integrity check: 0 orphaned deals (of 333), 0 orphaned reservations (of 30) — no lead data lost. FK cascade appears to work.
- Total listings: 334.
- MINOR open: confirm Mission Ceviche bios read as Peruvian/ceviche (earlier had a wrong "Rustic Italian" bio from the duplication side effect) — quick admin glance, 30-sec edit each if still wrong.

## ✅ Shipped (May 24, 2026) — Homepage cuisine pills reworked
- Removed the "All" pill. Pills now toggle on/off (multi-select, OR logic). Nothing selected = show everything (replaces "All").
- Replaced the fragile substring-matching filter logic (old lines 102-107: special cases for Asian/Vegan-Friendly/Seafood/Japanese/Latin + a split('/')[0] catch-all) with clean exact match: `selected.length > 0 && !selected.includes(r.cuisine)`.
- State changed from `filter: string` ('All' default) to `selected: string[]` ([] default). Added togglePill helper.
- 14 pills (the cuisines with real inventory + Vegan), each a {label,value} pair so "Vegan" displays but matches DB value "Vegan/Plant-Based": Italian, American, Japanese/Sushi, French, Mediterranean, Mexican/Latin, Steakhouse, Thai, Indian, Greek, Seafood, Korean, Spanish, Vegan.
- Map + listings both read from the same `filtered` array, so they update automatically with pill selection. Tested live, working.
- NOTE: pills are a hardcoded list in app/page.tsx (NOT pulled from lib/cuisines.ts) — intentional, since pills are a curated subset (14 of 23) for visual clarity, not the full taxonomy. If you add a high-volume cuisine later, add a pill here manually.
- DEFERRED (phase 2 idea): make pills location-aware — show only cuisines available in the current map view (dynamic facets). Feasible but bigger (ties pills to map bounds, recalcs on pan/zoom). Build on top of this working version later if desired. Lower priority — users mostly zoom to their area to see what's available.

## ✅ Shipped (May 25, 2026) — Sign in with Google (OAuth)
- "Continue with Google" one-click signup/login, button at TOP of form on both /signup and /login (both tabs) for conversion.
- Google Cloud OAuth client created (project "My First Project"); consent screen Testing/unverified (no logo, to skip verification); Authorized domain letsgetlunch.nyc; redirect URI = Supabase callback. Google provider enabled in Supabase w/ Client ID+Secret. Confirm-email OFF = instant signup.
- Code: handleGoogle() -> supabase.auth.signInWithOAuth({provider:'google', redirectTo: origin+'/auth/callback'}). New app/auth/callback/page.tsx waits for session, creates profiles row on first login (name from Google user_metadata, email, neighborhood null), redirects home.
- VERIFIED live on iPhone: signup, signout, signin all work; round trip confirmed; profiles row check = exactly 1 row, name "Brian Keith-Photography", neighborhood null (no dupes across multiple cycles).
- KNOWN/DEFERRED: (1) Google consent screen shows raw supabase.co URL not "Let's Get Lunch" — cosmetic, needs Google verification (logo+privacy policy+domain verify) later. (2) Google users get neighborhood=null, no prompt yet. (3) Apple sign-in deferred ($99/yr Apple Developer fee; revisit with native app). (4) FEATURE IDEA: live weekday-midday geolocation ("where they lunch Tue/Wed/Thu ~11:55am") — high-value signal, separate build.

## ✅ Shipped (May 26, 2026) — Google OAuth branding verified + legal pages
- PROBLEM: Google consent screen showed raw "iqurlwenkozmxoyymnkg.supabase.co" instead of brand name — test user said it "looked sketchy," hurting signups.
- FIX: Created Privacy Policy (app/privacy/page.tsx → /privacy) and Terms of Service (app/terms/page.tsx → /terms), styled to match site, honest boilerplate (NOT lawyer-reviewed — flagged in-file; review before scaling/payments). Added Privacy + Terms links to homepage footer.
- Google Cloud Auth Platform: verified domain ownership (letsgetlunch.nyc via GoDaddy DNS TXT — DO NOT REMOVE that record or verification is lost), uploaded logo (LGL_LOGO.jpg, circular blue mark), fixed app name capitalization to "Let's Get Lunch", added privacy/terms URLs. App moved to Production.
- KEY FINDING: full Google verification review NOT required because app uses only basic email+profile scopes (no sensitive/restricted scopes). Branding verified automatically + now shown to users. Consent screen now branded "Let's Get Lunch" w/ logo.
- OAuth user cap: 100 users while basic-scope (not a near-term constraint).

## ✅ Shipped (May 29, 2026) — Vercel Web Analytics enabled (page views only)
- WHY: profiles table only sees signed-up users; needed to track anonymous traffic too.
- WHAT: Vercel Web Analytics on Hobby tier (50k events/mo, 30 day history, FREE). Installed @vercel/analytics, added <Analytics /> to app/layout.tsx after {children}. Enabled in Vercel dashboard.
- GIVES: page views, unique visitors, top pages, referrers, country/device breakdown. Data appears ~10 min after visits in Vercel dashboard > Analytics tab.
- DOES NOT include: custom events (Reserve tapped, signup completed, etc) — that's Pro tier ($20/mo). Deferred.
- KNOWN GOTCHAS: ad/tracker blockers in Safari/iOS may block the script for some visitors; data will undercount slightly. Vercel batches data 5-10 min so it's not real-time.
- TODO when ready: custom events (requires Pro tier) + Privacy Policy update to disclose analytics (currently the policy doesn't mention it - mild disclosure gap, not urgent at current scale).
- KNOWN OPEN (logged, NOT addressed): npm install showed 9 vulnerabilities (2 mod / 6 high / 1 crit) in existing deps. DO NOT run npm audit fix --force - can break working build. Address in a dedicated session, individually.

## ✅ Shipped (May 31, 2026) — Privacy Policy: Vercel Analytics disclosure
- Closed the disclosure gap from May 29 (analytics added without policy mention).
- Added "Analytics" section between "Service providers" and "Your choices" disclosing Vercel Web Analytics: cookieless, no individual tracking, aggregated data only (page views, referrers, country, device).
- Updated "Last updated" date to May 31, 2026.
- Still NOT lawyer-reviewed — boilerplate caveat in-file remains. Get counsel review before scaling/payments.


## ✅ Shipped (Jun 2-3, 2026) — Duplicate root cause ACTUALLY fixed (DB constraint)
- CONTEXT: May notes claimed dupes were fixed by the approveVendor JS guard (commit e50aca9). That guard is INSUFFICIENT — it does check-then-insert, which loses a race when Approve fires twice ~0.1s apart (both SELECT find nothing, both INSERT). Confirmed via timestamps: Sophistian Pizzeria had twin rows 0.1s apart on Jun 1.
- RULED OUT editing as a cause: saveEdit (app/admin/page.tsx ~445-528) is pure .update().eq('id'), no restaurant insert. Confirmed NO trigger on restaurants table (pg_trigger query returned nothing). Editing a listing CANNOT create a dupe — it only surfaces pre-existing ones when you search the name after fetchRestaurants() re-renders.
- REAL FIX: added DB-level unique index:
  create unique index uniq_restaurant_name_address on restaurants (lower(trim(name)), lower(trim(address)));
  Postgres now refuses same-name+same-address inserts regardless of app code / race / double-click.
- CLEANED 4 dupe groups first (all resv-checked, no lead data lost): Sophistian Pizzeria (kept Italian/active), Hawksmoor NYC (kept American/active w/ 1 resv), Le Crocodile (kept May-2 "80 Wythe Ave" correct pin, deleted May-25 "80 Ave Wythe Hotel" wrong-geocode row), Piccola already clean.
- LIMITATION: constraint only catches EXACT name+address matches. Does NOT catch spelling variants ("80 Wythe Ave" vs "80 Ave Wythe Hotel", "John's" vs "Johns"). Fuzzy matching deferred.
- KNOWN UX GAP: approveVendor doesn't yet catch the Postgres unique-violation error gracefully — a true-dup approve will now throw an ugly error instead of the friendly "already exists" alert. It will NOT create a dupe (that's the point), but the approve flow should be wrapped to catch error code 23505 in a follow-up. Editing listings (deals, is_partner, etc) is unaffected and safe.


## Shipped (Jun 11, 2026) -- /lookup VA URL lookup page + admin live-URL link
- Admin Active Listings cards now show clickable live URL (letsgetlunch.nyc/restaurants/{id}) in the card header, opens in new tab. (saveEdit/delete untouched.)
- NEW PAGE /lookup (app/lookup/page.tsx): password-gated, READ-ONLY. For VA Olga to find a restaurant and copy its live page URL for outreach emails. Search by name/address + neighborhood + cuisine dropdowns (same filters as admin). Active listings only. Copy button puts full https://www.letsgetlunch.nyc/restaurants/{id} on clipboard. NO edit/insert/delete code exists on the page -- safe by omission.
- Password: olga2026 (separate from admin lunch2026). Hand-off to Olga: URL letsgetlunch.nyc/lookup + password olga2026.
- SECURITY TODO (weekend pass): /lookup AND /admin are both protected only by a CLIENT-SIDE hardcoded password -- not real auth. Anyone reading page source can find the password, and the hardcoded Supabase publishable key allows direct DB access regardless of page. Weekend hardening must cover: (1) RLS audit + lock down table write policies, (2) replace weak hardcoded admin password, (3) fold /lookup into whatever auth model replaces it, (4) the 9 deferred npm vulns. Listings are already publicly readable via the live map, so /lookup adds no NEW scrape exposure -- but the password is not a real barrier.


## SECURITY HARDENING PLAN (started Jun 14, 2026 Sun eve) -- CRITICAL
### THE HOLE (confirmed via pg_policies audit):
- All write policies are {public} with qual/with_check = true = ANYONE with the publishable key (visible in page source) can INSERT/UPDATE/DELETE restaurants, deals, profiles, vendors and READ all reservations (customer names/emails/phones).
- restaurants table: rowsecurity = FALSE (RLS off entirely).
- Root cause: app writes everything with the anon/publishable key (admin, vendor form, reserve flow all use it). Can't just deny public writes or app breaks.

### FIX ORDER (each step tested live before next; never rush a policy change):
1. [FOUNDATION] Add service_role key to .env.local ONLY (gitignored, never client code). Create lib/supabaseAdmin.ts that uses it -- server-side only.
2. Move admin writes (saveEdit, approveVendor, addListing, delete, toggleActive) into server-side API routes (app/api/admin/*) that use the service_role client AND check a server-side secret/password. Client calls these routes instead of writing directly.
3. Keep reserve flow: move its insert to already-server-side route.ts using service_role (route.ts already exists, just swap key source).
4. ONLY AFTER 1-3 work: tighten RLS policies -- public gets SELECT on restaurants/deals (is_active=true) only; revoke public INSERT/UPDATE/DELETE on restaurants/deals/profiles; revoke public SELECT on reservations (admin reads via service_role now); keep public INSERT on vendors (vendor form) + reservations.
5. Enable RLS on restaurants table (currently off).
6. Replace weak admin password lunch2026 + lookup olga2026 with env-based secrets.
7. npm audit -- 9 vulns, individually, not --force.
8. Remove backups/ from git (add to .gitignore) -- contains old keys (publishable, safe, but hygiene).

### RULES: one change at a time. npm run build + test live site after each. Rollback = git revert. Do NOT change RLS before server-side writes exist or the app breaks.


## Security hardening -- FOUNDATION DONE (Jun 14, 2026 Sun eve) [steps 1-3 of plan]
- service_role (sb_secret_) key: stored in server .env.local AND Vercel env (SUPABASE_SERVICE_ROLE_KEY, Sensitive, Prod+Preview). NEVER in code. Old keys exposed during setup were ROLLED -- only the final rolled key is live.
- Created lib/supabaseAdmin.ts: server-side-only client, LAZY init via Proxy (does NOT throw at module load / build time -- only checks key on first .from() call). Build was failing with eager top-level throw; lazy pattern fixed it. Do not revert to eager check or build breaks.
- app/api/reserve/route.ts: swapped from inline publishable-key client to `import { supabaseAdmin as supabase }`. The `as supabase` alias keeps all existing supabase.from() calls unchanged.
- VERIFIED LIVE: real reservation on letsgetlunch.nyc saved + confirmation email received. Full chain works: Vercel env -> route -> service_role -> DB insert -> Resend. (commit 0c2fed0)
- NOTE: RESEND_API_KEY in Vercel shows "Needs Attention" (wants re-save as Sensitive) -- harmless, 1-min fix later.

### STILL TODO (next session -- the RISKY part, needs a fresh head):
- Step 2: move ADMIN writes (saveEdit, approveVendor, addListing, deleteRestaurant, toggleActive) into server-side API routes (app/api/admin/*) using supabaseAdmin + a server-side secret check. Admin page currently still writes directly with the PUBLISHABLE key.
- Step 4-5: ONLY after admin writes are server-side -> tighten RLS (revoke public INSERT/UPDATE/DELETE on restaurants/deals/profiles; revoke public SELECT on reservations; enable RLS on restaurants table which is currently OFF). Test live site after EACH policy change.
- Step 6-8: replace weak passwords (lunch2026/olga2026) w/ env secrets; npm audit (9 vulns, individually); remove backups/ from git.
- CURRENT STATE: the DB is still wide open (public can write/delete) until step 2+4 are done. Foundation just makes that fix POSSIBLE without breaking the app.


## Shipped (Jun 15, 2026) -- Staten Island neighborhoods added to dropdown
- lib/neighborhoods.ts Staten Island group had only 2 entries (St. George, Stapleton). Olga blocked sourcing SI.
- Added 16 from Olga's sheet column F: Annadale, Arrochar, Bulls Head, Charleston, Dongan Hills, Eltingville, Great Kills, Heartland Village, New Dorp, Port Richmond, Rosebank, Rossville, Tottenville, West Brighton, Westerleigh, Woodrow. Total SI now 18, alphabetized.
- Deliberately did NOT add the full ~62 SI neighborhoods -- dropdown should match real sourcing, not aspirational coverage. Add more as Olga needs them.
- Verified live (Bulls Head visible in dropdown). Standalone commit, separate from in-progress security work.
- Also committed the .gitignore backups/ entry that was pending.


## QUEUED PROJECT A -- Email unsubscribe / opt-out (Resend) [NOT STARTED]
TRIGGER: a real user replied "STOP" to a booking-confirmation email (treated it like SMS opt-out) -- email had no context/opt-out. UX problem + deliverability risk (spam marks undo the SPF/DKIM/DMARC work).
BUILD:
1. Add List-Unsubscribe + List-Unsubscribe-Post headers to every Resend send -> Gmail/Apple native Unsubscribe.
2. Email footer: context line ("You're receiving this because you requested a lunch reservation at [Restaurant] through Let's Get Lunch") + plain-language opt-out + working unsubscribe link.
3. Unsubscribe endpoint + suppression list (new table or flag); check it before EVERY send.
4. Sane from/reply-to; never re-send to a suppressed address.
DB IMPACT (to confirm when building): likely a new `suppressions` table (email, created_at, reason) OR a suppressed flag on profiles -- but reservers often aren't signed up, so a standalone email-keyed suppressions table is the right call. Suppression check lives in app/api/reserve/route.ts (and any future send path) BEFORE the Resend fetch -- skip send if email is suppressed. Note: route.ts now uses supabaseAdmin (service_role) so it can read/write the suppression table server-side regardless of RLS.

## QUEUED PROJECT B -- SEO for restaurant listing pages [NOT STARTED]
INSIGHT FROM REAL DATA: organic Google traffic is finding specific restaurants (Sushi Yasuda, COQODAQ, ilili NoMad, Wolfgang's), landing on /restaurants/[id], and booking -- all LUNCH slots (12:00/12:30/3:00pm). Listing pages ARE working as SEO landing pages for "[restaurant] + lunch" intent. Lean in. (Users transact without signing up.)
BUILD:
1. Per-page <title> + meta description targeting "[Restaurant] lunch / prix-fixe lunch / lunch reservation". Add schema.org Restaurant + Menu/OfferCatalog structured data for rich results.
2. CRITICAL PREREQ: /restaurants/[id] is currently `f (Dynamic)` server-rendered-on-demand with CLIENT-SIDE data fetch -> Google may see empty shells. Must make pages render restaurant content server-side (Next 14 generateMetadata + server component data fetch, or generateStaticParams for SSG) so they're fully crawlable. This is the biggest lever and the most involved change.
3. sitemap.xml listing all 463 listing pages; submit to Google Search Console (GSC not yet set up -- do that FIRST to see current index state).
4. Consider slug URLs (/restaurants/sushi-yasuda-nomad) vs raw UUID -- better SEO/CTR. Advise migration cost; keep UUID redirects so old links/QR don't break.
5. Make lunch value-prop + booking CTA more prominent (search visitors arrive ready to book).
6. Analytics: which pages pull search traffic + which convert. (Vercel Web Analytics is page-views only; custom events = Pro tier $20/mo, deferred. GSC covers search side free.)
START BY AUDITING: current titles/meta, sitemap presence, SSR-vs-client-render on /restaurants/[id] -- establish the gap before building.
REALITY CHECK (already discussed): ranking for a restaurant's BARE name is hard (competes w/ their own site, Google panel, Yelp/Resy). Realistic wedge = "[restaurant] lunch special / prix-fixe lunch / lunch [neighborhood]" long-tail where we have unique content (the lunch deal).


## QUEUED PROJECT A -- Email unsubscribe / opt-out (Resend) [NOT STARTED]
TRIGGER: a real user replied "STOP" to a booking-confirmation email (treated it like SMS opt-out) -- email had no context/opt-out. UX problem + deliverability risk (spam marks undo the SPF/DKIM/DMARC work).
BUILD:
1. Add List-Unsubscribe + List-Unsubscribe-Post headers to every Resend send -> Gmail/Apple native Unsubscribe.
2. Email footer: context line ("You're receiving this because you requested a lunch reservation at [Restaurant] through Let's Get Lunch") + plain-language opt-out + working unsubscribe link.
3. Unsubscribe endpoint + suppression list (new table or flag); check it before EVERY send.
4. Sane from/reply-to; never re-send to a suppressed address.
DB IMPACT (to confirm when building): likely a new `suppressions` table (email, created_at, reason) OR a suppressed flag on profiles -- but reservers often aren't signed up, so a standalone email-keyed suppressions table is the right call. Suppression check lives in app/api/reserve/route.ts (and any future send path) BEFORE the Resend fetch -- skip send if email is suppressed. Note: route.ts now uses supabaseAdmin (service_role) so it can read/write the suppression table server-side regardless of RLS.

## QUEUED PROJECT B -- SEO for restaurant listing pages [NOT STARTED]
INSIGHT FROM REAL DATA: organic Google traffic is finding specific restaurants (Sushi Yasuda, COQODAQ, ilili NoMad, Wolfgang's), landing on /restaurants/[id], and booking -- all LUNCH slots (12:00/12:30/3:00pm). Listing pages ARE working as SEO landing pages for "[restaurant] + lunch" intent. Lean in. (Users transact without signing up.)
BUILD:
1. Per-page <title> + meta description targeting "[Restaurant] lunch / prix-fixe lunch / lunch reservation". Add schema.org Restaurant + Menu/OfferCatalog structured data for rich results.
2. CRITICAL PREREQ: /restaurants/[id] is currently `f (Dynamic)` server-rendered-on-demand with CLIENT-SIDE data fetch -> Google may see empty shells. Must make pages render restaurant content server-side (Next 14 generateMetadata + server component data fetch, or generateStaticParams for SSG) so they're fully crawlable. This is the biggest lever and the most involved change.
3. sitemap.xml listing all 463 listing pages; submit to Google Search Console (GSC not yet set up -- do that FIRST to see current index state).
4. Consider slug URLs (/restaurants/sushi-yasuda-nomad) vs raw UUID -- better SEO/CTR. Advise migration cost; keep UUID redirects so old links/QR don't break.
5. Make lunch value-prop + booking CTA more prominent (search visitors arrive ready to book).
6. Analytics: which pages pull search traffic + which convert. (Vercel Web Analytics is page-views only; custom events = Pro tier $20/mo, deferred. GSC covers search side free.)
START BY AUDITING: current titles/meta, sitemap presence, SSR-vs-client-render on /restaurants/[id] -- establish the gap before building.
REALITY CHECK (already discussed): ranking for a restaurant's BARE name is hard (competes w/ their own site, Google panel, Yelp/Resy). Realistic wedge = "[restaurant] lunch special / prix-fixe lunch / lunch [neighborhood]" long-tail where we have unique content (the lunch deal).
