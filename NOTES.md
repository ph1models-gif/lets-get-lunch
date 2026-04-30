# Let's Get Lunch — Project Notes
**Last updated: April 30, 2026 (evening)**

## ✅ Recently Fixed (Apr 30, 2026)
- **Auth navbar bug (Bugs A + B)** — homepage and restaurant page navbars now correctly show "Hi, [name]" when logged in, "Sign In" when not. Root cause was missing conditional rendering on homepage navbar + missing auth state listener. Fix: added supabase.auth.onAuthStateChange() to both pages, made navbar conditional on userFirstName.
- Restaurant address now appears in confirmation email (under Restaurant line)
- Admin photo lightbox working — left-click any photo to enlarge. Two-finger tap = right-click context menu, normal browser behavior.
- Cleaned up duplicate lightbox modal that sed -i accidentally inserted twice

## ⚠️ ACTIVE BUGS (UNRESOLVED)

### Bug C — Confirmation emails landing in spam
- Email DOES send successfully
- Lands in Gmail spam folder, not inbox
- Need to verify Resend SPF, DKIM, DMARC records on letsgetlunch.nyc DNS
- Workaround: tell users to check spam and mark "Not Spam"

### Bug D (NEW) — Signup not saving email to profiles table
- Discovered Apr 30: profile rows created on signup are missing email field (NULL)
- Email IS saved correctly to auth.users (login works fine)
- ~half of existing profile rows are missing emails — long-running bug
- Cosmetic only — doesn't affect login/auth, but means we can't query users by email from profiles table
- Fix likely in /signup or /login signup handler — need to add email to profile insert

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
- Homepage map with price pins, neighborhood search, cuisine filters,
cat > /home/ocuser/.openclaw/workspace/lets-get-lunch/NOTES.md << 'NOTESEOF'
# Let's Get Lunch — Project Notes
**Last updated: April 30, 2026 (evening)**

## ✅ Recently Fixed (Apr 30, 2026)
- **Auth navbar bug (Bugs A + B)** — homepage and restaurant page navbars now correctly show "Hi, [name]" when logged in, "Sign In" when not. Root cause was missing conditional rendering on homepage navbar + missing auth state listener. Fix: added supabase.auth.onAuthStateChange() to both pages, made navbar conditional on userFirstName.
- Restaurant address now appears in confirmation email (under Restaurant line)
- Admin photo lightbox working — left-click any photo to enlarge. Two-finger tap = right-click context menu, normal browser behavior.
- Cleaned up duplicate lightbox modal that sed -i accidentally inserted twice

## ⚠️ ACTIVE BUGS (UNRESOLVED)

### Bug C — Confirmation emails landing in spam
- Email DOES send successfully
- Lands in Gmail spam folder, not inbox
- Need to verify Resend SPF, DKIM, DMARC records on letsgetlunch.nyc DNS
- Workaround: tell users to check spam and mark "Not Spam"

### Bug D (NEW) — Signup not saving email to profiles table
- Discovered Apr 30: profile rows created on signup are missing email field (NULL)
- Email IS saved correctly to auth.users (login works fine)
- ~half of existing profile rows are missing emails — long-running bug
- Cosmetic only — doesn't affect login/auth, but means we can't query users by email from profiles table
- Fix likely in /signup or /login signup handler — need to add email to profile insert

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
- Auth-aware navbar with real-time updates (sign in/out reflects instantly)
- Login page with split First/Last name, strong password validation
- /signup standalone page for sharing
- /reset-password full flow (now works end-to-end with the navbar fix)
- Vendor signup form
- Confirmation email from hello@letsgetlunch.nyc with QR, restaurant address, unsubscribe footer
- Custom blue dot favicon
- Hours range 10:30am–4:30pm
- Admin photo lightbox (click thumbnails to enlarge full-size)

## V1 PENDING TODO
1. FIX Bug C — email deliverability (SPF/DKIM/DMARC in Resend dashboard)
2. FIX Bug D — signup needs to save email to profiles table
3. Photos on 8 original seeded restaurants
4. QR code on success screen in modal
5. Scannable /confirm/[code] page with security token
6. Manual code lookup in admin

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
- Auth uses Supabase localStorage (default) — works because all auth-checking pages are 'use client'
