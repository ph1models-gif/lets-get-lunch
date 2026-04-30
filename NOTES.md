# Let's Get Lunch — Project Notes
**Last updated: April 30, 2026**

## ⚠️ ACTIVE BUG (UNRESOLVED)
**Admin photo lightbox not consistently working.**
- User reports clicking photos in admin panel sometimes opens lightbox, sometimes doesn't
- Lightbox code IS in admin/page.tsx (verified at end of file with tail -20)
- State variable `lightboxUrl` exists at line 189
- Click handlers added to: vendor review photos, active listing photos
- Photos enlarged from 96px to 160x128px
- stopPropagation added
- User screenshot showed right-click context menu — needs to confirm left-clicking
- Last test was on Pending Submissions Review & Edit form
- Console shows NO errors when clicking — clicks not reaching handler

**Files involved:**
- /home/ocuser/.openclaw/workspace/lets-get-lunch/app/admin/page.tsx
- Lightbox modal at end of file (lines ~870)
- Click handlers around lines 680-685

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
- Always cat existing file before editing

## Database
- restaurants: id, name, neighborhood, address, cuisine, bio, work_friendly, walk_in, wifi, seats, hours, is_active, photo_url, photo_urls, lat, lng
- deals: id, restaurant_id, special, price, courses, days (text[] DEFAULT Mon-Fri), is_active
- vendors: id, restaurant_name, contact_name, email, phone, address, neighborhood, cuisine, seats, hours, special, price, work_friendly, wifi, bio, days, message, status, photo_url, photo_urls, created_at
- profiles: id (→auth.users), name, email, phone, neighborhood, dietary_prefs, created_at
- reservations: id, restaurant_id, user_id, name, contact, party_size, preferred_time, note, confirmation_code, code, status, created_at

## Admin Dashboard — 6 Tabs
1. **Pending Submissions** — vendor cards, Review & Edit button (full editable form), Quick Approve, Reject. Photos clickable for lightbox (BUGGY)
2. **Active Listings** — edit form with all fields. Hide/Delete. Shows contact info from vendors
3. **Reservations** — Today/All toggle, summary stats, 🔁 repeat booker badges
4. **+ Add Listing** — direct restaurant creation
5. **Users** — total signups, joined this week, list with name/email/neighborhood/date
6. **Contacts** — all vendor submissions with clickable mailto/tel links

## Working Features
- Homepage map with price pins, neighborhood search, cuisine filters, laptop/wifi checkboxes, price slider, day-of-week filtering
- Detail page with photos, deal card, days badge, address, share button, Reserve button
- Reservation modal (4 states: book → password → signin → success) with QR code in email
- Auth-aware navbar
- Login page with split First/Last name, strong password validation
- /signup standalone page for sharing
- /reset-password full flow
- Vendor signup form
- Confirmation email from hello@letsgetlunch.nyc with QR, address line, unsubscribe footer
- Custom blue dot favicon
- Hours range 10:30am-4:30pm

## V1 PENDING TODO
1. **FIX ADMIN PHOTO LIGHTBOX** ← active bug above
2. Photos on 8 original seeded restaurants
3. QR code on success screen in modal
4. Restaurant address in confirmation email
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
