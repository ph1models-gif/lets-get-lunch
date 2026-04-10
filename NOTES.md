# Let's Get Lunch — Project Notes
Paste this file at the start of any new Claude chat to restore context instantly.
**IMPORTANT FOR CLAUDE: Do NOT re-engineer, rewrite, or restructure anything already built. Read this file fully before touching any code. Ask to see existing files before editing them.**

## Live URLs
- Site: https://lets-get-lunch-seven.vercel.app
- Repo: https://github.com/ph1models-gif/lets-get-lunch
- Server: root@openclaw2-1.tail2e11b9.ts.net
- Project path: /home/ocuser/.openclaw/workspace/lets-get-lunch
- Admin: https://lets-get-lunch-seven.vercel.app/admin (password: lunch2026)

## How we work
- SSH into server, edit files, then: git add -A && git commit -m "message" && git push origin main
- Vercel auto-deploys on every push to main
- Never paste Vercel build logs into the terminal
- Always cat the existing file before editing it

## Tech Stack
- Next.js 14.2.3, TypeScript, Tailwind CSS
- Google Maps API (key hardcoded in MapInner.tsx — move to env var later)
- Supabase (PostgreSQL + Storage)
- Vercel (hosting)

## Supabase
- Project URL: https://iqurlwenkozmxoyymnkg.supabase.co
- Publishable key: sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4
- Client file: lib/supabase.ts
- Tables: restaurants, deals, vendors

## Database schema (DO NOT ALTER without being asked)

### restaurants
- id (uuid)
- name (text)
- neighborhood (text)
- address (text)
- cuisine (text)
- emoji (text)
- work_friendly (bool)
- walk_in (bool)
- wifi (bool)
- rating (float)
- seats (int)
- hours (text)
- is_active (bool)
- photo_url (text)        — main hero image URL
- photo_urls (text[])     — up to 3 additional image URLs
- lat, lng (float)        — for map pins (must be set manually in Supabase)

### deals
- id (uuid)
- restaurant_id (uuid, FK)
- special (text)
- price (float)
- courses (int)

### vendors
- id (uuid)
- restaurant_name, contact_name, email, phone, address (text)
- neighborhood, cuisine, seats, hours, special, price (text)
- work_friendly, wifi (text — "yes"/"no")
- message (text)
- status (text — "pending"/"approved"/"rejected")
- photo_url (text)        — main hero image URL
- photo_urls (text[])     — up to 3 additional image URLs
- created_at (timestamp)

## Supabase Storage
- Bucket: restaurant-photos (PUBLIC bucket)
- Policies: public SELECT + public INSERT (already set, do not recreate)
- photo_url = single main image stored as text URL
- photo_urls = array of up to 3 additional images stored as text[]

## Supabase RLS policies (already in place — do not recreate)
- restaurants: public select (is_active=true), public insert
- deals: public select (is_active=true), public insert
- vendors: public select, public insert, public update

## File structure
app/
  page.tsx                          — Homepage (pulls from Supabase)
  restaurants/[id]/page.tsx         — Detail page (pulls from Supabase)
  list-your-restaurant/page.tsx     — Vendor signup form
  admin/page.tsx                    — Admin dashboard (password protected)
  components/
    Map.tsx                         — Map wrapper
    MapInner.tsx                    — Google Maps + Supabase pins
    NeighborhoodSearch.tsx          — Neighborhood autocomplete
lib/
  supabase.ts                       — Supabase client

## What the admin page does (DO NOT REWRITE)
- Password protected (password: lunch2026)
- Loads all vendors from Supabase ordered by created_at desc
- Shows pending submissions with full detail + photo strip (main + extras)
- Approve button: inserts into restaurants table (with photo_url + photo_urls), inserts into deals table, sets vendor status to approved
- Reject button: sets vendor status to rejected
- Shows approved vendors list with thumbnail

## What the vendor form does (DO NOT REWRITE)
- Saves to vendors table with status: pending
- Uploads main photo to Supabase Storage → saves URL to photo_url
- Uploads up to 3 extra photos to Supabase Storage → saves URLs to photo_urls
- Has dropdowns for neighborhood, cuisine, hours

## What is DONE
- [x] Build passing clean
- [x] Google Maps with restaurant pins from Supabase
- [x] Neighborhood search (1 letter, pans map)
- [x] User location blue dot
- [x] Pin popups with deal details
- [x] Clicking map pin opens restaurant detail page
- [x] Only one popup open at a time
- [x] Restaurant cards link to detail pages
- [x] Restaurant detail page /restaurants/[id]
- [x] Supabase backend — real data, not hardcoded
- [x] 8 restaurants + deals seeded in database
- [x] Vendor signup form saves to Supabase vendors table
- [x] Vendor form has dropdown menus for neighborhood, cuisine, hours
- [x] Admin page at /admin (password: lunch2026)
- [x] Admin can approve/reject vendor submissions
- [x] Approving a vendor adds them to restaurants + deals tables instantly
- [x] RLS policies allow public read/insert/update on all tables
- [x] Supabase Storage bucket: restaurant-photos (public, 2 policies)
- [x] Vendor form photo upload — 1 main photo + up to 3 additional
- [x] Photos upload to Supabase Storage on form submit
- [x] photo_url and photo_urls columns on vendors + restaurants tables
- [x] Admin page shows photo strip on each pending vendor card
- [x] Approving a vendor copies photo_url + photo_urls to restaurants table

## What is NOT done yet (work on these next, in order)
1. [ ] Show real food photos on homepage restaurant cards (use photo_url from restaurants table)
2. [ ] Show real food photos + gallery on restaurant detail page (use photo_url + photo_urls)
3. [ ] Move Google Maps API key to env var
4. [ ] Reserve a table button (currently does nothing)
5. [ ] Resend email confirmation on vendor signup
6. [ ] Add lat/lng geocoding when admin approves a vendor

## Known issues
- Approved restaurants need lat/lng manually added in Supabase or they won't show on map
- Google Maps API key is hardcoded in app/components/MapInner.tsx
- Homepage cards and detail pages still show placeholder images — photo_url exists in DB but not wired to UI yet
