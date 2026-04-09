# Let's Get Lunch — Project Notes
Paste this file at the start of any new Claude chat to restore context instantly.

## Live URLs
- Site: https://lets-get-lunch-one.vercel.app
- Repo: https://github.com/ph1models-gif/lets-get-lunch
- Server: root@openclaw2-1.tail2e11b9.ts.net
- Project path: /home/ocuser/.openclaw/workspace/lets-get-lunch

## How we work
- SSH into server, edit files with python3 scripts, then: git add -A && git commit -m "message" && git push origin main
- Vercel auto-deploys on every push to main
- Never type Vercel build logs into the terminal — they are just for reading

## Tech Stack
- Next.js 14.2.3, TypeScript, Tailwind CSS
- Google Maps API (key is HARDCODED in app/components/MapInner.tsx — needs env var eventually)
- No backend yet — all data is hardcoded mock data in app/page.tsx

## Current file structure
app/
  page.tsx                          — Homepage (map + cards + filters + search)
  list-your-restaurant/
    page.tsx                        — Vendor signup form (168 lines, fully built)
  components/
    Map.tsx                         — Map wrapper
    MapInner.tsx                    — Google Maps implementation (hardcoded API key)
    NeighborhoodSearch.tsx          — Neighborhood autocomplete (206 NYC neighborhoods)

## What's built and working
- Google Maps with 8 restaurant pins showing price labels
- Neighborhood autocomplete search — triggers at 1 letter, covers all 5 boroughs (206 neighborhoods)
- Map pans when neighborhood is selected from search
- Food filter pills: Italian, Japanese/Sushi, French, American, Seafood, Mediterranean, Latin/Mexican, Indian, Vegan-Friendly, Steakhouse, BBQ
- Toggle filters: Laptop Friendly, Walk-ins, Vegan
- Price slider (max $35)
- Keyword search (laptop, wifi, quiet, etc.)
- Vendor signup page (/list-your-restaurant) with food photo upload UI
- ESLint unescaped-entities rule disabled via .eslintrc.json

## What is NOT done yet (build order)
1. [ ] Move Google Maps API key to env var (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
2. [ ] Fix <img> ESLint warning in list-your-restaurant/page.tsx (swap for next/image) — BUILD MAY STILL FAIL HERE
3. [x] User location blue dot on map — DONE
4. [x] Food photos in map pin popups — DONE (deal details showing in popups)
5. [ ] Rich pin popups with full deal details
6. [ ] Restaurant detail page: /restaurants/[id]
7. [ ] Supabase backend (replace hardcoded mock data)
8. [ ] Admin page to approve restaurant submissions
9. [ ] Resend email on vendor signup

## Known issues
- Google Maps API key is hardcoded in app/components/MapInner.tsx
- The <img> tag in list-your-restaurant/page.tsx (line ~130 in the photo preview grid) 
  will cause an ESLint build warning — needs to become <Image> from next/image
- Mock restaurant data only has 8 restaurants, all hardcoded in app/page.tsx
- walkIn property was accidentally mapped to workFriendly in a fix — needs cleanup later

## Restaurant data shape (mock, in app/page.tsx)
{
  id, name, lat, lng, price (number),
  neighborhood, cuisine, special (deal description),
  courses (2 or 3), laptopFriendly (bool), walkIn (bool),
  rating, hours, emoji
}

## Git log (recent)
8dd320f Fix walkIn toggle error
8ed30ec Fix walkIn type error  
25965bf Force deploy neighborhood search
fc80ed3 Add NeighborhoodSearch component
ddc7197 Wire neighborhood search to pan map
