# Let's Get Lunch — Project Notes
Paste this file at the start of any new Claude chat to restore context instantly.

## Live URLs
- Site: https://lets-get-lunch-chi.vercel.app
- Repo: https://github.com/ph1models-gif/lets-get-lunch
- Server: root@openclaw2-1.tail2e11b9.ts.net
- Project path: /home/ocuser/.openclaw/workspace/lets-get-lunch

## How we work
- SSH into server, edit files, then: git add -A && git commit -m "message" && git push origin main
- Vercel auto-deploys on every push to main
- Never paste Vercel build logs into the terminal

## Tech Stack
- Next.js 14.2.3, TypeScript, Tailwind CSS
- Google Maps API (key hardcoded in MapInner.tsx — move to env var later)
- Supabase (PostgreSQL database + client)
- Vercel (hosting)

## Supabase
- Project URL: https://iqurlwenkozmxoyymnkg.supabase.co
- Publishable key: sb_publishable_XV712EbMI7leXaWHaITV5Q_hKNNals4
- Client file: lib/supabase.ts
- Tables: restaurants, deals

## File structure
app/
  page.tsx                          — Homepage (pulls from Supabase)
  restaurants/[id]/page.tsx         — Detail page (pulls from Supabase)
  list-your-restaurant/page.tsx     — Vendor signup form
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

## What is NOT done yet
1. [ ] Vendor signup saves to Supabase (currently just a form, data goes nowhere)
2. [ ] Admin page to approve/reject vendor submissions
3. [ ] Resend email on vendor signup confirmation
4. [ ] Move Google Maps API key to env var
5. [ ] Real food photos (currently just emoji placeholders)
6. [ ] Reserve a table button (currently does nothing)

## Known issues
- Google Maps API key is hardcoded in app/components/MapInner.tsx
- walkIn filter on homepage uses work_friendly instead of walk_in (minor bug)
