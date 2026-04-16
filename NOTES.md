# Let's Get Lunch — Project Notes
**IMPORTANT FOR CLAUDE: Do NOT re-engineer, rewrite, or restructure anything already built. Read this file fully before touching any code. Ask to see existing files before editing them.**

## Live URLs
- Site: https://www.letsgetlunch.nyc
- Repo: https://github.com/ph1models-gif/lets-get-lunch
- Server: root@openclaw2-1.tail2e11b9.ts.net
- Project path: /home/ocuser/.openclaw/workspace/lets-get-lunch
- Admin: https://www.letsgetlunch.nyc/admin (password: lunch2026)

## How we work
- SSH into server, edit files, then: git add -A && git commit -m "message" && git push origin main
- Vercel auto-deploys on every push to main
- Never paste Vercel build logs into the terminal
- Always cat the existing file before editing it
- Use python3 patches for surgical edits

## Tech Stack
- Next.js 14.2.3, TypeScript, Tailwind CSS
- Supabase (PostgreSQL + Storage + Auth) — email confirmation OFF
- Vercel (hosting, auto-deploy on push to main)
- Resend — verified domain hello@letsgetlunch.nyc — RESEND_API_KEY in Vercel env
- Google Maps API key: AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0

## Supabase Config
- Project URL: https://iqurlwenkozmxoyymnkg.supabase.co
- Publishable key: sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4

## Database Schema
- restaurants: id, name, neighborhood, address, cuisine, emoji, bio, work_friendly, walk_in, wifi, seats, hours, is_active, photo_url, photo_urls, lat, lng
- deals: id, restaurant_id, special, price, courses, is_active
- vendors: id, restaurant_name, contact_name, email, phone, address, neighborhood, cuisine, seats, hours, special, price, work_friendly, wifi, bio, message, status, photo_url, photo_urls, created_at
- profiles: id (→ auth.users), name, phone, neighborhood, dietary_prefs, created_at
- reservations: id, restaurant_id, user_id, name, contact, party_size, preferred_time, note, confirmation_code (NOT NULL), code, status, created_at

## Key Features DONE
- Homepage: map with price pins, neighborhood search, cuisine filters, laptop filter, price slider, specials left urgency badge, real photos or emoji fallback
- Detail page: hero photo + hover thumbnail gallery, deal card, address + Google Maps link, Reserve button
- Auth-aware navbar on homepage AND detail page: "Hi, [FirstName]" + Sign out when logged in, "Sign in" button when not
- Login page: defaults to Sign In tab, has Create Account tab with split First/Last name fields, confirm password, strong password validation (8 chars, uppercase, number, symbol)
- Strong password validation in BOTH login page and reservation modal
- Reservation modal (Option B — inline auth, 4 states): book → password → signin → success
  - If signed in: only shows party size + time
  - If not signed in: shows first name, last name, email fields then password step
  - Success screen: LGL-XXXX code
- Admin dashboard: 3 tabs — Pending submissions, Active listings, Reservations
  - Reservations tab: Today/All time toggle, summary stats, repeat booker 🔁 badges
  - Neighborhoods, hours, cuisines all synced between vendor form and admin edit form
- Resend email: sends from hello@letsgetlunch.nyc (domain verified)
- Vendor signup form: full neighborhoods list, cuisine dropdown, hours dropdown, photo upload

## CURRENT BUG — MUST FIX FIRST
**First-time users (not signed in) clicking Reserve Now are NOT getting the password step.**
- The modal shows the book step (party size + time for signed-in users, name/email/party/time for new users)
- Clicking Reserve Now should check if signed in:
  - If YES → submit reservation directly
  - If NO → advance to 'password' step to create account
- The `handleReserve` function is the issue — it's not correctly detecting signed-out state
- `userName` state is set on page load if signed in, empty string if not
- The button is at line ~405 calling `handleReserve`
- The password step UI exists and works — it's just never being shown
- Tried: try/catch on getUser(), checking userName state — both failed
- Key file: app/restaurants/[id]/page.tsx

## Secondary Issues To Fix After Above
1. Duplicate password check in handleCreateAndReserve (lines 125-130)
2. Duplicate `contact` field in submitReservation JSON body
3. After new user signs up via modal, navbar still shows "Sign in" instead of "Hi, [name]"
4. QR code missing from confirmation email (need to add api.qrserver.com img tag)
5. Success screen should show "Check your email" message for first-time users

## Password Requirements (enforced in validatePassword function)
- Min 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 symbol

## Neighborhoods (54 total — must match across all files)
See app/components/NeighborhoodSearch.tsx for canonical list

## Known Issues
- 8 original seeded restaurants have no photo_url — emoji fallback shows
- QR code on confirmation screen in modal may need verification
