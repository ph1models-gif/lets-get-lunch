# Let's Get Lunch — Project Notes
**Last updated: May 2, 2026**

## ✅ Recently Fixed (May 2, 2026)
- **Map race-condition bug fixed** — pins on homepage map now correctly match today's filtered list from initial load through every search/clear cycle. Root cause: async Google Maps load could finish AFTER React's first useEffect ran, so initMap created markers with default visibility and the visibility logic never re-ran. Fix: added activeIdsRef, applied initial visibility at marker creation time, kept existing useEffect for live updates. (app/components/MapInner.tsx)
- **NEIGHBORHOODS unified** — created lib/neighborhoods.ts as single source of truth (76 neighborhoods, NYC-wide, with NEIGHBORHOOD_GROUPS for borough-grouped dropdowns). Patched 4 files (admin, login, signup, list-your-restaurant) to import from there. Added Meatpacking District. Resolved silent drift between previously-divergent local lists.
- **Search + filter bar on Active Listings** — text search by name/address, neighborhood dropdown (auto-populated from existing listings), cuisine dropdown (canonical CUISINES list), Show hidden checkbox, Clear button, "X of Y listings shown" count
- **Restore button on rejected vendors** — Contacts tab now has ↻ Restore button on rejected rows that moves them back to Pending Submissions for re-review

## ✅ Recently Fixed (May 1, 2026)
- (Same wins logged previous day — see git history)

## ✅ Recently Fixed (Apr 30, 2026)
- Auth navbar bug (Bugs A + B) — homepage and restaurant page navbars now correctly show "Hi, [name]" when logged in, "Sign In" when not. Fix: supabase.auth.onAuthStateChange listener + conditional navbar
- Restaurant address now appears in confirmation email
- Admin photo lightbox working — left-click any photo to enlarge
- Cleaned up duplicate lightbox modal that sed -i accidentally inserted twice

## ⚠️ ACTIVE BUGS (UNRESOLVED)

### Bug C — Confirmation emails landing in spam
- Email DOES send successfully
- Lands in Gmail spam folder, not inbox
- Need to verify Resend SPF, DKIM, DMARC records on letsgetlunch.nyc DNS
- Workaround: tell users to check spam and mark "Not Spam"

### Bug D — Signup not saving email to profiles table
- Profile rows created on signup are missing email field (NULL)
- Email IS saved correctly to auth.users (login works fine)
- ~half of existing profile rows are missing emails
- LIKELY ROOT CAUSE: site has TWO signup paths — (1) quick signup inside reservation modal on restaurant page (Resy-style), (2) standalone /signup page. Built at different times. One saves email, the other doesn't. Diff the two handlers first.
- Files: app/restaurants/[id]/page.tsx (modal signup) vs app/signup/page.tsx vs app/login/page.tsx (signup tab)

### Bug E — Duplicate map() in admin edit form dropdowns
- In app/admin/page.tsx Active Listings edit form, lines ~1107-1109 and ~1115-1117
- Cuisine and Neighborhood select dropdowns each call CUISINES.map / NEIGHBORHOODS.map TWICE in a row
- Result: every option appears twice in the dropdown
- From an earlier sed that misfired
- Easy fix: delete the duplicate map line in each select

### Bug F — CUISINES list still drifted
- app/admin/page.tsx and app/page.tsx have different CUISINES lists ("Asian", "BBQ" only in homepage)
- Should be unified into lib/cuisines.ts (same pattern as lib/neighborhoods.ts)
- Lower priority than Bug E

### Bug G (NEW, May 2) — Photo preview wonky in vendor review form
- Open Pending Submission → Review & Edit → Replace main photo → no preview shown until after Approve
- Data IS saved correctly (photo appears in Active Listings post-approval)
- Bug is purely cosmetic: form keeps showing old photo while new file is staged in vendorMainFile state
- Fix needed: add vendorMainPreview / vendorExtraPreviews state, generate URL.createObjectURL(file) previews when files picked, render alongside/replacing old photos
- Pattern already exists on Active Listings edit form (editMainPreview / editExtraPreviews) — copy that approach
- Estimated 15-20 min

## 🎯 V1 PRIORITY FEATURES

### Duplicate detection for VAs (planned, ~20 min)
- Onboarding 2nd VA. Two VAs may add same restaurant accidentally.
- Real restaurants can also share names across locations (Sweetgreen, Joe's Pizza) — need to handle that
- Plan: small ⚠️ "Possible duplicate of [existing restaurant]" badge in admin Pending tab when restaurant_name matches an existing active restaurant. Doesn't block.
- Future: fuzzy address matching, or coordinate-based dedup using lat/lng (within 50m + same name = dup)
- Process: VAs need lane assignment (geographic split recommended) + shared "claimed by" tracking

### Guest invitation feature (high value — VIRAL LOOP, build after deck)
- Vision: Brian books for 2 → after booking, "Invite a guest" → enter Damon's email → Damon gets "Brian invited you to lunch at Joe's"
- Strategic value: every reservation can acquire 1-3 new users at $0 CAC. How Resy/OpenTable grew.
- Design decisions captured:
  1. Add guest AFTER booking (don't slow conversion). "Add a guest" on success screen + email
  2. Brian holds QR. Damon's email is informational
  3. Existing user → "Open in Let's Get Lunch." New user → "Sign up to claim your spot"
  4. Multi-guest support up to (party_size - 1)
- Database: add guest_emails text[] to reservations table
- Estimated 2.5-3 focused hours. BUILD AFTER DECK.

## 💭 OPEN PRODUCT QUESTIONS

### Next-day specials cutover (decided to defer)
- Idea: Sunday after some hour (5pm? 6pm?) homepage shows Monday's specials. Gives 12hr planning window.
- Risks discussed: cognitive whiplash for users on time-based switchover, 5pm cutoff is a guess without data, could cannibalize today's late bookings
- Counter-proposals if/when revisited:
  1. Show today + tomorrow side-by-side after 3pm (no hard switchover)
  2. Persistent "See tomorrow's deals →" link, all day, no automatic switching
- Most lunch specials end at 4pm anyway (kitchens flip to dinner prep), so the urgency is real. Revisit when there's user data.

### Investor dashboard (deferred — needs deck first)
- Investors looking on weekends see empty homepage. Can't see the 30-40 restaurant inventory the VA built up.
- Better than spoofing: just put Tuesday-noon screenshots in the deck.
- /metrics or /all-restaurants page is also possible (unlisted URL, share in deck appendix). Deferred until deck exists.

## 📋 V1 PENDING TODO
1. FIX Bug C — email deliverability (SPF/DKIM/DMARC in Resend dashboard)
2. FIX Bug D — signup needs to save email to profiles table
3. FIX Bug E — duplicate map() lines in admin edit form dropdowns (15 min, easy win)
4. FIX Bug F — unify CUISINES into shared lib/cuisines.ts (mirror lib/neighborhoods.ts pattern)
5. FIX Bug G — photo preview in vendor review form
6. Add duplicate-vendor detection badge in admin pending (~20 min)
7. Photos on 8 original seeded restaurants
8. QR code on success screen in modal
9. Scannable /confirm/[code] page with security token
10. Manual code lookup in admin

## 🚀 V2 ROADMAP
- Guest invitation feature (high priority post-deck)
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

## 🧠 STRATEGIC DECISIONS (locked in)

### Brunch / second daypart
- Lunch is the flagship. Brunch is the upsell. letsgetbrunch.nyc owned defensively, parked.
- Same database, same users, same admin. Brunch becomes a second deal type per restaurant later.
- Customer is the asset, not the daypart.

### Mobile app
- PWA before native App Store launch.
- Site already mobile-friendly + installable via "Add to Home Screen."
- One app, not two. Daypart-aware UI.
- Build native ONLY when there's data showing users want it.

### Investor / fundraising readiness
- USER NEEDS A DECK. Has business plan, no deck.
- Deck = 10-15 slides. Different tool than business plan. Investors expect decks.
- Free options: Pitch, Canva, Google Slides templates.
- Outline: problem, solution, market size, product (screenshots), traction, business model, team, ask.
- Use Tuesday-noon screenshots in deck (not site spoofing).
- Current traction headline: 30-40 restaurants signed up via VA outreach.

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
- For React/Map/async race conditions: don't trust useEffect alone — set initial state at the moment of object creation, then use useEffect for live updates

## Database
- restaurants: id, name, neighborhood, address, cuisine, bio, work_friendly, walk_in, wifi, seats, hours, is_active, photo_url, photo_urls, lat, lng
- deals: id, restaurant_id, special, price, courses, days (text[] DEFAULT Mon-Fri), is_active
- vendors: id, restaurant_name, contact_name, email, phone, address, neighborhood, cuisine, seats, hours, special, price, work_friendly, wifi, bio, days, message, status, photo_url, photo_urls, created_at
- profiles: id (→auth.users), name, email, phone, neighborhood, dietary_prefs, created_at
- reservations: id, restaurant_id, user_id, name, contact, party_size, preferred_time, note, confirmation_code, code, status, created_at

## Admin Dashboard — 6 Tabs
1. Pending Submissions — vendor cards, Review & Edit, Quick Approve, Reject. Photos clickable for lightbox.
2. Active Listings — edit form, Hide/Delete. Search by name/address + filter by neighborhood/cuisine + show hidden toggle.
3. Reservations — Today/All toggle, summary stats, 🔁 repeat booker badges
4. + Add Listing — direct restaurant creation
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
- Vendor signup form
- Confirmation email with QR, restaurant address, unsubscribe footer
- Custom blue dot favicon
- Hours range 10:30am–4:30pm
- Admin photo lightbox
- Admin Active Listings search + filters
- Admin Restore rejected vendors

## Password Rules
- Min 8 chars, 1 uppercase, 1 number, 1 symbol

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
