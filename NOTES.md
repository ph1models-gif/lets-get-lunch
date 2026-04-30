# Let's Get Lunch — Project Notes
**Last updated: April 30, 2026**

## ⚠️ ACTIVE BUGS (UNRESOLVED)

### Bug A — Password reset doesn't log user in
- User requests password reset → receives email → clicks link → enters new password twice → site accepts password BUT navbar still shows "Sign In" (not user's name)
- Likely cause: Supabase session not being set after `updateUser({ password })` call, OR the recovery session isn't being persisted to cookies
- Files to check: /reset-password page, supabase client config

### Bug B — Session doesn't persist between pages
- After signing in on /login, navigating to a restaurant page shows "Sign In" again
- User has to sign in a SECOND time on the reservation modal
- After completing reservation, navbar STILL shows Sign In
- Likely same root cause as Bug A — Supabase session cookie not persisting
- Possibly related to client/server component split or middleware config

### Bug C — Confirmation emails landing in spam
- Email DOES send successfully (Apr 30 test confirmed delivery)
- Lands in Gmail spam folder, not inbox
- Need to verify Resend SPF, DKIM, DMARC records on letsgetlunch.nyc DNS
- Workaround: tell users to check spam and mark "Not Spam"

## ✅ Recently Fixed (Apr 30, 2026)
- Restaurant address now appears in confirmation email (under Restaurant line)
- Admin photo lightbox working — left-click any photo to enlarge (one-finger tap on Mac trackpad). Two-finger tap = right-click = browser context menu, normal browser behavior, not a bug
- Cleaned up duplicate lightbox modal that sed -i accidentally inserted in two places

## Live URLs
- Site: https://www.letsgetlunch.nyc
- Repo: https://github.com/ph1models-gif/lets-get-lunch
- Server: root@openclaw2-1.tail2e11b9.ts.net (password: cawKT79UgEbV)
- Project path: /home/ocuser/.openclaw/workspace/lets-get-lunch
- Admin: /admin (password: lunch2026)

## Tech Stack
- Next.js 14.2.3, TypeScript, Tailwind CSS
- Supabase (DB, Auth, Storage)
- Vercel (auto-deploy on push to main)
- Resend (transactional emails)
- Google Workspace (brian@, hello@, restaurants@letsgetlunch.nyc)
- Supabase custom SMTP through Resend (auth emails)

## How We Work
- SSH into server → edit files → git add -A && git commit && git push
- Vercel auto-deploys on push to main
- python3 patches often get cut off in terminal — verify with grep after
- When python heredocs fail, fall back to sed -i
- ⚠️ sed -i with patterns like </div> can match in MANY places — always verify with grep -c after, or it will inject duplicates
- Always cat existing file before editing
- Always cp file to backups/ before non-trivial edits

## Database
- restaurants: id, name, neighborhood, address, cuisine, bio, work_friendly, walk_in, wifi, seats, hours, is_active, photo_url, photo_urls, lat, lng
- deals: id, restaurant_id, special, price, courses, days (text[] DEFAULT Mon-Fri), is_active
- vendors: id, restaurant_name, contact_name, email, phone, address, neighborhood, cuisine, seats, hours, special, price, work_friendly, wifi, bio, days, message, status, photo_url, photo_urls, created_at
- profiles: id (→auth.users), name, email, phone, neighborhood, dietary_prefs, created_at
- reservations: id, restaurant_id, user_id, name, contact, party_size, preferred_time, note, confirmation_code, code, status, created_at

## Admin Dashboard — 6 Tabs
1. Pending Submissions — vendor cards, Review & Edit (full editable form), Quick Approve, Reject. Photos clickable for lightbox.
2. Active Listings — edit form with all fields. Hide/Delete. Shows contact info from vendors.
3. Reservations — Today/All toggle, summary stats, 🔁 repeat booker badges
4. + Add Listing — direct restaurant creation
5. Users — total signups, joined this week, list with name/email/neighborhood/date
6. Contacts — all vendor submissions with clickable mailto/tel links

## Working Features
- Homepage map with price pins, neighborhood search, cuisine filters, laptop/wifi checkboxes, price slider, day-of-week filtering
- Detail page with photos, deal card, days badge, address, share button, Reserve button
- Reservation modal (4 states: book → password → signin → success) with QR code in email
- Auth-aware navbar
- Login page with split First/Last name, strong password validation
- /signup standalone page for sharing
- /reset-password full flow (BUT see Bug A)
- Vendor signup form
- Confirmation email from hello@letsgetlunch.nyc with QR, address line, unsubscribe footer
- Custom blue dot favicon
- Hours range 10:30am–4:30pm
- Admin photo lightbox (click thumbnails to enlarge full-size)

## V1 PENDING TODO
1. FIX Bug A — password reset auto-login
2. FIX Bug B — session persistence across pages
3. FIX Bug C — email deliverability (SPF/DKIM/DMARC)
4. Photos on 8 original seeded restaurants
5. QR code on success screen in modal
6. Scannable /confirm/[code] page with security token
7. Manual code lookup in admin

## V2 ROADMAP
- User profile page
- Restaurant notification emails
- Redemption analytics
- Repeat customer loyalty
- Tracked referral codes
- Welcome email
- SEO meta tags
- Soft delete
- Static QR at host stand
- PWA wrapper

## Password Rules
- Min 8 chars, 1 uppercase, 1 number, 1 symbol

## Key Decisions
- Two-step modal (book then password) for conversion
- Login defaults to Sign In tab
- Email aliases over separate accounts
- Stay on Google Workspace
- "Today" default in reservations with All Time toggle
