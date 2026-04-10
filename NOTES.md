# Let's Get Lunch — Project Notes
Paste this file at the start of any new Claude chat to restore context instantly.

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
- [x] photo_url and photo_urls columns added to vendors + restaurants tables
- [x] Admin page shows photos on each vendor submission card
- [x] Approving a vendor copies photo_url + photo_urls to restaurants table

## What is NOT done yet
1. [ ] Show real food photos on homepage restaurant cards
2. [ ] Show real food photos + gallery on restaurant detail page
3. [ ] Move Google Maps API key to env var
4. [ ] Reserve a table button (currently does nothing)
5. [ ] Resend email confirmation on vendor signup
6. [ ] Add lat/lng geocoding when admin approves a vendor

## Known issues
- Approved restaurants need lat/lng manually added in Supabase or they won't show on map
- Google Maps API key is hardcoded in app/components/MapInner.tsx
- Homepage cards and detail pages still show placeholder images — not wired to photo_url yet

## Supabase Storage
- Bucket: restaurant-photos (public)
- Policies: public SELECT + public INSERT
- photo_url = main hero image (text)
- photo_urls = array of up to 3 additional images (text[])

## Supabase RLS policies in place
- restaurants: public select (is_active=true), public insert
- deals: public select (is_active=true), public insert
- vendors: public select, public insert, public update
