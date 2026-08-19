# Let's Get Lunch

## Product
NYC directory of exclusive prix-fixe lunch specials. **Not a booking/reservation
service.** Partner restaurants (currently just Royal 35) get a QR check-in flow
proving referral. Non-partner restaurants get an honest hand-off after "Reserve
Now" — call/website links, no fake confirmation. Exclusive deals are redeemed
via an **LGX claim code** (e.g. `LGX-7F3K-2`, format `LGX-XXXX-partySize`),
generated server-side and shown to the diner to present at the restaurant.

## Stack
Next.js 14 (App Router, TS), React 18, Tailwind, Supabase (Postgres + Auth),
Vercel (auto-deploys on push to `main`), Resend for email. Native iOS app via
Capacitor 8, wrapping the live production site.

## Key tables (Supabase)
- `restaurants` — the live directory listing (address, neighborhood, cuisine,
  phone, website, lat/lng, active/hidden). Listing accuracy matters — this
  data drives diners to real addresses/phone numbers.
- `vendors` — pending restaurant submissions awaiting admin approval before
  becoming a `restaurants` row.
- `deals` — the lunch specials themselves, tied to a restaurant; `is_exclusive`
  flags ones that use the LGX claim-code flow.
- `claims` — **sensitive.** The actual LGX codes issued to diners (user_id,
  deal_id, code, party_size). This is redemption data, not just a log.
- `profiles` — diner account info, linked to Supabase auth users.
- `reservations` — reservation-intent leads (both the honest non-partner
  hand-off and the partner QR flow write here).
- `posts` — newsletter/announcement content (admin-authored).
- `unsubscribes` — email opt-outs.

## Capacitor iOS app
Runs in `server.url` mode pointing at `https://www.letsgetlunch.nyc` — it's a
shell loading the live site, not a static bundle (the site has server API
routes). Bundle ID `nyc.letsgetlunch.app`. Plugins are managed via Swift
Package Manager (`ios/App/CapApp-SPM`), **not CocoaPods** — `npx cap sync ios`
regenerates `Package.swift` automatically after `npm install`ing a plugin.
`capacitor.config.ts` = prod (loads live site); `capacitor.config.dev.ts` =
local LAN dev server, for testing changes before they're deployed.

Because it's server.url mode, **any web-app code change (including
native-only code gated behind `Capacitor.isNativePlatform()`) needs to be
pushed to `main` and deployed before it shows up in the native app**, unless
testing via the dev config.

Stages:
- Stage 1 (scaffold, CocoaPods→SPM setup, dev/prod configs, runs on device) — done
- Stage 2 (OneSignal push notifications: init on launch, permission request,
  external-user-ID login/logout tied to Supabase auth) — done 2026-08-19,
  verified end-to-end (test push received on physical device)
- Stage 3 (status bar/safe area, in-app nav instead of bouncing to Safari,
  app icon, launch screen) — done

## Hard constraints
- The iOS app's own code must stay **read-only** against Supabase — anon/
  publishable key only, never the service role key. No writes, no schema
  changes, no migrations originating from app-side work. (The existing
  Next.js server API routes already use the service role key server-side for
  things like claims — that's pre-existing and fine; don't extend that
  pattern into client/app code without asking.)
- If anything in iOS-app work seems to need a database write, stop and ask
  first.
- Listing accuracy matters — this is real addresses/phone numbers diners act on.
- The `claims` table is sensitive (real redemption codes tied to real users).

## Working with Brian
No coding background — explain plainly, work autonomously in stages rather
than walking through diffs. Verify claims about "what's done" against the
actual code/git history rather than taking prior-session summaries at face
value.

## Environment
macOS 15.7.3, Xcode 26.1. Local builds only, no CI.
