# Let's Get Lunch — Project Notes
Paste this file at the start of any new Claude chat to restore context instantly.
**IMPORTANT FOR CLAUDE: Do NOT re-engineer, rewrite, or restructure anything already built. Read this file fully before touching any code. Ask to see existing files before editing them.**

## Live URLs
- Site: https://lets-get-lunch-iota.vercel.app
- Repo: https://github.com/ph1models-gif/lets-get-lunch
- Server: root@openclaw2-1.tail2e11b9.ts.net
- Project path: /home/ocuser/.openclaw/workspace/lets-get-lunch
- Admin: https://lets-get-lunch-iota.vercel.app/admin (password: lunch2026)

## How we work
- SSH into server, edit files, then: git add -A && git commit -m "message" && git push origin main
- Vercel auto-deploys on every push to main
- Never paste Vercel build logs into the terminal
- Always cat the existing file before editing it
- Use python3 patches for surgical edits

## Tech Stack
- Next.js 14.2.3, TypeScript, Tailwind CSS
- Google Maps API key: AIzaSyA7_zRNFDRW4iNar9OJA-89Om449JheFm0 (in MapInner.tsx + layout.tsx preload)
- Supabase (PostgreSQL + Storage)
- Vercel (hosting)

## Supabase
- Project URL: https://iqurlwenkozmxoyymnkg.supabase.co
- Publishable key: sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4
- Client file: lib/supabase.ts
- Tables: restaurants, deals, vendors

## Database schema

### restaurants
- id (uuid), name (text), neighborhood (text), address (text)
- cuisine (text), emoji (text), bio (text) — one-line Google Maps style description
- work_friendly (bool), walk_in (bool), wifi (bool)
- rating (float) — NOT SHOWN (removed fake stars)
- seats (int), hours (text), is_active (bool)
- photo_url (text) — main hero image URL
- photo_urls (text[]) — up to 3 additional image URLs
- lat, lng (float) — auto-geocoded on vendor approve

### deals
- id (uuid), restaurant_id (uuid FK)
- special (text), price (float), courses (int), is_active (bool)

### vendors
- id (uuid), restaurant_name, contact_name, email, phone, address (text)
- neighborhood, cuisine, seats, hours, special, price (text)
- work_friendly, wifi (text — "yes"/"no")
- bio (text) — one-line description
- message (text), status (text — "pending"/"approved"/"rejected")
- photo_url (text), photo_urls (text[])
- created_at (timestamp)

## Supabase Storage
- Bucket: restaurant-photos (PUBLIC)
- Policies: public SELECT + INSERT + UPDATE + DELETE

## Supabase RLS policies
- restaurants: public select (is_active=true), public insert, public update, public delete
- deals: public select, public insert, public update, public delete
- vendors: public select, public insert, public update
- storage.objects: public insert, public update, public delete on restaurant-photos bucket

## File structure
app/
  page.tsx                          — Homepage
  restaurants/[id]/page.tsx         — Detail page
  list-your-restaurant/page.tsx     — Vendor signup form
  admin/page.tsx                    — Admin dashboard
  layout.tsx                        — Root layout (Google Maps preloaded here)
  components/
    Map.tsx                         — Map wrapper (dynamic import)
    MapInner.tsx                    — Google Maps + pins + popups
    NeighborhoodSearch.tsx          — Neighborhood autocomplete
lib/
  supabase.ts                       — Supabase client

## What is DONE
- [x] Clean build, Vercel auto-deploy
- [x] Google Maps with restaurant pins, price labels
- [x] Hover pin → popup with photo + bio + price (desktop)
- [x] Tap pin → popup (mobile/touch)
- [x] Click/tap popup → opens restaurant page in NEW TAB
- [x] Neighborhood search — alphabetical, starts-with priority
- [x] Neighborhood + cuisine filters work together on cards AND map pins
- [x] Filters: All, Italian, Japanese/Sushi, Asian, French, American, Seafood, Mediterranean, Latin/Mexican, Indian, Vegan-Friendly, Steakhouse, BBQ
- [x] Price slider (default: Any, max $100)
- [x] Laptop-friendly + walk-in toggles
- [x] User location blue dot
- [x] Homepage refetches on tab focus (no stale data)
- [x] Restaurant cards with real photos (photo_url) or emoji fallback
- [x] Restaurant detail page with hero photo + hover thumbnail gallery
- [x] Bio shown on detail page (Google Maps style one-liner)
- [x] "Reserve this lunch special" button on detail page
- [x] Fake star ratings REMOVED
- [x] Vendor signup form with bio + image size guidance (1200x800px)
- [x] Photos upload to Supabase Storage on form submit
- [x] Admin page — password: lunch2026
- [x] Admin: Pending submissions tab (approve/reject)
- [x] Admin: Active listings tab (edit/hide/delete)
- [x] Admin: Edit includes bio, photos, deal special+price, lat/lng
- [x] Admin: Delete works (RLS policies allow it)
- [x] Admin: Photo replace works (unique filename, RLS fixed)
- [x] Admin: Price shown in listing row
- [x] Admin: Refresh button
- [x] Admin link in footer
- [x] Auto-geocode lat/lng on vendor approve
- [x] Google Maps preloaded in layout.tsx (beforeInteractive)
- [x] Map background matches Google Maps gray (#e8eaed)
- [x] Tighter homepage layout — filters above map, smaller hero

## What is NOT done yet
1. [ ] Reservation modal — "Reserve this lunch special" button currently does nothing
2. [ ] User auth (Supabase Auth) — sign up / sign in
3. [ ] User profiles table — name, phone, neighborhood
4. [ ] Reservations table — restaurant_id, deal_id, user_id, name, contact, party_size, time, note, status
5. [ ] Email notifications (Resend) — to restaurant on new reservation
6. [ ] Admin reservations view — restaurants see incoming requests
7. [ ] Resend account setup needed (free at resend.com)
8. [ ] Move Google Maps API key to env var
9. [ ] Gallery hover swap works on desktop — need tap-to-swap on mobile
10. [ ] Bio field needs to be wired through approveVendor to restaurants table
11. [ ] vendors table needs bio column (add via Supabase SQL: ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bio text;)

## Reservation flow (planned)
### New user clicks "Reserve this lunch special":
1. Modal opens with 5 fields: name, email or phone, party size (1-4), preferred time, quick note
2. On submit: save to reservations table, send email to restaurant via Resend
3. Success screen: "Request sent! [Restaurant] will confirm within 60 minutes."
4. Optional prompt: "Save your info for next time?" → create account

### Returning user (logged in):
1. Modal opens pre-filled with their name + contact
2. Just pick party size + time + optional note
3. Same submit flow

## Known issues
- 8 original seeded restaurants have no photo_url (null) — show emoji fallback
- bio column exists in restaurants but not yet wired through approveVendor function
- vendors table may not have bio column yet (run SQL above)
