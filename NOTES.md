# Let's Get Lunch — Project Notes
**Last updated: September 5, 2026**

## ✅ App Store: 3rd rejection (Sept 4) - Guidelines 4.5.4 + 5.1.1, fixed same day, no new build needed

Apple rejected V1 again, citing 4.5.4 (Apple Sites and Services) and 5.1.1
(Privacy - Data Collection and Storage), with a reviewer screenshot of an
alert reading "You currently have notifications turned off for this
application. You can open Settings to re-enable them" - appearing
unprompted over a restaurant card.

Root cause found by inspecting `onesignal-cordova-plugin`'s own type defs:
`app/components/OneSignalInit.tsx` called
`OneSignal.Notifications.requestPermission(true)` on every native launch,
unconditionally. That `true` is `fallbackToSettings` - once a user has
denied notifications once, passing `true` makes OneSignal show *its own*
native-looking alert nagging them to open Settings, automatically, every
single time the app opens - not Apple's own system dialog, and not
triggered by anything the user did. That's the exact alert Apple
screenshotted, and matches both guidelines: 4.5.4 (misusing the push
permission flow) and 5.1.1 (re-soliciting a data-collection permission -
the push token - the user already declined, outside Apple's controlled
dialog).

**Fix:** now calls `canRequestPermission()` first, and only calls
`requestPermission(false)` (no fallback alert) if the user has genuinely
never been asked. Once a decision is made either way, the app never
prompts again on subsequent launches - matches what actual native apps
are expected to do.

**No new Xcode build/TestFlight upload needed** - this is `server.url`
mode, so the fix lives in the website's JS (`app/components/
OneSignalInit.tsx`), and pushing to `main` changes what the *already-
submitted* binary does the next time it loads the live site. Brian's next
step: confirm on his device (turn notifications off for the app in iOS
Settings, relaunch, confirm no more popup), then reply in the Resolution
Center explaining the fix - likely doesn't need a new screen recording
since this is a removed behavior, not a new feature, but check what Apple
asks for.

**Separate, non-code housekeeping Apple flagged (boilerplate, not a
rejection reason):** their standard "reply with all of this" checklist
asks that the App Review Information **Notes field** (a persistent field
in App Store Connect, not just a Resolution Center reply) be kept
populated for every future submission with: a screen recording of core
flows + any sensitive-permission prompts, devices/OS tested, an app
description, setup/demo-credential instructions, external services used,
regional differences, and any regulated-industry documentation. Most of
this content already exists from the 1st rejection's Resolution Center
reply (Aug 21-22) - it just needs to be copied into that persistent Notes
field so future reviewers see it upfront. Brian's task, not code.

## ✅ Admin: added a Claims tab - the panel had zero visibility into exclusive redemptions (Sept 4, 2026)

Brian went to Aperitivo by Carta (an exclusive-deal partner) with a friend,
Hélène Cristofani, who signed up and claimed the exclusive on her phone in
front of him - but he couldn't find any record of it in `/admin`.

Confirmed live (read-only query) that nothing was actually broken: her
profile, her claim (`LGX-4CHZ-2`, party of 2, Aperitivo by Carta,
2026-09-03), and the deal all exist exactly as expected. The real issue
was expectation vs. design: **for an `is_exclusive` deal there is no
"Reserve" button at all** - `RestaurantClient.tsx` only shows "Claim this
exclusive lunch," which posts to `/api/claim` and writes to the `claims`
table only, never `reservations`. That's correct, intentional behavior,
confirmed by reading the component - not a regression.

What *was* a real gap: the admin panel (`app/admin/page.tsx`) had **no
screen reading from `claims` at all** - grepped for it and came up empty.
The only way to check a claim was a direct database query. For a business
whose whole draw is exclusive claim codes at partner restaurants, that's a
real blind spot, so built it: new `/api/admin/claims` (password-gated,
same pattern as `/api/admin/reservations`) and a **Claims** tab mirroring
the existing Reservations tab - diner name/email, LGX code, restaurant,
party size, deal details, and a "claims by restaurant" breakdown. Merges
restaurant/deal/diner details in application code rather than via
PostgREST embedding, since `claims.user_id` has no direct FK to `profiles`
for PostgREST to embed through.

## ✅ RBAC: editor hide/show + edit history/revert built, RLS visibility bug found and fixed (Sept 4, 2026)

Built the edit-history feature that was proposed and paused on Aug 27 (see
that entry below), plus the specific capability Brian actually asked for:
Olga needs to go through every listing and hide (never delete) any
restaurant no longer running its lunch special, and Brian wants to see
everything she changes so he can review/undo it. Asked Brian directly
whether he wanted "log + revert" (change goes live immediately, reviewable
after) or an "approval queue" (change waits for his sign-off first) - he
picked log + revert.

### What shipped
- **Editors can now hide/show a listing.** `is_active` was deliberately
  locked out for editors in Phase A ("stays locked on purpose") - opened it
  up via `restaurants_editor_column_guard()`'s allow-list. Delete was never
  possible for editors either way (no DELETE RLS policy exists), so
  "hide, don't delete" holds by construction, not convention.
- **Edit history + revert.** New `edit_history` table + `AFTER UPDATE`
  triggers on `restaurants`/`deals` (`log_edit_history()`, security
  definer) snapshot before/after as jsonb on every change, from anyone -
  an editor via RLS, or the old service-role `/admin` panel.
  `editor_user_id` is `auth.uid()`, which lands NULL for service-role
  writes and a real UUID for an RLS-authenticated edit - no extra logic
  needed to tell them apart. New admin-only `/admin/edit-history` page
  (linked from `/admin/permissions`) shows every change with before→after
  diffs and a one-click Undo.
- Migration: `supabase/migrations/20260904_editor_hide_and_history.sql`,
  run successfully in 3 chunks in Supabase's SQL Editor. Chunk 1 failed
  once first try - the closing `$$;` got truncated on paste, the same
  known corruption pattern from Aug 27 (see that gotcha below) - succeeded
  on retry after re-copying via the code block's copy button.

### 🐛 Found a real RLS gap while testing (pre-existing since Phase A, not introduced today)
Brian set up a separate personal account
(`info@newyorkheadshots.com`) with the `editor` role, specifically to test
the system safely before giving Olga real access - good instinct, and it's
exactly what caught this. He logged in with zero restaurants granted and
could see the entire restaurant directory anyway.

Root cause, confirmed by having Brian paste back a read-only
`select policyname, cmd, roles, qual from pg_policies` query (couldn't
grep it locally - it predates any migration file in this repo, so it must
have been created directly in the Supabase dashboard before migrations
were tracked here): `restaurants` and `deals` each have a `"Public can
read {table}"` SELECT policy (`is_active = true`, role `{public}`) that
the live public site depends on for anonymous visitors. Postgres OR's
multiple applicable RLS policies together for the same command, so that
public policy applies to a signed-in editor's session too, regardless of
`restaurant_permissions` - it's not that the editor-scoped policy is
broken, it's that a *more permissive* policy also matches and RLS doesn't
support "most restrictive wins."

**Verified this was read-only, not a write hole**, before treating it as
low-severity: `restaurants_editor_update`/`deals_editor_update` are the
*only* UPDATE policies available to the editor role, and both correctly
require a `restaurant_permissions` match with no public/permissive
equivalent - so an editor could always only ever *see* extra restaurants
(the same public info any anonymous visitor already sees), never *edit*
one she wasn't granted. Confirmed by reasoning through the policy set
rather than by minting a real session as Brian's test account and probing
live - that specific verification method (admin `generate_link` +
`/auth/v1/verify` to get a session for another account without its
password) got auto-blocked by the coding agent's own safety classifier as
an impersonation pattern, even for Brian's own throwaway test account -
worth remembering as a dead end, don't retry it; ask for a `pg_policies`
dump instead.

Fixed in app code, not the shared DB policy (didn't want to touch
something the live public site depends on): `/admin/editor`'s data load
now filters client-side to the editor's own `restaurant_permissions` rows
(editors can already read their own permission rows under existing RLS),
so what an editor sees now matches what she can actually touch.

### 🐛 Also fixed: silent no-op saves
Found while investigating the above - `/admin/editor`'s Save/Hide buttons
never checked whether an RLS-blocked update actually returned a row. An
editor could click Save on a restaurant she lacked access to and see a
false "Saved ✓" while nothing happened at all. Now checks the `.select()`
result and shows a real error pointing back to the admin.

### New: bulk-grant tools on `/admin/permissions`
Since Olga's actual job is "go through every listing," checking off
restaurants one at a time didn't fit. Added:
- **"Grant all restaurants" / "Revoke all"** - one click, every listing.
- **"Grant this neighborhood" / "Revoke this neighborhood"** - a
  neighborhood dropdown (Brian's own idea, so he can have Olga work
  through the directory borough/neighborhood at a time, e.g. Midtown
  first) backed by `/api/admin/{grant,revoke}-neighborhood-access`.

### Where this left off
Brian was walked through testing all of the above on his own test
account; Olga has not yet actually been granted access as of this note -
next session, check whether he finished testing and follow up on how he
chose to grant her access (all at once vs. neighborhood by neighborhood).

## ✅ Admin: Hours dropdown missing 1pm start times (Aug 27, 2026)

`HOURS_OPTIONS` in `app/admin/page.tsx` only offered start times from
10:30am through 12pm - a restaurant that opens at 1pm Mon-Fri (came up
while onboarding a new exclusive listing) had no matching option in any
of the three places that dropdown is used (Add Listing, pending-vendor
review, active-listing edit). Added 1pm-3pm through 1pm-5pm.

## ✅ RBAC Phase A: LIVE and confirmed working (Aug 27, 2026)

Full migration run successfully in Supabase's SQL Editor (in small verified
chunks - see the gotcha below) and Brian's own admin account confirmed
working end-to-end: signed in at `/admin/login`, landed on `/admin/
permissions`, old password-gated `/admin` confirmed still working
unaffected. Olga has been invited from that screen. Phase A is DONE, not
just built - this is the first real per-user Supabase Auth identity this
app has ever had, alongside the original `ADMIN_SECRET` flow (untouched,
Phase B territory to retire it later).

### GOTCHA — copy/pasting multi-line SQL from chat into Supabase's SQL Editor is unreliable, watch for this every time
Hit THREE distinct corruption modes running this one migration, none of
them a real SQL bug:
1. A big multi-statement paste silently lost its `create or replace
   function ... as $$` header, so Postgres tried to parse the function
   *body* as top-level SQL (`syntax error at or near "if"`).
2. A paste came through completely empty (`syntax error at end of input,
   LINE 0`) - traced to a manual click-and-drag selection across a
   multi-line code block, not an actual system problem (confirmed the SQL
   runner itself was fine via a manually-typed `select 1;`).
3. Worst one: a stray "●" bullet character got inserted at the start of a
   line and threw a normal syntax error - easy to catch. But the SAME
   category of corruption almost certainly ALSO silently mangled a
   `create policy` statement in an earlier successful-looking paste
   (reported "Success. No rows returned" with no error) - the policy
   simply didn't end up matching anything, discovered only because I
   independently tested the RLS-scoped query myself (via an admin-
   generated session, service-role key from this environment) and got an
   empty result even though the underlying row definitely existed. **A
   "Success" message from the SQL Editor is not proof a multi-statement
   paste executed as intended** if any individual statement's semantics
   could silently no-op (an idempotent `drop policy if exists` + `create
   policy` is exactly this shape - if the create half got corrupted in a
   way that's still valid SQL, e.g. a fine-but-wrong predicate, you'd see
   no error at all).
- Fix that worked: use the code block's copy-button (not manual
  click-drag) and paste one small, single-purpose chunk at a time -
  ideally followed by a direct read-only verification query - rather than
  one giant multi-hundred-line block. Painful but reliable. If a *whole
  migration* reports success with no errors, still worth independently
  verifying anything security-critical (an RLS policy, in this case)
  actually behaves as intended before trusting it, rather than taking
  "Success" at face value.

### What was built (all pushed to `main`)
- `lib/auth/getUserFromRequest.ts`, `/api/admin/{grant-access,
  revoke-access,invite-editor,list-editors}`, `/admin/login`,
  `/admin/permissions`, `/admin/editor` — see the Aug 27 "RBAC Phase A
  build started" entry below for full detail on each.
- `supabase/migrations/20260812_rbac.sql` — now actually applied to
  production, not just written.

### NOT built yet — proposed, plan agreed, execution paused for now
Brian asked for an edit-history / audit-log feature: track every change
made to a restaurant or special (who, when, old value → new value per
field), shown as a new tab in the existing `/admin` panel, with a
"Revert this edit" button per entry. Agreed approach before pausing:
- New `edit_history` table + an `AFTER UPDATE` trigger on `restaurants`
  and `deals` that snapshots both the before and after row as jsonb -
  fires regardless of who makes the edit (Olga via RLS, or Brian via the
  old service-role panel), so `editor_user_id` naturally ends up NULL for
  service-role edits and a real UUID for RLS-authenticated editor edits -
  no extra logic needed to tell them apart.
- Revert = restore the row to that entry's stored "before" snapshot.
- Open question Brian hasn't answered yet: log *only* Olga's edits, or
  *everyone's* (leaning everyone, his call).
- Reassurance already confirmed true, not just assumed: editors cannot
  delete a restaurant or a deal at all - no DELETE RLS policy exists for
  the editor role, enforced at the database level. So this feature is
  about undoing a bad *edit*, not recovering a deletion - there's no
  deletion path for editors to recover from in the first place.
- **Not started.** Explicitly paused per Brian's own "let's log this
  idea for now" - resume when he says go.

## Reservations data cleanup + map crash fix + demand view (Aug 27, 2026)

## Reservations data cleanup + map crash fix + demand view (Aug 27, 2026)

- Deleted 45 reservation rows tied to Brian's own known test accounts
  (brian@letsgetlunch.nyc, ph1models@gmail.com, info@briankeithphoto.com),
  spanning April-August - clearly dev/QA testing, not real diners (test
  names like "undefined undefined", "john doe", "test app"). 24 real
  reservations remain. Confirmed zero rows left tied to those accounts
  after deletion.
- Fixed an intermittent map crash reported on the phone app ("Application
  error: a client-side exception has occurred", map not loading).
  `MapInner.tsx` only checked `window.google` (a bare object) existing
  before running `initMap()`, but Google's loader can populate that
  top-level object before the actual `maps.Map`/`Marker`/`InfoWindow`/
  `SymbolPath`/`event` classes it exposes are ready - a race more likely to
  lose on a phone's connection than a fast desktop one. Now checks for the
  exact symbols `initMap()` uses, and wraps the call in a bounded retry.
  Also added `app/error.tsx` - there was no error boundary anywhere in the
  app, so any uncaught client exception (this one or a future unrelated
  one) fell through to Next's bare crash page instead of a friendly retry
  screen.
- Added a "Demand by restaurant" summary to the admin Reservations tab -
  bookings + guest counts per restaurant, sorted highest first, respecting
  the existing Today/All toggle. This is the warm-sales-list data flagged
  as valuable back in the May 21 strategy notes, now actually visible.

## RBAC Phase A build started (Aug 27, 2026) — see [[rbac-plan-status]] in memory

Resumed the admin/editor RBAC plan (approved 2026-08-12, execution deferred
until now). Built the full Phase A application layer per the plan doc
(`/root/.claude/plans/kind-frolicking-clarke.md`): `lib/auth/
getUserFromRequest.ts`, `/api/admin/{grant-access,revoke-access,
invite-editor,list-editors}`, `/admin/login`, `/admin/permissions`,
`/admin/editor`. Confirmed via `git diff --stat` that zero existing admin
files were touched - the password-gated `/admin`, `/newsletter/admin`, and
all 16 pre-existing `/api/admin/*` routes are untouched and still work.

Also wrote the actual migration SQL (`supabase/migrations/
20260812_rbac.sql`) - the plan doc only had the prose spec, not the literal
SQL, so this is a fresh write, not something pulled from an earlier
session. Careful point worth flagging for whoever reviews it: the
editor-column-guard trigger functions check `if get_user_role() is
distinct from 'editor'` rather than `<> 'editor'` - a bare `<>` against a
NULL role (which is what every existing service-role/admin write resolves
to, since there's no `auth.uid()` in that context) evaluates to NULL, not
true, in Postgres's three-valued logic, and would have silently applied
editor column restrictions to admin/service-role writes too. `is distinct
from` handles NULL correctly. This was reasoned through, not verified
against a live run - there's no direct Postgres connection in this
environment, so **this migration has never actually been executed or
tested against real data.**

**BLOCKED on Brian - nothing further to build until this happens:**
1. Run `supabase/migrations/20260812_rbac.sql` in Supabase's SQL Editor.
2. Create an admin account: Supabase Dashboard → Authentication → Users →
   Add user (own email + a password).
3. Run a one-line snippet (given separately in chat, not in the repo -
   contains a real user UUID) to set that new user's role to `admin` in
   `user_roles`.
4. Log in at `/admin/login` with that new account, confirm it lands on
   `/admin/permissions` and existing `/admin` still works unaffected.
5. Only then: invite Olga by email from `/admin/permissions`, grant her
   specific restaurants, confirm she lands on `/admin/editor` and can only
   see/edit what she was granted.
6. Phase B (retrofit old routes to real roles, retire `ADMIN_SECRET`,
   tighten Storage policies) stays a separate, later, explicitly-approved
   step per the original plan - not started.

## ✅ Claims party size: DB check constraint never matched the app's raised cap (Aug 27, 2026)

- An older commit ("Claim flow: raise party size cap to 8...") raised the app-layer cap on exclusive claims
  to 8, but the database's own `claims_party_size_check` constraint was never updated to match - it still
  only allowed up to 6. Brian hit this live: picking 8 people silently failed, 6 succeeded. Confirmed
  directly (inserting test rows with the service-role key, bypassing the app entirely): party_size 7 and 8
  both got rejected with `violates check constraint "claims_party_size_check"`; 6 was the real ceiling.
  Only `claims` had this - `reservations` has no such constraint (party sizes up to 12 already work fine
  there, confirmed from real data).
- Fix was a DB migration, same as the account-deletion one - Brian ran it in Supabase's SQL Editor:
  ```sql
  ALTER TABLE claims DROP CONSTRAINT claims_party_size_check;
  ALTER TABLE claims ADD CONSTRAINT claims_party_size_check CHECK (party_size >= 1 AND party_size <= 8);
  ```
- Re-verified live afterward with a disposable test account: party_size=8 now inserts cleanly. Test data
  cleaned up.

## ✅ My Claims: the REAL bug found and fixed (Aug 27, 2026) — supabaseAdmin was silently caching reads

Earlier same-day entry below concluded My Claims was "already fixed" based on a synthetic test — a brand
new account, one claim, checked immediately. That test passed but was structurally blind to the real bug:
a fresh account/fresh query URL is always a cache miss regardless of whether caching is happening. Brian
then hit it for real on his own account (4 claims total, one brand new) and it reproduced immediately and
repeatably — logged out, logged back in (ruling out a stale client session/page), still missing just the
newest claim.

- Verified server-side, not client-side: minted a real sign-in session for Brian's actual account (Supabase
  admin `generate_link`, no password needed - a read-only support/debug technique, done with his explicit
  go-ahead after this environment's own safety classifier first blocked it as sensitive) and called the
  live `GET /api/account/claims` directly. It returned only 3 of his 4 real claims, twice in a row, with
  `x-vercel-cache: BYPASS` on the outer response both times (different `x-vercel-id` per call - genuinely
  fresh function invocations, not an edge-cached response) - yet an identical raw REST call straight to
  Supabase with the same service-role key returned all 4 rows every time.
- Root cause: `export const dynamic = 'force-dynamic'` on the route is documented as equivalent to
  `cache: 'no-store'` on every fetch inside it, but that didn't hold in practice for `supabaseAdmin`'s
  (`lib/supabaseAdmin.ts`) internal `fetch()` calls - something was still caching that specific Supabase
  REST query across invocations once it had been hit once for a given user, serving whatever row set
  existed on the *first* time that user's claims were ever fetched.
- Fix: `lib/supabaseAdmin.ts` now passes a custom `fetch` via the client's `global.fetch` option that
  forces `cache: 'no-store'` on literally every request the admin client makes, instead of relying on
  route-level `dynamic` config to propagate down through the library correctly. Fixes this at the source
  for every route that uses `supabaseAdmin` (claims, delete, claim, all the admin routes), not just this
  one endpoint.
- Verified live after deploy: same real-session method as above, `GET /api/account/claims` now returns all
  4 of Brian's real claims including the previously-missing one.
- Also confirmed two things along the way that are NOT bugs, just product design working as intended:
  1. Regular (non-exclusive) listings use the honest reservation hand-off, not the LGX claim flow - tapping
     "reserve" on one sends a reservation confirmation email and correctly never appears in My Claims. (This
     is what happened with Burger & Lobster - Bryant Park - not exclusive, so no claim, no bug.)
  2. My Claims correctly keeps showing old codes even after a restaurant's exclusive flag later gets turned
     off in admin - it's a permanent redemption record, not a live filter on current listing state. (Smyth
     Tavern's two July claims still show even though its deal is `is_exclusive: false` today - open question
     for Brian, not a bug: was pulling it from the exclusive program intentional?)

## ✅ Both live bugs resolved (Aug 26, 2026) — My Claims was already fixed; Account deletion fixed via DB migration, verified end-to-end

- **My Claims (Bug 1): already fixed, confirmed live, no action needed.**
  The two fixes from earlier today (`5e81e9b` "don't assume FK-embedded
  joins", `29c8462` "disable caching on the route") were already on `main`
  and deployed before this diagnosis session started — this session's
  local checkout was just stale (36 commits behind `origin/main`; pulled
  up to date first). Verified end-to-end against *production*, not just by
  reading the code: created a disposable test account + a `claims` row
  directly via the service-role key, signed in as that test user, hit the
  live `/api/account/claims` route within a second of creating the claim —
  it came back immediately, no staleness. Test account/claim fully deleted
  afterward.

- **Account deletion (Bug 2): real bug, root cause confirmed live, fix is
  a DB migration, not a code change.**
  `app/api/account/delete/route.ts` anonymizes by setting
  `claims.user_id` (and `reservations.name`/`contact`) to `null` — but per
  the live schema (checked via the Supabase REST OpenAPI spec with the
  service-role key), `claims.user_id` is `NOT NULL` with no default, and so
  are `reservations.name`/`contact`. Confirmed live with the same
  disposable-account method as above: called `POST /api/account/delete` as
  a test user with one seeded claim, got back
  `{"error":"Failed to process account data"}`, and the claims row came
  back completely untouched — the anonymize-claims step fails on the NOT
  NULL constraint before the flow ever reaches profile/auth deletion.
  Anyone who has ever made a claim hits this (and, separately, anyone
  who's made a reservation would hit the same class of failure on
  `reservations.name`/`contact`). Test account/claim/profile/auth user all
  deleted again afterward — nothing left in production from testing.
  - The route's own logic is already correct for a world where these
    columns are nullable — no code change needed once the schema allows it.
  - Couldn't apply the fix myself: no direct Postgres connection in this
    environment (no `DATABASE_URL`/psql), and the service-role REST key
    can do table reads/writes but not DDL. Needs Brian to run this in
    Supabase's SQL Editor — no redeploy required afterward, the code is
    already live and waiting on the schema:
    ```sql
    ALTER TABLE claims ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE reservations ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE reservations ALTER COLUMN contact DROP NOT NULL;
    ```
  - **RESOLVED — Brian ran the SQL above.** Re-verified live immediately
    after: created a fresh disposable test account with both a seeded
    `claims` row and a seeded `reservations` row, signed in as that user,
    called `POST /api/account/delete` for real — got `{"success":true}`.
    Confirmed after: the `claims` row survived with `user_id: null` (code/
    party size/restaurant/deal intact — exactly the anonymize-not-delete
    behavior the feature was designed for), the `reservations` row survived
    with `user_id`/`name`/`contact` all `null`, the `profiles` row was
    gone, and the Supabase auth user was gone (404 on lookup). Deleted the
    leftover fake claim/reservation rows afterward (not real redemptions,
    no reason to leave test data in partner-facing counts) — nothing left
    in production from testing. **Both App Store 5.1.1(v) bugs are done.**
    Next step for App Store submission (not a code task): record the new
    physical-device screen recording of the full delete flow and reply in
    the Resolution Center thread.

## ⏳ App Store: 2nd rejection (Aug 25) - building account deletion now

- 1st rejection (Aug 21-22, Guideline 2.1 "Information Needed") was resolved by
  replying in the Resolution Center with a detailed Notes writeup (app
  description, device tested - iPhone 15 Pro / iOS 18.7.8, demo account,
  external services list, regional/regulated-industry answers) plus a
  physical-device screen recording. That reply auto-resubmitted the app -
  no separate "Add for Review" click needed for this rejection type.
- 2nd rejection (Aug 25, reviewed on iPad Air 11" M3): **Guideline 5.1.1(v)
  - Data Collection and Storage**. Real, legitimate gap - the app has no
  in-app account deletion, only deactivation-free sign-out. Apple requires
  actual self-service deletion, not just a "contact us to delete" email
  flow. This needs real code, not just a reply.
- Decisions made with Brian for the fix:
  - Claims and reservations are **anonymized, not deleted**, when an
    account is deleted - strip name/email/user-id linkage but keep the
    redemption/reservation records themselves, since restaurant partners
    need redemption counts to keep adding up (their core promise as a
    partner). This is a deliberate exception to full erasure, specifically
    because `claims` is redemption data restaurants rely on, per the
    project's own "claims table is sensitive" note - anonymizing instead
    of deleting was Brian's explicit call, not assumed.
  - New account menu replacing the current "Hi, {name}" + separate "Sign
    Out" link in the header (in both HomeClient.tsx and
    RestaurantClient.tsx): a dropdown with **My Claims** (their claimed
    specials, codes, dates), **Preferred Lunch Area** (single neighborhood,
    becomes default map center), **Account Settings** (email + the new
    Delete Account flow), **Sign Out**. Mobile-friendly (tap to open/tap
    outside to close).
  - Privacy Policy needs updating too - currently says deletion requests go
    through email only; needs to mention in-app deletion, and the
    anonymize-not-delete handling for claims/reservations specifically.
  - Once built, needs a *new* screen recording (physical device) showing
    sign-in -> find account deletion -> complete flow, replied into the
    same Resolution Center thread.
- Not yet built as of this note - about to start implementation.

## ⏳ Submitted to the App Store, awaiting review (Aug 21-22, 2026)

- V1 (1.0, build 1) submitted for App Store review the evening of Aug 21.
  Waiting on Apple - typical turnaround 24-48 hours.
- What shipped in this pass: restricted the app to iPhone-only (was
  universal iPhone+iPad by Capacitor's default, but iPad was never tested -
  simpler to leave that for later), pre-answered the export-compliance
  question (`ITSAppUsesNonExemptEncryption: false` in Info.plist, standard
  HTTPS only), replaced the newsletter page's standalone email-capture form
  with a real "Sign up for Let's Get Lunch" account signup (confirmed
  against production data that `profiles.email_frequency` already defaults
  to `'weekly'`, so a real account gets the newsletter automatically -
  removed the now-fully-unused `NewsletterSignup.tsx` and
  `/api/newsletter-signup` route entirely), and updated Privacy Policy /
  Terms to cover Apple sign-in, the app, push notifications, and location
  use.
- App Store Connect setup done: app record created, category (Food & Drink),
  description/keywords/support+marketing URLs, App Privacy nutrition label
  (Location - not linked to identity; Name/Email/User ID/Device ID - linked
  to identity; all "App Functionality" only, nothing for
  tracking/ads/analytics), age rating (Infrequent/Mild alcohol reference -
  restaurant listings mention things like "craft cocktails," so "None"
  would've been inaccurate), Digital Services Act trader status, App Review
  Information with a real test account + notes on how to test the claim
  flow. Free Apps Agreement already active; skipped bank account/tax forms
  since there's no paid content.
- Screenshots: captured on an iPhone 17 Pro Max simulator, then resized
  locally with `sips` to 1284x2778 (iPhone 17 Pro Max's native resolution
  isn't one of Apple's accepted screenshot sizes for the 6.5" slot - had to
  downscale to match).
- Build: archived and uploaded via `xcodebuild archive` from the command
  line + Xcode Organizer's "Distribute App" flow, rather than sitting
  through a full interactive Xcode session.
- Gotcha for next time: an image accidentally got embedded as literal code
  in `AppDelegate.swift` (`#imageLiteral(...)`) - happens if a screenshot
  gets dragged onto Xcode's editor while a source file is focused. Caught
  before it was ever committed; worth remembering if a native build
  mysteriously fails to compile after screenshot-heavy back-and-forth.

## ✅ Auth: native Google sign-in fixed, already-signed-in bug fixed, Sign in with Apple built behind a flag (Aug 21, 2026)

- Root cause of native Google sign-in breaking: not Google's own anti-embedded-
  webview policy as first suspected, but Capacitor's own WKWebView navigation
  policy - any top-level navigation to a domain outside the app's configured
  website gets handed off to the full Safari app (`UIApplication.shared.open`)
  and cancelled in the webview, confirmed by reading
  `WebViewDelegationHandler.swift` directly. So tapping "Continue with Google"
  bounced the user out of the app into standalone Safari, where completing
  sign-in landed them on the website in a separate browser context - signed in
  there, but not back in the app.
- Fixed by intercepting the button before that navigation ever starts:
  `app/login/page.tsx` / `app/signup/page.tsx` now branch on
  `Capacitor.isNativePlatform()` - on native, get the OAuth URL without letting
  Supabase auto-redirect (`skipBrowserRedirect`), and open it via
  `@capacitor/browser`'s in-app sheet instead, with `redirectTo` pointed at a
  new custom URL scheme (`nyc.letsgetlunch.app://auth-callback`) instead of the
  website's `/auth/callback`. A new native-only component,
  `app/components/CapacitorAuthCallback.tsx` (mounted in `layout.tsx`, same
  `Capacitor.isNativePlatform()` + lazy-import guard pattern as
  `OneSignalInit.tsx`), catches that deep link via `@capacitor/app`'s
  `appUrlOpen`, closes the sheet, pulls the tokens out of the URL (the site
  uses Supabase's implicit flow, not PKCE, so no code-exchange step needed),
  and calls `setSession()`. Confirmed working end-to-end on a physical device.
- The website's own `/auth/callback/page.tsx` and `lib/supabase.ts` are
  untouched by any of this - deliberately kept out of scope since every
  sign-in on the site, web and app alike, goes through the former.
- Separately fixed a real bug: clicking "Continue with Google" while already
  signed in fired a fresh OAuth round trip with no session check - confirmed
  in Supabase's SDK that completing a new OAuth sign-in always overwrites
  whatever session was already stored, so picking a different Google account
  would silently swap the signed-in user with no warning. Now checks
  `getUser()` first and just continues on if already signed in, instead of
  starting a new OAuth flow.
- Added a "Sign in with Apple" button (mirrors the Google button exactly -
  same guard, same error handling, same native in-app-browser flow) for
  Guideline 4.8 compliance ahead of App Store submission. Gated behind
  `APPLE_AUTH_ENABLED` in `lib/auth.ts`.
- Aug 21: Apple provider configured in Supabase (Services ID
  `nyc.letsgetlunch.signin`, Sign in with Apple key from the Apple Developer
  portal, Team ID `5J2F6GZ9C8`) and `APPLE_AUTH_ENABLED` flipped to `true` -
  button is live on both the website and the app. Gotcha: Supabase's Apple
  provider wants a signed JWT as its "Secret Key (for OAuth)" field, not the
  raw `.p8` file content - generated locally with Node's built-in `crypto`
  (ES256, `dsaEncoding: 'ieee-p1363'` for the raw-format signature JWT
  needs), no dependencies added to the project. That secret expires ~6
  months from generation (~Feb 2027) per Apple/Supabase's own limit -
  regenerate the same way when it does.

## ✅ Newsletter: web claim button + hidden raw link (Aug 21, 2026)

- Posts are authored with a plain `/restaurants/{slug}` link in the body
  pointing at the deal being written about. The email already stripped that
  raw link out of the body and rendered it as a styled "Claim this exclusive
  lunch" button instead (`lib/announcementEmail.ts`) — but the web post page
  (`/newsletter/[slug]`) had no equivalent: it rendered the raw body
  untouched, so the URL showed as visible link text, and there was no button
  at all.
- Pulled the shared "find the restaurant link, strip it from the body"
  logic out of `announcementEmail.ts` into `lib/postClaimLink.ts` so email
  and web read from the exact same source instead of two copies drifting
  apart. `app/newsletter/[slug]/page.tsx` now uses it too: strips the raw
  URL before rendering the body, and adds the same "Claim this exclusive
  lunch" button (same blue pill style) right after the body — same position
  as the email version, right before the "View in browser" / "Back to
  newsletter" links respectively. Posts with no restaurant link just get no
  button, on both email and web, same as before.
- Nothing else about post authoring changed — still just write the plain
  restaurant link at the end of the body like before (e.g. the Mamazul
  post); it's picked up automatically on both channels.

## ✅ Native iOS app: all 3 stages done (Aug 17-19, 2026)

- Stage 1 (Capacitor scaffold, SPM-based iOS project, runs on device) and
  Stage 3 (status bar/safe-area, in-app nav instead of Safari handoff, app
  icon, launch screen) were already done. Stage 2 - OneSignal push
  notifications - shipped Aug 19: `onesignal-cordova-plugin` installed, Push
  Notifications + Background Modes capabilities added, `app/components/
  OneSignalInit.tsx` initializes OneSignal and requests permission on native
  launch, and ties OneSignal's external user ID to the signed-in Supabase
  user via `onAuthStateChange` (login/logout) so future notifications can be
  targeted at specific diners.
- Native-only, gated behind `Capacitor.isNativePlatform()`, dynamically
  imported - importing the OneSignal plugin statically crashed the website's
  entire server build (`window is not defined` during prerender) since the
  plugin touches `window` at module load. Caught via `npm run build` before
  it shipped; the website itself never loads this plugin.
- Verified end-to-end on a physical device: signed Xcode build, Push
  Notifications capability auto-registered with Apple during signing, test
  push sent from the OneSignal dashboard and received on the phone.
- Gotcha: OneSignal's dashboard setup wizard initially saved the Apple Push
  config under "macOS configuration" instead of iOS - fixed by Brian,
  pushes work now. Worth a second look if push ever silently stops working.
- Aug 19: fixed the "near me" map geolocation silently failing on native -
  WKWebView never showed the system location prompt because `Info.plist`
  had no `NSLocationWhenInUseUsageDescription` string. Added it; the
  existing geolocation code in the map needed no changes.
- Aug 19: added push deep-linking. `OneSignalInit.tsx`'s notification-click
  handler now reads a custom `url` field (from the OneSignal dashboard
  composer's "Additional Data") and navigates straight there via
  `router.push` (e.g. tapping a push about Royal 35 opens
  `/restaurants/royal-35-steakhouse` in-app) instead of always landing on
  the homepage. No admin UI for this yet - the `url` field is set by hand
  per-push in the OneSignal composer.
- Verified Aug 21 on a physical device: sent a real test push with
  `url` = `/restaurants/royal-35-steakhouse` in Additional Data, tapped it,
  landed on the Royal 35 page inside the app (not Safari). Gotcha hit along
  the way: OneSignal's composer has a separate "Launch URL" field that, if
  set, has the native SDK open it directly in Safari itself before the
  app's own click handler runs - keep that field blank and only use
  Additional Data for in-app deep links.
- Full project context (stack, tables, constraints, Capacitor setup) now
  lives in `CLAUDE.md` at the repo root instead of being re-explained each
  session.

## ✅ PWA: capability shipped, install prompt off (Aug 13-14, 2026)

- Merged `pwa-install-support` to main and deployed. Site is now a real
  installable PWA — manifest, service worker (`public/sw.js`), full icon +
  splash-screen set (generated via `scripts/generate-icons.js` from the
  circular favicon mark as placeholder source — rerun once a dedicated
  icon-source logo exists). Verified installable via Chrome's
  `Page.getInstallabilityErrors` CDP check against the production build
  (zero errors).
- Service worker only caches static assets/shell; never intercepts Supabase
  or `/api/*`, so listings/specials always come from the network.
- Decision: ship the capability but keep the install *prompt* dark for now.
  Manual install (Chrome menu → Install, iOS Share → Add to Home Screen)
  works everywhere; nothing prompts on its own, on any page (including
  `/claim`, which already had its own prior sticky-banner fatigue problem —
  see git history around a20ca02).
- The switch: `INSTALL_PROMPT_ENABLED` in `lib/pwa.ts` (currently `false`).
  `app/layout.tsx` only mounts `<InstallPrompt />` when that flag is true —
  flip it and redeploy to bring back the Android banner (20s-delayed,
  14-day dismiss suppression) and iOS hint (30-day dismiss suppression)
  exactly as built. `InstallPrompt.tsx` itself is untouched and still has
  its own internal `/claim`-suppression logic, in case that page needs
  different handling than the rest of the site whenever this gets
  re-enabled.

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


## Security Step 2 -- progress update (Jun 20, 2026, session 2)
DONE + verified live (all use pattern: client POST w/ pw -> /api/admin/<action> -> re-check ADMIN_SECRET -> supabaseAdmin service_role write):
- /api/admin/login (commit ae91253)
- /api/admin/toggle-active (commit ae91253)
- /api/admin/delete-restaurant (commit f7134df)
- Hardcoded 'lunch2026' fully removed from client.

STILL TODO (3 writes, same pattern, NOT yet moved -- admin still writes these with PUBLISHABLE key):
- approveVendor -- 5 ops: dup-guard (ilike name+address), geocode fetch, restaurants insert, deals insert, vendors status update. Function ~line 349-403. The geocode + dup-guard must move server-side too. Medium-big.
- addListing -- insert + geocode. Medium.
- saveEdit -- THE BIG ONE: restaurant update + deal update-or-insert + photo uploads (Supabase Storage) + geocode. Photo upload is the tricky part (currently client-side via supabase.storage). ~line 445-528.

THEN Step 4 (RLS lockdown) -- ONLY after all 3 above are server-side. Until then DB still publicly writable.
Rollback: git tag pre-step2-secure.


## Security Step 2 -- progress (Jun 20, session 3)
- /api/admin/approve-vendor DONE + tested live (restaurant + deal created). Replicates dup-guard + geocode + restaurant insert + deal insert + vendor status update server-side. ADDED: 23505 unique-violation backstop -> if DB index rejects a dup the guard missed, marks vendor approved cleanly instead of erroring.
- 4 of 6 admin writes now server-side: login, toggle-active, delete-restaurant, approve-vendor.

REMAINING (2):
- addListing -- insert + geocode (inserts at admin/page.tsx lines ~297, 314). Medium. Same pattern as approve minus the dup-guard complexity. Has its own form-state to pass.
- saveEdit -- THE BIG ONE: restaurant update + deal update-or-insert (line ~476) + PHOTO UPLOADS (Supabase Storage, currently client-side) + geocode. Photo upload is the hard part -- may keep upload client-side (it's a storage write, not a table write) and only move the table writes server-side. Decide approach when tackling.

THEN Step 4 RLS lockdown -- only after addListing + saveEdit done. DB still publicly writable until then.
Rollback: git tag pre-step2-secure.


## Security Step 2 -- progress (Jun 20, session 3 cont.)
- /api/admin/add-listing DONE + tested live. submitNewRestaurant: geocode + photo upload stay CLIENT-side, then restaurant+deal+vendor inserts go server-side via service_role. 23505 dup backstop -> 409. PATTERN for saveEdit confirmed: keep storage/geocode client, move table writes server.
- 5 of 6 admin writes now server-side: login, toggle-active, delete-restaurant, approve-vendor, add-listing (submitNewRestaurant).

LAST ONE:
- saveEdit (~line 445-528, deal insert at ~476) -- restaurant UPDATE + deal update-or-insert + photo upload (Storage, keep client) + geocode (keep client). Same split: photos+geocode client, table writes -> new /api/admin/save-edit route. Slightly more complex than add (update-or-insert branch for deal). Last write before RLS.

THEN Step 4 RLS lockdown. DB still publicly writable until saveEdit done + RLS applied.
Rollback: git tag pre-step2-secure.
DEFERRED note: photo uploads still use publishable key against Storage bucket (separate from table RLS). Storage-policy hardening = separate later task, doesn't block table RLS.


## SECURITY STEP 2 -- COMPLETE (Jun 20, 2026)
ALL admin table writes now go through server routes (admin secret check + service_role). Zero direct supabase.from().insert/update/delete left in app/admin/page.tsx (verified by grep). Routes:
- /api/admin/login (password check)
- /api/admin/toggle-active
- /api/admin/delete-restaurant
- /api/admin/approve-vendor (+ 23505 dup backstop)
- /api/admin/add-listing (+ 23505 backstop)
- /api/admin/save-edit (restaurant update + deal upsert, + 23505 backstop)
- /api/admin/vendor-update (restore/reject/review-edit -> patch)
All tested live + Vercel green. Hardcoded admin password fully removed; auth via ADMIN_SECRET env (server + Vercel).
Photos + geocoding stay CLIENT-side (Storage writes, separate from table RLS) -- intentional.

### READY FOR STEP 4 (RLS lockdown) -- the high-risk step, do FRESH:
Now safe to revoke public table writes because admin no longer needs them. Plan:
- restaurants: keep public SELECT (is_active=true); REVOKE public INSERT/UPDATE/DELETE; ENABLE RLS (currently OFF on this table!).
- deals: keep public SELECT (is_active=true); revoke public INSERT/UPDATE/DELETE.
- vendors: KEEP public INSERT (the /list-your-restaurant form needs it); revoke public UPDATE/DELETE; consider restricting SELECT.
- reservations: KEEP public INSERT (reserve flow -- though that's now server-side via service_role too, verify); REVOKE public SELECT (customer PII exposure!).
- profiles: revoke public UPDATE/INSERT where possible (auth-tied).
- TEST LIVE SITE AFTER EACH POLICY CHANGE. Homepage must still load listings (public SELECT). Reserve flow + admin must still work (service_role bypasses RLS).
- Reservations insert: CHECK whether reserve route uses service_role (it does -> route.ts uses supabaseAdmin) so public INSERT on reservations can also be revoked. Verify before revoking.
Rollback: git tag pre-step2-secure + Supabase daily backups + local JSON export.


## RLS LOCKDOWN -- progress (Jun 22, 2026, session end)
DONE + tested live (4 of 5 tables):
- reservations: dropped public SELECT (PII leak closed). Kept INSERT. Admin read moved to /api/admin/reservations (service_role). TESTED.
- deals: dropped public delete/insert/update. Kept "Public can read deals" (is_active=true). Homepage + admin deal-edit TESTED.
- vendors: dropped "Public can update vendors". Kept INSERT (form) + SELECT. Form + admin pending TESTED.
- profiles: dropped old public insert/update (were with_check=true -- anyone could write any profile). REPLACED with constrained policies: "Users can insert their own profile" (with check auth.uid()=id) + "Users can update their own profile" (using+with check auth.uid()=id). Signup re-tested -> new profile saves (test test / Chelsea). MORE secure than before.
  - GOTCHA fixed: profile INSERT is client-side in 4 spots (login, signup, RestaurantClient reserve, auth/callback) all set id=data.user.id, so auth.uid()=id policy is correct. SQL keyword is "with check" (two words), not "with_check".

### LAST TABLE -- restaurants -- NOT DONE. Highest risk. Do FRESH:
- restaurants currently has RLS *OFF* (rowsecurity=false) -- policies exist but unenforced, table fully open.
- SEQUENCE when ready:
  1. drop "public delete restaurants", "Public can insert restaurants", "public update restaurants" (harmless while RLS off -- just prep).
  2. KEEP "Public can read restaurants" (is_active=true) -- homepage depends on it.
  3. THEN: alter table public.restaurants enable row level security;  <-- moment of truth.
  4. IMMEDIATELY refresh live homepage -- listings MUST still load (via the public SELECT policy). If dark, the SELECT policy is wrong -> disable RLS again to restore, then fix policy.
- Have homepage open in a second tab, ready to refresh the instant RLS flips on.
- Admin writes/reads to restaurants already go via service_role (toggle, delete, approve, add, save-edit) so they bypass RLS fine. Admin restaurants READ (Active Listings / fetchRestaurants) -- VERIFY it still works after RLS on (it reads is_active listings, public SELECT covers active; but check if it needs to see inactive ones -> if so that read needs a service_role route too, like reservations did).
Rollback: git tag pre-step2-secure + Supabase daily backups. To instantly undo: alter table public.restaurants disable row level security;


## TODO (next session) -- two open items, both LOW urgency:

### 1. Google Maps API key hardening (Maps worked again after a transient blip Jun 23)
- Key "Maps Platform API Key" in Google Cloud (project-3cd62bd2-7a1f-4e7e-979) currently allows 32 APIs, NO app restriction. It's the hardcoded key AIzaSy...JheFm0 in client + server code.
- DECISION PENDING (3 options):
  - A (safe/quick): restrict by API only -> keep Maps JavaScript + Geocoding + Places, uncheck other 29. Leave Application restriction = None. Can't break anything.
  - B: add website referrers https://www.letsgetlunch.nyc/* + https://letsgetlunch.nyc/* -> BUT this risks breaking SERVER-SIDE geocoding (Vercel server requests send no referrer header -> Google rejects geocode calls in add-listing/save-edit/reserve routes). If doing B, MUST test adding a listing right after + revert if no pin.
  - C (correct architecture): TWO keys -- one browser key restricted to websites (map), one server key API/IP-restricted (geocoding). Requires adding 2nd key to env + code. The proper fix.
- RECOMMENDATION: A tonight-equivalent, C eventually. NOT just-B (quietly breaks geocoding).
- WHY transient: billing shows "Paid account" $0.00, healthy. Map recovered on its own -- likely a Google-side blip or momentary billing re-verify.

### 2. RLS lockdown -- FINAL table still pending (restaurants)
- 4 of 5 tables done+tested (reservations, deals, vendors, profiles). Only restaurants left.
- restaurants has RLS OFF. Sequence: drop 3 public write policies (prep), keep "Public can read restaurants" (is_active=true), THEN enable RLS, THEN refresh homepage IMMEDIATELY (listings must load). Have homepage open in 2nd tab.
- Check admin Active Listings still works after (may need inactive listings -> if so, that read goes server-side like reservations did).
- Instant rollback: alter table public.restaurants disable row level security;


## RLS LOCKDOWN -- COMPLETE (Jun 27, 2026)
ALL 5 tables locked down + tested live. The database is no longer publicly writable.
- restaurants: dropped public delete/insert/update policies; KEPT "Public can read restaurants" (is_active=true); ENABLED RLS (was OFF). Homepage still loads listings ✓. Admin shows all listings incl. hidden + writes work ✓ (admin reads/writes via service_role, bypass RLS).
- reservations: public SELECT dropped (PII closed), INSERT kept, admin read via /api/admin/reservations.
- deals: public write dropped, public SELECT (is_active) kept.
- vendors: public UPDATE dropped, INSERT (form) + SELECT kept.
- profiles: public insert/update replaced with constrained "own profile" policies (auth.uid()=id).
- Security posture now: public (publishable key) can only READ active listings/deals + INSERT vendor applications + reservations + own profile. All admin/privileged ops go through service_role server routes behind ADMIN_SECRET. service_role bypasses RLS so app fully works.
Rollback (if ever needed): alter table public.restaurants disable row level security; + git tag pre-step2-secure.

### SECURITY PROJECT (Steps 2 + 4) -- FULLY COMPLETE. The original open exposure (publicly writable DB) is CLOSED.


## RLS LOCKDOWN -- COMPLETE (Jun 27, 2026)
ALL 5 tables locked down + tested live. The database is no longer publicly writable.
- restaurants: dropped public delete/insert/update policies; KEPT "Public can read restaurants" (is_active=true); ENABLED RLS (was OFF). Homepage still loads listings ✓. Admin shows all listings incl. hidden + writes work ✓ (admin reads/writes via service_role, bypass RLS).
- reservations: public SELECT dropped (PII closed), INSERT kept, admin read via /api/admin/reservations.
- deals: public write dropped, public SELECT (is_active) kept.
- vendors: public UPDATE dropped, INSERT (form) + SELECT kept.
- profiles: public insert/update replaced with constrained "own profile" policies (auth.uid()=id).
- Security posture now: public (publishable key) can only READ active listings/deals + INSERT vendor applications + reservations + own profile. All admin/privileged ops go through service_role server routes behind ADMIN_SECRET. service_role bypasses RLS so app fully works.
Rollback (if ever needed): alter table public.restaurants disable row level security; + git tag pre-step2-secure.

### SECURITY PROJECT (Steps 2 + 4) -- FULLY COMPLETE. The original open exposure (publicly writable DB) is CLOSED.


## RLS LOCKDOWN -- VERIFIED COMPLETE (Jun 27, 2026, corrected)
IMPORTANT CORRECTION: the first "enable RLS" on restaurants did NOT take (status query showed rowsecurity=false even though homepage worked -- because with RLS off, public SELECT works anyway so "homepage loads" was a false positive). Re-ran `alter table public.restaurants enable row level security;` and CONFIRMED via pg_tables that restaurants.rowsecurity=true. Homepage + admin re-tested working.
LESSON: always confirm RLS state with `select rowsecurity from pg_tables where tablename=...` -- do NOT trust "the site still works" as proof RLS is on (it isn't proof; RLS-off also lets reads through).
FINAL STATE: ALL public-schema tables now rowsecurity=true (deals, profiles, reservations, restaurants, unsubscribes, vendors). DB genuinely locked. Security project (Steps 2+4) truly complete.

## 2026-06-28 — Geocoding fixed (server-side two-key)
- ROOT CAUSE: single Maps key was referrer-locked ("Websites"); Google Geocoding web service rejects referrer-locked keys. Approved listings got no coords/pin.
- FIX: created 2nd Google key — App restrictions=None, API restrictions=Geocoding API only, 500/day quota cap.
- Key stored server-side ONLY as GOOGLE_GEOCODING_KEY in .env.local + Vercel (all 3 envs). NEVER in browser, gitignored.
- New route: app/api/geocode/route.ts (reads key server-side, returns {lat,lng}).
- Patched all 3 admin call sites (add ~268, approveVendor ~320, edit ~418) to fetch /api/geocode instead of hitting Google directly. Removed hardcoded AIzaSy key from admin entirely.
- Map in layout.tsx UNCHANGED — still uses old website-locked key (correct).
- VERIFIED LIVE: endpoint returns correct coords; approved "The Hop Shoppe" (372 Van Duzer St, SI) → saved 40.6292,-74.0797 → pin renders.
- NOTE: pin only appeared after setting days to include Sat/Sun — day-of-week FILTER quirk, not geocoding. Worth checking weekday filter logic later.
- APPROVAL GATE LIFTED: new listings can be approved again.

## TODO (next session)
- Delete/find test listings: testhampton2, sparks, testhampton. Admin "Active listings" search shows 0 even with Show Hidden ON — check if already deleted, name mismatch, or in vendors table not restaurants. Use direct DB query.
- Remove leftover backups: .env.local.bak, app/admin/page.tsx.bak (confirm gitignored/untracked first).
- Verify Hop Shoppe days are set to REALITY (Mon-Fri if that's the real deal), confirm pin still shows on weekday view.

## 2026-07-12/13 — Exclusive claims system (LGX) SHIPPED
Core pilot mechanic: exclusive deals visible to all, but CLAIMING requires a free account. Claim code proves attribution to restaurant.

**Also this session:** removed fake "specials left" counter (was a deterministic hash of the UUID, mod 7 + 4 — never a real count). Integrity fix. Commit addfa36.

### DB (Supabase)
- `deals.is_exclusive` boolean, default false
- `claims` table: id, deal_id, restaurant_id, user_id, code, party_size (1-8), status (claimed/redeemed/expired), claim_date, created_at
- Displayed claim code is `{code}-{party_size}` (e.g. `LGX-4F7K-4`) — the base `code` column stays the bare lookup key; the party size suffix is display-only, computed once in `app/api/claim/route.ts` and returned as `display_code` so the on-screen confirmation and email always match.
- UNIQUE index `claims_one_per_user_per_deal_per_day` on (user_id, deal_id, claim_date) — DB-enforced, not app logic
- `claim_date` defaults to NY calendar date, NOT UTC. Critical: a 9pm ET claim is already "tomorrow" in UTC and would break one-per-day.
- RLS ON. Policy: users SELECT own claims only. No INSERT policy — writes go through server (service_role).

### Code prefix decision
- Reservations = `LGL-XXXX` (existing, unchanged)
- Claims = `LGX-XXXX` (new). Differ in the FIRST char after the stem so they're distinguishable at a glance / over a noisy phone. Rejected LGLR/LGLC — distinguishing letter buried mid-prefix = misread risk at a busy host stand.
- Charset excludes 0/O/1/I.

### Files
- `app/api/claim/route.ts` — NEW. Verifies user from Bearer token server-side (never trusts client user_id), verifies deal is_exclusive from DB, derives restaurant_id from deal row. Returns 409 `already_claimed` on Postgres 23505. Emails code via Resend (failure never blocks the code).
- `app/restaurants/[id]/RestaurantClient.tsx` — badge, gated button, claim modal.
- `app/auth/callback/page.tsx`, `login`, `signup` — `?next=` return-path. Phishing guard: only accepts paths starting with single `/`.
- `app/admin/page.tsx` — exclusive checkbox in edit form + EXCLUSIVE badge on listing card.
- `app/api/admin/save-edit/route.ts` — BUG FIXED: route wrote only special/price/days, silently dropped is_exclusive. Unchecking never saved.

### Language rules held
Claim modal + email say "No reservation needed — just walk in and show this code." NO "you're all set", no time picker, no booking implication.

### GOTCHA — Vercel silently skipped a deploy
Commit 0946045 pushed to GitHub, Vercel never built it. Claims ran old code; email looked broken for ~30min. ALWAYS confirm the commit hash appears in Vercel > Deployments after a push. An empty commit (`git commit --allow-empty`) wakes the webhook.

### Deliberately NOT built
- Claims admin dashboard — Brian will judge pilot by signups, not code-by-code audit. Revisit if a partner wants counts.
- `daily_limit` / real specials counter — no partner has agreed to cap covers.

### TODO
- Smyth Tavern was used as the test listing — is_exclusive now OFF (correct; they haven't agreed to anything).
- Signup while ALREADY logged in hangs on "Creating account..." — Supabase signUp with an active session. Handle it (log out first, or detect session).
- Signup page subtitle still says "Reserve NYC's best prix-fixe lunch deals" — the word "Reserve" contradicts the walk-in model. Fix.
- Search Console: "Duplicate without user-selected canonical". Not urgent. Likely www/non-www + client-rendered listing pages.
- Clean up .bak files (many).

## 2026-07-19 — Signup polish + /claim plan (pre-build checkpoint)

### Shipped tonight (all live, pushed through 618d906)
- Signup page: real LGL logo (public/logo.jpg, h-36, rounded-2xl white tile — JPG has white bg, framed intentionally), X escape top-right, logo also links home. Reduced top blue space (items-start, pt-6).
- Signup subtitle: "Claim exclusive NYC lunch deals — free to join" (was "Reserve NYC's best..." — killed "Reserve", contradicts walk-in model).
- Footer: IG @letsgetlunch.nyc + TikTok @lets.get.lunch icons (grey, hover blue).
- Favicon: real LGL badge (public/favicon.jpg). Old one was 0 bytes. Confirmed serving at /favicon.jpg. Browser cache shows old "L" for existing visitors only — new visitors get it clean.
- Cleaned up all .bak files.

### NEXT: /claim landing page (card QR target) — SPEC
Build /claim as a variant of the existing homepage/map. ONLY difference from normal page:
- Auth CTA reads "Claim exclusive deals" (NOT "Log in", NOT "Sign up for our website") — prominent, top-right, colored button.
- CTA routes to existing /signup flow. DO NOT modify /signup (its URL is on Brian's printed business-card QR — must not change).
- NO login wall. Map + deals visible to everyone logged out. Tease publicly, gate the claim.
- Mobile-first (every scan is a phone on a sidewalk).
- Do NOT build: exclusive-deals map filter, members-only view, homepage overlay. Not needed — exclusive deals reach users by EMAIL, not a special view.

### KEY REFRAME (the actual lever, not code)
The signup friction was never the form — it was the PITCH. Asking "sign up for my website" = a business ask (uncomfortable). Selling "exclusive lunch deals, sign up to get them" = a gift. Same signup, opposite psychology. Card/convo/CTA all lead with DEAL, never "sign up." Signup is the mechanism, never the headline.

### ALSO TODO
- /login page still has OLD logo (emoji + wordmark). Update to match /signup (same logo swap). Users bounce between the two via "Sign in" link — inconsistency is visible.
- Build user-facing opt-out toggle for exclusive-deal emails (extend existing unsubscribe system, don't rebuild).

### OPEN QUESTION (decide before printing cards)
What is the FIRST email a new signup receives, and WHEN? Card promises "exclusive deals" — if someone signs up in the park Wed and hears nothing for a week, the card lied. Mamazul is live (first exclusive partner); sister restaurant in works. Define the first-email cadence so the pitch is true.

### PARTNERS
- Mamazul: signed, first exclusive partner.
- Sister restaurant of Mamazul: deal in works.
- Smyth Tavern: was the TEST listing — is_exclusive OFF (correct, they never agreed).

## 2026-07-25 — Newsletter (built with Claude Code) + bio limit
### Newsletter — SHIPPED, live on main at /newsletter
- Chose to BUILD IN-HOUSE at letsgetlunch.nyc/newsletter (subdirectory) instead of Beehiiv ($96/mo for branding removal) / Buttondown / Substack. Reason: SEO — subdirectory on main domain beats any subdomain/3rd-party for ranking, which matters (restaurants, PR, investors find pages via search). $0/mo, full control, own branding.
- Built with CLAUDE CODE (first use) — ran on the server, way faster than SSH paste-back. Installed via npm i -g @anthropic-ai/claude-code. Work done on `newsletter` branch, merged to main.
- posts table in Supabase: id, title, slug (unique), excerpt, body (markdown), cover_image_url, published (bool), published_at, created_at. RLS on, public SELECT only where published=true.
- Public pages: /newsletter (archive) + /newsletter/[slug] (post, SEO metadata, markdown via `marked`). Both force-dynamic + cache:'no-store' on the Supabase fetch (needed BOTH — force-dynamic alone left deleted/stale posts showing because shared client cached).
- Admin: /newsletter/admin — password-gated (reuses ADMIN_SECRET, same as main admin). Create/edit/delete posts, cover image upload (reuses restaurant-photos bucket, newsletter/ prefix). All writes via service-role API routes (posts-list/create/update/delete/upload), password verified server-side.
- Post titles/headings use Bebas Neue (--font-bebas, matches logo). Body stays Inter.

## 2026-07-26 — Mobile homepage perf (Core Web Vitals): Wave 1 + Wave 2
### Baseline (PageSpeed mobile, production): Performance 46, LCP 9.8s, TBT 580ms, CLS 0.166. SEO 100 — this is purely a speed problem.

### Wave 1 — SHIPPED, merged to main (branch `perf-lcp`, commit 32af998, merge 9f7cfab)
- Google Maps `<Script>` moved out of root layout (was `strategy="beforeInteractive"`, blocking hydration on every route incl. pages with no map) into the homepage's `Map.tsx`, now `lazyOnload` and gated behind an `IntersectionObserver` so the Maps bundle + marker construction don't load until the map nears the viewport.
- Restaurant card photos switched to `next/image` (fill + sizes), `priority` on first 2 above-the-fold cards. Added Supabase storage host to `next.config.js`/`.mjs` `images.remotePatterns` (two config files exist in this repo — kept both in sync since it wasn't obvious which one Next actually loads).
- Loading-skeleton cards restructured to mirror the real card's DOM (same padding/line placeholders) with a shared `min-h-[384px]` on both skeleton and real cards, so the data swap doesn't reflow the grid.
- Result: TBT 580ms → 80ms (green). LCP and CLS untouched (9.8s→9.6s, 0.166→0.166) — expected, since Wave 1 didn't touch the client-side data-fetch waterfall or the root CLS cause.
- CAUTION: the PageSpeed run reported as "Wave 1 results" was against a `perf-lcp` Vercel *preview* URL, not production — don't conflate the two. The Google Maps key is referrer-locked to `letsgetlunch.nyc`, so it silently fails on `*.vercel.app` previews. The real Wave 1 TBT win is only verifiable on production; preview PageSpeed is directional only (and will underreport Maps-related cost since Maps never loads there at all).

### Wave 2 — branch `perf-wave2`, not yet merged
Root cause of the stuck LCP (AS ASSUMED AT THE TIME — **disproven by the Job 0 audit two sections below, which found the LCP element is actually the Maps internal static preview, not the card photo. Don't cite this line's "first restaurant card photo" claim as current fact.**): homepage (`app/page.tsx`) was 100% `'use client'` — the LCP element (first restaurant card photo) couldn't paint until hydrate → `useEffect` → Supabase fetch → re-render. That whole chain was the 9.6s.
- Split the homepage into a Server Component (`app/page.tsx`, fetches restaurants) + `app/HomeClient.tsx` (all the existing interactive/filter/map state, now seeded via an `initialRestaurants` prop instead of fetching on mount). First cards + photos are now in the server-rendered HTML.
- `force-dynamic` + a `cache: 'no-store'` fetch override on the page-local Supabase client — same pattern as `/newsletter` (see above); without both, restaurant edits/deactivations would either bake into a static build or hit a cached fetch.
- De-duped the Supabase query: `MapInner.tsx` previously ran its own independent `restaurants` fetch just for markers. It now receives `restaurants` as a prop from the same single fetch instead.
- Trimmed `select('*')` down to only the columns the homepage cards/map actually render (`app/types.ts` → `HOMEPAGE_RESTAURANT_SELECT`, one shared constant used by both the server fetch and the client's focus-triggered refresh, so they can't drift). Dropped: `address`, `rating`, `seats`, `photo_urls`, `deals.courses` — none of those are read on the homepage (still selected in full on `/restaurants/[id]`, untouched).
- The old loading-skeleton branch in the restaurant grid is gone — with data present at first paint there's no swap left to guard against, so Wave 1's skeleton-matching fix became dead code and was removed along with the `loading` state.
- Still client-side, unchanged: the focus-triggered restaurant refetch (picks up admin/`/claim` edits without a reload) and the auth/profile check — neither blocks the initial paint.

### Wave 2 audit correction (Job 0) — LCP/CLS/TBT re-diagnosed with real trace data, not assumptions
Wave 1 and Wave 2 improved TBT (580ms→80ms) but LCP (9.6s) and CLS (0.166) didn't move, because both waves targeted the wrong elements. A real audit found:
- **LCP element is actually the Google Maps internal static preview image** (`StaticMapService.GetMapImage`) — Google's own Maps JS internally shows a static preview while interactive tiles load. It's not in the HTML and not discoverable/prioritized, so it loads late (2,170ms resource delay dominates).
- **CLS culprit is the first restaurant card (Mamazul) shifting**, not the map itself moving directly — the map is the suspected trigger (its multi-stage mount sequence — placeholder → dynamic-chunk-load → real map — all happens within the measured load window), pushing the card below it down, though the exact per-frame mechanism couldn't be confirmed without live trace tooling. Ruled out via code inspection: NeighborhoodSearch (self-contained, absolutely-positioned dropdown, never opens unattended), the card's own image/badge/font (all SSR'd since Wave 2, nothing added async).
- **TBT's real driver is NOT "Google Maps React wrapper code."** We don't have any such dependency — Maps loads via a raw `<script>` tag from Google's CDN, physically can't be in our webpack chunks. Verified `MapInner.tsx` is already correctly code-split into its own 5.8KB chunk. The large shared chunk (`23-*.js`, 123KB) is core Next.js/React App Router framework runtime, not app code — can't be deferred alongside the map.

### DECISION: static map facade REJECTED — interactive-map-first is a deliberate product choice
A facade (server-rendered static map image, defer interactive map behind tap/idle) was proposed and would have fixed LCP/CLS/TBT numerically. **Rejected**: it trades away the interactive-map-on-load experience, which is the product, for a score. Accepted consequence: the interactive Google Map stays the LCP element, mobile LCP stays ~5-6s, Performance score stays capped in the 50s-60s. This is intentional — **do not re-propose the facade, a static map, or a tap-to-activate gate for the homepage map in a future session** without a new, explicit product decision to revisit it.

### 2026-07-27 — facade revisited (explicit new product decision, per the line above), branch `perf-static-under`
Brian explicitly re-opened this, with the constraint that the interactive map's mount timing/behavior stay 100% unchanged (no tap-gate, no IntersectionObserver changes) — just replace the "Loading map…" skeleton with a real Google Static Maps `<img>`, SSR'd, so it's discoverable/prioritized instead of Google's own late-loading internal preview.
- v1 shipped `size=640x420&scale=2` (133KB PNG) with `fetchPriority="high"`. **Result: Performance score DROPPED to 33** (worse than the pre-Wave-1 46 baseline, and well below the ~58 this branch started from). Root cause: gave the map image `fetchPriority="high"` on top of the *already* `priority`-tuned first-two restaurant card photos (Wave 1) — three high-priority images now fight over the browser's limited early-bandwidth slot on throttled mobile, at a much heavier payload than the WebP/AVIF card photos. Confirmed via curl against production: 3× `fetchPriority="high"` preloads in the HTML where there used to be 2.
- v2: dropped `scale=2` → non-retina (57KB, confirmed via curl) AND dropped `fetchPriority="high"`, shipped as a single isolated change. **Result: Performance 33 → 44** — better, but still well below the ~58 pre-facade score, so payload size alone isn't the (whole) fix.
- v3: re-added `fetchPriority="high"` on the same 57KB (non-retina) image, same size as v2. **Result: Performance 44 — no change from v2.** Priority alone didn't move it either.
- **VERDICT — REVERTED, do not retry.** Three payload/priority combinations tested (133KB+priority=33, 57KB no-priority=44, 57KB+priority=44) and none beat the ~58 skeleton baseline. The static image never actually became the browser's LCP element — the extra `<img>` fetch (at any size/priority tested) adds TBT/contention without winning the LCP race, so it's a pure cost with no offsetting win. Reverted `app/components/Map.tsx` back to the plain "Loading map…" skeleton, byte-identical to the pre-facade version (verified via `git diff` against commit `1336a5e`). **Do not re-attempt a static-map-under-the-live-map facade for the homepage** — this is now tested and closed, not just theorized (compare to the original, untested DECISION above). All other Wave 1-3 + perf-maps-url changes (browserslist, AVIF/WebP, composited shimmer, `loading=async`, preconnect) are unaffected and stay in place — none of them live in the reverted diff.

### Wave 3 — branch `perf-wave3`. Three safe, behavior-preserving wins + one investigation.
- **`browserslist` field added to `package.json`** (modern evergreen: chrome/edge ≥91, firefox ≥90, safari/ios_saf ≥15). Kept as best practice, but **verified it does NOT shrink chunk 23's polyfill cost as hoped** — traced the `Array.prototype.at`/`flatMap`/`fromEntries` polyfill to `node_modules/next/dist/build/polyfills/polyfill-module.js`, which `next/dist/client/app-index.js` `require()`s **unconditionally** in Next 14.2.3's own App Router client bootstrap, with no browserslist gating. Confirmed via clean rebuild (`rm -rf .next`): chunk hash/size identical before and after the config was added. This ~KB is a Next.js 14.2.3 framework constant, not something project config can remove at this version — don't re-attempt this specific fix without checking if a Next.js upgrade changes it.
- **`images.formats: ['image/avif', 'image/webp']`** added to `next.config.js`/`.mjs` — first-party restaurant card photos (the ~50KiB win) now get modern-format negotiation. Does not touch Google's own map tiles (third-party, can't control their delivery).
- **Shimmer fix**: `MapInner.tsx`'s loading shimmer switched from animating `background-position` (non-composited, paint-triggering) to `transform: translateX(...)` on a pseudo-element (composited/GPU). Same visual sweep effect, cheaper.
- **Preconnect**: added `<link rel="preconnect" href="https://maps.googleapis.com">` to `app/page.tsx` (homepage only, not root layout — other routes never load Maps). Checked first whether `fonts.gstatic.com` needed one too — it doesn't: `next/font` fully self-hosts (confirmed `@font-face src` in built CSS points to `/_next/static/media/*.woff2`, our own domain, zero runtime Google Fonts CDN requests), so that preconnect would've been dead weight and was skipped.

## 2026-07-29 — Vercel Image Optimization quota spike (self-inflicted by perf testing, NOT real traffic)

### Symptom
Fast Data Transfer, Fast Origin Transfer, and Image Optimization usage jumped 10-20x over Jul 25-29, Image Optimization hit 75% of the Hobby free-tier quota, despite real traffic staying flat (~44 users, one live deal).

### Root cause
Wave 1 (commit `32af998`, Jul 26) switched restaurant card photos from a plain `<img>` (browser fetches Supabase URLs directly, zero Vercel cost) to `next/image` — the first point this project ever generated Vercel Image Optimization usage. That alone is normal and expected. What turned it into a quota-eating spike was three compounding factors, all shipped in the same ~30-hour window:
1. **`images.minimumCacheTTL` was never set, so it defaulted to Next's 60 seconds.** Every cache miss after 60s re-runs (and re-bills) the transformation, even though restaurant photos never change once uploaded.
2. **`images.formats: ['image/avif', 'image/webp']`** (Wave 3, `7686fd8`) doubled the format fan-out — every distinct width now gets optimized twice.
3. **~8 perf-related commits/redeploys in ~30 hours** (Wave 1 → Wave 2 → Wave 3 → the static-map-facade experiment and its revert), each verified across multiple devices/browsers/viewports. With `sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"` and Next's default 8-entry `deviceSizes`, a single card photo could generate up to 10 candidate widths × 2 formats = 20 distinct transformation units — and our own QA reloading the homepage repeatedly past the 60s cache window is what actually consumed the quota. The "44 users" number is irrelevant here; the metric bills per unique (image × width × format) transformation, not per visitor, and testing traffic dwarfed real traffic in that window.

**This was NOT a scaling problem or a sign of real-traffic growth — don't reopen it as one in a future session.** It was Next's cache-TTL default colliding with rapid perf-iteration testing.

### Fixes shipped (branch `perf-image-quota`)
- `next.config.js`: `minimumCacheTTL: 31536000` (1 year — restaurant photos are immutable once uploaded, a re-upload replaces the same storage path). This is the single highest-value change.
- `next.config.js`: dropped AVIF, kept `formats: ['image/webp']` only — halves the format fan-out for ~10% more bytes, correct trade for a low-traffic site.
- `next.config.js`: `deviceSizes` trimmed from Next's default `[640,750,828,1080,1200,1920,2048,3840]` to `[640,750,828,1080,1200,1920]`. Verified first that this doesn't fight the `sizes` attribute on the homepage cards (`app/HomeClient.tsx`) — `sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"` already matches the Tailwind grid breakpoints exactly (`md`=768px, `lg`=1024px) — and that the card's real max rendered width (~845px at `lg:33vw` on a very wide screen) × 2 DPR (~1690px) is comfortably under the 1920 ceiling kept in the array. 2048/3840 were unreachable for this layout and only multiplied transformation count. No changes needed to the `sizes` string itself — it was already correct.
- Deleted `next.config.mjs` (duplicate of `next.config.js`, had drifted into a maintenance footgun where two files needed manual sync). Confirmed via Next 14.2.3's own config loader (`node_modules/next/dist/server/config.js`, `CONFIG_FILES = ["next.config.js", "next.config.mjs"]`, first match wins) that `.js` was always the one actually loaded — kept it, moved all settings there.
- `app/page.tsx`: `export const dynamic = 'force-dynamic'` + `cache: 'no-store'` → `export const revalidate = 60` + `next: { revalidate: 60 }` on the Supabase fetch. **Tradeoff, so it isn't mistaken for a bug later: a restaurant edit, deal toggle, or exclusive-flag change can now take up to 60 seconds to appear on `/` and `/claim`** (same component, `app/claim/page.tsx` re-exports `app/page.tsx`). Acceptable for a lunch directory. In practice the delay is often shorter than 60s for anyone with the tab already open — `HomeClient`'s existing focus-triggered refetch (`window.addEventListener('focus', refreshRestaurants)`) live-refetches via the browser Supabase client regardless of this page-level cache. `app/admin/page.tsx` is a separate `'use client'` route that always fetches live via the browser Supabase client — **not affected by this change, admin edits still show live in the admin UI itself.**

### What happens if the Image Optimization quota is hit again (Hobby plan, confirmed via Vercel docs)
- Hobby included: 5,000 image transformations/month, 300K cache reads/month, 100K cache writes/month.
- Past the limit: **new images fail to optimize and return a 402**, which fires `next/image`'s `onError` and falls back to showing the `alt` text (broken-looking image, not a full outage) — **it does NOT silently serve unoptimized full-size originals**. Already-cached/previously-optimized images keep working fine, no error. No overage charge on Hobby (Image Optimization billing only applies on Pro+); this is a hard functional degradation, not a surprise bill.
- If this recurs: check the Vercel dashboard's Image Optimization usage graph against deploy timestamps first — it's almost certainly another testing-cadence spike, not real traffic, until proven otherwise.

### Current PageSpeed baseline, confirmed 2026-07-29 against real production — supersedes the old 46/LCP-9.8s number above
Re-ran PSI mobile after the Image Optimization quota fixes shipped. First attempt looked alarming — Performance 46, LCP 9.8s, TBT 580ms, CLS 0.166 — but that report turned out to be **stale or against the wrong domain**, an exact match to the pre-Wave-1 baseline from before any perf work shipped (TBT 580ms in particular can't recur; Wave 1's Maps-script-deferral fix has been live in production since Jul 26 and nothing since has touched it). Re-run explicitly against production confirmed the URL:
- `https://www.letsgetlunch.nyc/` (mobile): **85**
- `https://letsgetlunch.nyc/` (mobile): **86**
- Desktop: **88**

So mobile is actually on par with desktop now, not the 46 the stale report showed. **Don't trust a PSI report that shows TBT anywhere near 580ms or a Performance score near 46 without first confirming it's a fresh run against `www.letsgetlunch.nyc` or `letsgetlunch.nyc`** — Google Maps' JS is referrer-locked to those two domains and silently no-ops elsewhere (e.g. `*.vercel.app` previews), which alone is enough to reproduce numbers this far off from real production.

**Consequence for future sessions**: with mobile already at 85-86, there is no live LCP/perf problem to chase right now. A proposal came up this session to add an LGL-logo background placeholder behind the map (mobile-only) to improve LCP — correctly shelved once the real 85-86 numbers came in, since it'd be solving a problem that no longer exists. Don't resurrect it unless a *freshly confirmed* production PSI run against the right domain shows a real regression first.

## 2026-07-30 — Image Optimization quota, round 2: closed a leak, did the actual math, answered "can we go back to free?"

### Recap of root cause (for anyone landing on just this section)
The Jul 29 spike was `images.minimumCacheTTL` defaulting to Next's 60s (every cache miss re-billed a transformation for photos that never change) x `deviceSizes` still at Next's default 8 entries x `formats` set to both AVIF+WebP (2x fan-out) x ~8 perf-testing redeploys/commits in a ~30-hour window (Wave 1 -> Wave 2 -> Wave 3 -> static-map-facade experiment + revert), each reloaded repeatedly across devices during QA. Real traffic (~42-44 users) was flat and irrelevant to the spike — this was self-inflicted by testing cadence, not scaling. `af2be5d` (Jul 29) shipped the headline fixes: `minimumCacheTTL: 31536000` (1 year), `formats: ['image/webp']` only, `deviceSizes` trimmed to `[640,750,828,1080,1200,1920]`, and deleted the dead `next.config.mjs` duplicate.

### Bug found in the Jul 29 fix: the deviceSizes trim didn't actually reduce the bucket count
`af2be5d` trimmed `deviceSizes` from 8 entries to 6 but never touched `imageSizes` (left at Next's default `[16,32,48,64,96,128,256,384]`). Next's `getWidths()` (`node_modules/next/dist/shared/lib/get-img-props.js`) builds the responsive srcset from `allSizes = [...deviceSizes, ...imageSizes]`, filtered down to `s >= deviceSizes[0] * (smallest vw% in the sizes attr)`. With `deviceSizes[0]=640` and the card's `sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"` (smallest % = 33), the cutoff is `640*0.33 ≈ 211px`. Two of the default imageSizes entries (256, 384) clear that bar and leaked straight back into the srcset — so the *real* bucket count after `af2be5d` was still **8**, identical to stock Next, just different numbers. Verified this with a standalone simulation of `getWidths()` before touching anything (see `perf-image-quota-round2` branch, commit `995a708`).

**Fix**: set `imageSizes: []` explicitly. No component in this app renders `next/image` with a fixed `width` prop — `HomeClient.tsx`'s card photo is the only one that goes through the optimizer at all (`fill` + `sizes`), and the two `next/image` usages in `list-your-restaurant/page.tsx` both pass `unoptimized`. So `imageSizes` has no legitimate role here; the empty array isn't a placeholder, it's correct. Re-simulated `getWidths()` after the change: resulting widths `[640, 750, 828, 1080, 1200, 1920]`, count 6, confirmed.

### Then went further: measured the actual photo corpus and cut deviceSizes to 3
Rather than reason from CSS/DPR math alone, sampled 23 real objects from the `restaurant-photos` Supabase bucket via range-request reads of their PNG/JPEG headers. Result: source images cap out around **~1000-1280px wide** (one 1777px outlier in the sample). Next's optimizer resizes `withoutEnlargement: true` (`node_modules/next/dist/server/image-optimizer.js:473`) — it never fabricates pixels — so requesting any bucket above ~1280 returns **byte-identical output** to the 1280 bucket for nearly every photo in the corpus, while still billing as a separate transformation. Confirmed this directly against production: requesting the same photo at `w=640`, `w=828`, and `w=1280` decoded to 640x480, 828x621, and 1000x750 (capped, not upscaled) respectively — real distinct resizes at the bottom two, correct native-cap behavior at the top.

Cut `deviceSizes` from `[640,750,828,1080,1200,1920]` (6) to **`[640, 828, 1280]`** (3) — one bucket per `sizes`-attribute tier (100vw / 50vw / 33vw). The fixed `h-44` card thumbnail never needs more than ~1280px regardless of source resolution, so this ceiling holds even against future higher-res vendor uploads — it's a layout-driven ceiling, not a corpus-specific hack that'll need revisiting.

Shipped as two sequential branches, each pushed and confirmed to reach a successful Vercel deployment (via GitHub's commit-status API, since this session had no Vercel CLI/dashboard auth) before merging to `main`:
- `perf-image-quota-round2` (`995a708`) — the `imageSizes: []` leak fix.
- `perf-image-quota-tighten-buckets` (`f44cc0f`) — the 6->3 `deviceSizes` cut.

Verified on production after merge: the homepage's card `srcset` now requests exactly `640w, 828w, 1280w` (confirmed via the deployed page's HTML, matched against the live `dpl=` deployment ID) — no leaked 256/384, no stale 1080/1200/1920.

### The math (what the user actually asked to see before trusting a plan downgrade)
**453** unique active restaurants have a non-null `photo_url` (queried directly: `is_active=true` count = 453, matches the non-null-photo count exactly — every active restaurant has a photo) x **3** deviceSizes buckets x **1** format (webp) =

**1,359 transformations/month steady state — 27% of the 5,000 Hobby quota.**

(For reference: the imageSizes-leak-fixed-but-not-bucket-tightened state would have been 453 x 6 x 1 = 2,718/mo, 54% — already technically "comfortable," but the corpus-resolution evidence made 3 buckets a strictly-better free lunch, not a quality compromise.) This is a one-time-per-image-per-bucket-per-format cost under the 1-year TTL — it does not recur monthly unless new images are added or the cache is invalidated (see below). 453 restaurants have grown from 280 in ~2.5 months (May 21 -> Jul 30); even if that pace continued for another 6 months (~900 restaurants), 900 x 3 = 2,700 — still comfortably under 5,000. Room to roughly triple the current photo count before the 3-bucket config alone would threaten the quota.

### What actually busts a cached image variant (confirmed against Vercel's docs, not assumed)
- **A new deploy does NOT invalidate the image cache.** Vercel's remote-image cache key is `{Project ID, q, w, url, normalized Accept header}` — no deployment ID or build hash is part of it. Redeploying constantly (as this project's own Jul 26-29 incident proved) doesn't itself burn quota; what burns quota is the *code* requesting new `w`/`url`/format combinations it hasn't requested before, which is exactly what changing `next.config.js`'s `formats`/`deviceSizes`/`imageSizes` does on the next deploy.
- **What actually invalidates/re-bills**: (1) TTL expiry — `minimumCacheTTL` (now 1 year) vs. the upstream `Cache-Control: max-age` from Supabase storage, whichever is **larger**, wins; (2) a manual or programmatic CDN purge; (3) the source `url` changing (Supabase re-uploads to the *same* storage path keep the same URL, so a photo swap does **not** get a fresh cache key — the old cached bytes will keep serving for up to a year unless someone manually purges. Worth knowing: if a restaurant's photo is ever replaced, it won't visually update on the site until the TTL lapses or someone purges the CDN cache by hand.)
- **The real quota risk going forward is config churn, not deploy frequency.** Every time `formats`, `deviceSizes`, or `imageSizes` changes, the *next* set of requests asks for width/format combinations that have never been cached before — guaranteed fresh MISS billing for every unique image x new-bucket combination, all over again. Two tightening passes in this session (995a708, f44cc0f) each did exactly that once, deliberately, with the math shown above. **Do not repeatedly tweak these three settings** — treat the current `[640, 828, 1280]` / `webp` / 1-year-TTL config as settled unless the photo corpus, the card layout, or the measured transformation count changes materially. Casual re-tuning "just to see" is precisely the kind of testing-driven churn that caused the original incident.

### `images: { unoptimized: true }` — considered and rejected as a permanent setting, with real numbers
Measured directly against production rather than guessing: sampled 8 restaurant photos, compared their raw Supabase original size to the actual WebP bytes the site would serve at a representative mobile card width (`w=750, q=75`, `Accept: image/webp`):

| | avg bytes | range |
|---|---|---|
| Raw original (Supabase) | ~804 KB | 122 KB – 1.66 MB |
| Optimized WebP @750w (current config) | ~49 KB | 19 KB – 102 KB |

**~16x more bytes per card photo with `unoptimized: true`.** The originals are mostly unresized upload-time dumps (several are 1-1.6MB PNGs); `unoptimized: true` would mean the browser downloads the *full* original for every card regardless of the small `h-44` display size — on a homepage grid showing many cards, that's a severe mobile payload/LCP regression, undoing the exact perf work (`32af998` Wave 1, mobile PageSpeed now 85-86) that started this whole chain. `unoptimized: true` is zero transformations forever and immune to quota problems, but for *this* photo corpus it trades a comfortably-solved $0 quota problem for a real, guaranteed performance regression. Not recommended. It would only make sense if the photos were already small/pre-optimized (they aren't) or if this were a low-traffic admin-only tool where byte size doesn't matter (it isn't — this is the public homepage).

### Bottom line for "can I drop back to the free Hobby tier?"
Yes. 1,359/mo steady-state (27% of quota) comfortably covers current scale and several months of the observed growth rate, the config is verified live on production (srcset confirmed as `640w/828w/1280w`, images confirmed not upscaled), and the actual root cause (60s default TTL colliding with rapid perf-test redeploys) is fixed regardless of bucket count. The one operational habit to keep: don't let a future perf-testing spree touch `next.config.js`'s image settings repeatedly in a short window without checking the math first — that's the only way this recurs.

## 2026-08-02 — Newsletter: "Send as announcement" (built with Claude Code)

### Shipped, merged to main (branch `newsletter-announcement`, commit `66040db`)
Admin can now send a published newsletter post as a one-off email announcement from `/newsletter/admin`, without turning posts into a stateful "announcement" type — sending is an explicit action, not a flag on the post.

- **Schema**: added two nullable columns to `posts` — `announcement_sent_at timestamptz`, `announcement_recipient_count integer`. Run by hand against Supabase (this repo has no migration tool — same convention as every prior schema change here). `NULL` sent_at = never sent; a resend just overwrites both columns, no separate send-history table (wasn't asked for).
- **Recipient logic** (`lib/announcementRecipients.ts`, `getAnnouncementRecipients()`): single shared query used by both new routes, so the confirmation count and the actual send can never disagree. Combines the two suppression mechanisms that already existed independently in this codebase and had never been combined before: `profiles.email_frequency != 'off'` and the `unsubscribes` table (matching the exact `.trim().toLowerCase()` comparison already used in `/api/reserve` and `/api/claim`).
- **Routes**: `POST /api/admin/posts-announcement-preview` (read-only, returns recipient count for the confirm step) and `POST /api/admin/posts-send-announcement` (re-verifies password, re-resolves recipients server-side — never trusts a client-supplied count, rejects unpublished posts since the email links to `/newsletter/[slug]` which 404s until published, sends via the existing raw-fetch Resend pattern in batches of 5, records `sent_at`/count). Both password-gated the same way as every other `app/api/admin/*` route.
- **Email**: links back to the live `/newsletter/[slug]` page instead of duplicating the post body. Footer includes both the existing `/unsubscribe?email=` link (same pattern as `claimEmail()` in `/api/claim`) and the token-based `/email-preferences?token=` link — the latter wasn't in any prior email template but is exactly the mechanism this feature depends on, so added it.
- **Admin UI**: two-step confirm (mirrors the existing Delete button's confirm/cancel pattern) showing live recipient count before sending. Once sent, button becomes "Sent on [date] · N recipients" with a separate explicit "Resend" action — can't be fired accidentally twice.

### Verified against production before merging
Ran the actual `getAnnouncementRecipients()` query directly (service-role key, read-only) rather than trusting the code by inspection alone: 46 profiles eligible at baseline. Toggled one real profile's `email_frequency` to `off` via the live `/email-preferences` page (production, pre-existing feature) — count dropped to 45, that profile's email correctly absent from the list. Toggled back to `weekly` — count returned to 46. Confirmed via GitHub commit-status/Vercel dashboard (no working `vercel` CLI auth in this session) that the branch's preview deployment reached Ready before merging.

### Note for the next person touching this area
Sending doesn't touch `posts.published` or any other existing column — a post can be edited after being announced (title/body typos etc.) without re-triggering a send or losing the `sent_at` record, since announce state is fully decoupled from post content by design.

## 2026-08-02 — Restaurant slugs: human-readable /restaurants/[slug] URLs (built with Claude Code)

### Shipped, merged to main (branch `restaurant-slugs`)
`/restaurants/[uuid]` → `/restaurants/[slug]` (e.g. `/restaurants/mamazul`). UUID stays the internal primary key everywhere (deals, reservations, claims) — only the URL changed.

- **Schema**: `restaurants.slug text` + `CREATE UNIQUE INDEX restaurants_slug_key ON restaurants (slug)`. Run by hand against Supabase, same no-migration-tool convention as every other schema change here.
- **Slug generator** (`lib/restaurantSlug.ts`, `generateUniqueSlug()`): name → collision → `+neighborhood` → collision → numeric suffix. Reuses the exact slugify regex already in `app/newsletter/admin/page.tsx` rather than inventing a second one. Empty-name edge case (name is entirely punctuation/non-Latin script) falls back to the literal string `'restaurant'`, then goes through the same collision chain — checked this specifically before running the backfill; turned out 0 of the 483 real restaurant names actually hit that path, but the fallback is there regardless.
- **Backfill** (`scripts/backfill-restaurant-slugs.mjs`): one-time, idempotent — only ever touches `slug IS NULL` rows, so a rerun never regenerates an existing slug (slugs are stable across later name/neighborhood edits, as required). Ran against production: **483/483 rows backfilled, 0 errors.** Verified independently afterward (not just trusting the script's own summary) — 0 NULL, 0 empty, 483/483 distinct slugs.
- **Redirect**: `/restaurants/[slug]/page.tsx` resolves either a slug or a legacy UUID via one `React.cache()`'d lookup (shared with `generateMetadata` so the happy path is a single DB round trip). If the param matches an `id` but not a `slug`, it issues `permanentRedirect()` — **308**, not literally 301 (Next.js App Router has no built-in 301; Google treats 308 the same for SEO/link-equity purposes, confirmed as acceptable before building). Verified against a real link already emailed to a partner restaurant (Miru, `709fb939-9b42-43b5-8ff3-1cc5cb7a55d0` → redirects to `/restaurants/miru`) — old links restaurants received keep working, they just land on the new URL.
- **New listings generate a slug at creation time**: `app/api/admin/add-listing/route.ts` and `app/api/admin/approve-vendor/route.ts` both call `generateUniqueSlug()` before inserting. Without this, anything added after the backfill would have `slug = NULL` and 404 forever — wasn't in the original ask but is a direct consequence of making slug the lookup key.
- **Every other place a restaurant UUID appeared in a URL**, updated to use slug: `HomeClient.tsx` card links, `sitemap.ts`, `admin/page.tsx`'s listing deep-link, and `app/lookup/page.tsx` (Olga's internal tool for copying a restaurant's live link — found during a final grep sweep, not in the original spec).

## 2026-08-02 — Newsletter post slugs: auto-generate + lock once published (built with Claude Code)

### Shipped, merged to main (branch `newsletter-slug-autofill`)
`/newsletter/admin`'s slug field now auto-derives from the title (reusing the existing `slugify()`, not a new one) while a post is a draft, with manual override and numeric-suffix collision avoidance. Once a post has ever been published, the slug is locked for good.

- **Draft behavior**: typing the title auto-fills the slug via `uniqueSlug(slugify(title), posts, form.id)` (new helper in `app/newsletter/admin/page.tsx`) unless the admin has manually edited the slug field this session (`slugTouched`), which matches the pre-existing new-post behavior — the only change is this now also applies when *editing* an existing unpublished post, not just creating a new one. Collisions get `-2`, `-3`, etc. appended, checked against the already-loaded posts list (client-side, same risk tolerance as the rest of this admin tool — a true race still gets caught by the DB's unique constraint).
- **Reopening a draft**: on `startEdit`, if the stored slug doesn't match a fresh `slugify(title)` — i.e. it was manually customized — auto-tracking stays off for that post; otherwise further title edits keep regenerating it. Avoids clobbering a deliberately-chosen "tighter SEO slug" the next time the admin reopens the post.
- **Lock condition — not literally `post.published`**: locks if the post has *ever* been published (`published_at` is set — persists even if later unpublished, per this table's existing update semantics) OR is being published in the current save. Chosen deliberately over gating on the live "Published" checkbox alone: the stated risk is already-indexed/already-emailed URLs, and those don't stop being indexed/emailed just because someone toggles a post back to draft later. UI: slug `<input>` goes `disabled` with an inline "Locked — this post has been published" note.
- **Server-side enforcement** (`app/api/admin/posts-update/route.ts`): the same lock condition is re-checked server-side and any client-supplied slug is discarded in favor of the existing DB value when locked — closes the gap where a stale/buggy client could otherwise still smuggle a slug change through directly against the API.

### Verified without browser tooling (unavailable this session — flagged explicitly rather than skipped silently)
Ran the actual dev server and hit the real `posts-create`/`posts-update` API routes directly via `curl`: confirmed a request that publishes a post while also sending a different slug gets the slug silently ignored server-side; confirmed the lock persists after subsequently unpublishing that same post; confirmed a never-published draft's slug still updates freely; confirmed the collision-suffix logic against the exact shipped `slugify()`/`uniqueSlug()` functions (copy-pasted verbatim from the file, not reimplemented from memory, after catching a typo in a first draft of the test itself). Test posts created during this were deleted afterward.

## 2026-08-02 — Newsletter announcement email: full post inline + image optimization + test send (built with Claude Code)

### Shipped, merged to main (branch `newsletter-full-content-email`)
Reverses the original announcement-email design on purpose, per explicit request: the very first version of this feature (see "Send as announcement" entry above, same day) deliberately linked back to the live post instead of duplicating the body. The full post — cover image, headline, markdown body — now renders inline in the email instead.

- **Template extracted** to `lib/announcementEmail.ts` (`announcementEmailHtml()`, `announcementEmailSubject()`), shared by both `posts-send-announcement` and the new `posts-send-test` route so the real send and the test send can never drift apart in content.
- **Body**: rendered via `marked.parse(post.body, { async: false })` — the exact same call already used on the live `/newsletter/[slug]` page, not a second markdown pipeline. Basic tag styling for the body lives in a `<style>` block scoped to `.post-body` (headings, links, images, lists, blockquotes) — a pragmatic choice given this codebase has never used a proper email-CSS-inliner or MJML; flagged as a real (if minor) email-client-compatibility tradeoff, not an oversight.
- **Cover image**: no longer sent at full size — the email `<img>` src points at the site's own existing Next.js image optimizer, `/_next/image?url=<cover>&w=640&q=70` (640 = the smallest bucket already configured in `next.config.js`'s `deviceSizes` from the July 30 image-quota work — reused, not reinvented). Verified against production before shipping: a real post's cover photo went **484KB → 47KB**, served as `image/jpeg` (Next's format negotiation naturally falls back away from WebP when the requester's Accept header doesn't claim support for it, which is exactly the safe behavior for email client compatibility — confirmed via `curl`, not assumed).
- **Test send** (`app/api/admin/posts-send-test/route.ts`, new): sends the identical template to a single hardcoded address, `brian@letsgetlunch.nyc`, subject prefixed `[TEST]`. Does not touch `announcement_sent_at`/`announcement_recipient_count` and does not require the post to be published (previewing before publish is the point). The real send's recipient logic (`getAnnouncementRecipients`) was not touched by this change at all. Admin UI gets a new "Send test to me" button per post, independent of the existing Send-as-announcement/Resend controls.

### Verified before merging
No browser tooling available this session (flagged rather than skipped) — verified instead by: (1) hitting the live production image optimizer directly via `curl` for a real post's cover image and confirming the 484KB->47KB reduction and JPEG content-type; (2) rendering the actual `lib/announcementEmail.ts` template function against real post data (copy-paste verbatim, not reimplemented) and inspecting the output HTML directly; (3) publishing that rendered output as a visual before/after preview artifact for the user to review ahead of the real in-inbox test send.

## 2026-08-02 — Announcement email: reduce-frequency nudge + first-person sign-off (built with Claude Code)

### Shipped, merged to main (branch `newsletter-email-frequency-nudge`)
Footer previously showed "Unsubscribe · Email preferences" as two equal-weight links — no reason not to just hit unsubscribe. Now: a prominent boxed CTA ("Getting these too often? Switch to weekly or monthly." + a **Change email frequency** button) up top, and a small plain-text **Unsubscribe completely** link underneath. Neither link's *destination* changed — `/email-preferences?token=...` and `/unsubscribe?email=...` are exactly what they were, only the visual/copy emphasis moved. Also: sign-off changed from "- The Let's Get Lunch team" to "- Brian" (solo founder, first person) — **scoped to this email only**, by explicit confirmation; the same "team" sign-off still appears in `/api/claim` and `/api/reserve`'s emails and was deliberately left alone.

### Verified against production before merging (not assumed from reading the API routes)
- Read the actual source of `app/email-preferences/page.tsx` and `app/unsubscribe/page.tsx` directly — confirmed neither has any login/session check, both are pure token/email flows. Preferences page presents all four options (Daily/Weekly/Monthly/Off) as one-click buttons.
- Pulled a **real** subscriber's actual `email_pref_token` from `profiles` (not the `'test'` placeholder `posts-send-test` uses) and round-tripped it against the live `/api/email-preferences` API: read `weekly` → changed to `monthly` → confirmed persisted → restored to `weekly`.
- Hit the live `/api/unsubscribe` endpoint with a disposable throwaway address (`claude-verification-test-<timestamp>@example.com`, not a real subscriber) to confirm the write path works, then deleted that row — no real subscriber was touched by this verification.
- Note for later: `/unsubscribe` fires automatically on page load, no confirm click (correct — matches Gmail/Yahoo's one-click-unsubscribe requirement) — anyone testing this flow again should verify via direct API call with a disposable address, same as above, not by loading the page URL for a real subscriber.

## 2026-08-02 — Announcement email: Claim button + quieter frequency nudge (built with Claude Code)

### Shipped, merged to main (branch `newsletter-email-claim-button-and-footer`, no preview step this round per explicit instruction)
Two changes to `lib/announcementEmail.ts`:
- **Frequency nudge demoted further**: the boxed CTA from the previous round (bold 15px heading + full blue button) is now small muted inline footer text (`#999`, 11px) — "Getting these too often? Switch to weekly or monthly." with "Change email frequency" as an inline underlined link, same wording, same destination, matching the existing `#bbb`/11px unsubscribe-line style already in this template rather than inventing a new treatment.
- **Bare restaurant URL replaced with a real button**: posts are authored with a plain `/restaurants/{slug}` link in the body pointing at the deal (existing convention, e.g. the Mamazul post). New `extractRestaurantSlug()` in `lib/announcementEmail.ts` regex-matches that URL, strips it from the body before markdown rendering, and renders a "Claim this exclusive lunch" button (`/restaurants/{slug}`) in its place. **Deliberately not schema-based** — no new `posts.restaurant_id` column, no admin UI dropdown; the slug is derived from each post's own body content at send time, which satisfies "no hard-coding" without a migration. Trade-off worth knowing: this depends on the existing body-URL authoring convention holding — a post with no `/restaurants/...` link in its body simply gets no Claim button (verified with a synthetic no-link body), which is the correct behavior for a non-deal post but means a future author who forgets the link silently loses the button rather than erroring.
- "View this post online" secondary button left completely untouched per explicit instruction.

### Verified before merging (no visual preview this round — explicit instruction mid-task to skip it)
Ran the actual `extractRestaurantSlug()` logic (copy-paste verbatim) against the real Mamazul post body: confirmed it extracts `mamazul`, confirmed the raw URL no longer appears in the cleaned body, and confirmed `mamazul` resolves to a real `is_active: true` row in `restaurants`. Build verified clean before merging; skipped the Vercel-Ready check-in and the artifact preview this round per explicit "just merge to site" instruction — everything else (branch, build, merge, NOTES) followed the same process as every other change this session.

## 2026-08-02 — Announcement email: single clear CTA (built with Claude Code)

### Shipped, merged to main (branch `newsletter-email-hierarchy-pass`)
Fourth pass on the same email template in one day — visual hierarchy pass so exactly one element reads as a real button. In `lib/announcementEmail.ts`:
- **Claim this exclusive lunch** shrunk ~15-18% per dimension (padding `14px/28px` → `12px/24px`, font-size `16px` → `14px`, radius `10px` → `9px`) — still the only colored/filled button on the page.
- **"View this post online"** — was a second full blue button — converted to plain bold black underlined text, relabeled **"View in browser"**. Same destination (`/newsletter/{slug}`), zero color, clearly secondary next to Claim.
- **"- Brian" sign-off** moved from sitting between the CTA row and the frequency nudge to directly after "View in browser" — now closes the message body before the footer block (frequency line, unsubscribe) begins, rather than sitting mid-footer.
- Frequency nudge and unsubscribe link untouched from the previous round, per explicit instruction.

### Process note
Preview artifact was built and published this round (this request did ask to see it), but the user then said mid-task not to bother with previews going forward for newsletter changes — merged straight to `main` on their explicit "just merge and I will test" instruction. Verified via a full local render (copy-paste of the real function against the real Mamazul post) that the DOM order is correct — body → Claim → View in browser → sign-off → frequency → unsubscribe — before merging, same rigor as every other change, just without the extra artifact-publishing step this time.

## 2026-08-02 — Announcement email: sign-off color fix (built with Claude Code)

### Shipped, merged to main (branch `newsletter-email-signoff-color`, no preview per standing instruction)
"- Brian" was styled `#888`/13px (a muted footer-gray, left over from when it sat among the other footer text). Now matches `.post-body p` exactly — `font-family:sans-serif; color:#444; font-size:16px` — so it reads as the close of the message itself, not muted footer chrome. Fifth pass on this template today; every change stayed inside `lib/announcementEmail.ts`.

## 2026-08-02 — Homepage newsletter link + email signup on /newsletter (built with Claude Code)

### Shipped, merged to main (branch `homepage-newsletter-link`)
Two pieces:
- **Homepage**: third column added to the existing diners/restaurants CTA section (grid widened `md:grid-cols-2` → `md:grid-cols-3`, `max-w-4xl` → `max-w-5xl`), copy "The newsletter — The best curated lunch specials in NYC. See what's new." + "Read the newsletter →" → `/newsletter`. The reported "vercel.app link" issue turned out to be a non-issue on inspection: the link was already a relative `href="/newsletter"` (grepped the whole codebase for `vercel.app`, zero hardcoded hits anywhere) — a relative link always resolves against whichever domain serves the page, so it was already correct on both preview and production.
- **`/newsletter` page**: new "Get it in your inbox" email signup (`app/newsletter/NewsletterSignup.tsx`, client component) placed below the header, above the post list.

### The non-obvious architecture decision (checked empirically before building, not assumed)
`profiles.id` is FK-constrained to `auth.users(id)` — confirmed by attempting an insert with a random UUID via the service-role key, which failed with a genuine `23503` foreign-key violation. So there's no way to store a lightweight "email-only, no account" newsletter subscriber as a `profiles` row. New signups (`app/api/newsletter-signup/route.ts`) instead create a real, **passwordless** Supabase Auth account server-side via `supabaseAdmin.auth.admin.createUser()` — critically, this is the *admin* API, which sends **no** Supabase auth email, unlike the client-side `signInWithOtp` magic-link flow, which would have. A normal `profiles` row is then inserted for that account with `email_frequency: 'weekly'`. Net effect: every newsletter-only subscriber is a completely ordinary row, picked up by the exact same `getAnnouncementRecipients()`, `/email-preferences`, and `/unsubscribe` machinery as any full account — no parallel subscriber system. The confirmation email is sent through the existing raw-fetch Resend pattern (matching "confirm via the existing Resend setup"), not Supabase's own auth email. Re-submitting the form with an email that already has an account is treated as an explicit re-opt-in — clears `email_frequency='off'` and any row in `unsubscribes`, rather than silently no-op'ing.

### Verified end-to-end against the real running dev server (not isolated scripts)
POSTed to the real `/api/newsletter-signup` route with a fresh disposable email: confirmed a real `profiles` row was created with `email_frequency: 'weekly'` and a real `email_pref_token`, and confirmed it evaluates as eligible under the actual `getAnnouncementRecipients()` logic. Separately set up a throwaway account with `email_frequency: 'off'` **and** a row in `unsubscribes`, re-submitted the same email through the real route, confirmed it flipped back to `weekly` and the `unsubscribes` row was cleared. All test accounts and profiles deleted afterward — nothing left in production data from testing.

### Known gap, not addressed this round
The signup endpoint is public and unauthenticated — no CAPTCHA, no rate limiting, matching the rest of the site's current signup posture (the full `/signup` flow has none either). Worst case if abused: someone else's inbox gets one unwanted confirmation email, which includes a working one-click unsubscribe link. Flagged, not fixed — revisit if it becomes a real problem.
