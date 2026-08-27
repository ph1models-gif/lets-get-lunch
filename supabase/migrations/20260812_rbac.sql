-- Phase A: admin/editor RBAC (additive only)
--
-- Zero existing tables/columns/policies are modified or dropped by this
-- migration. It only adds new tables, a new nullable column, new RLS
-- policies alongside the existing ones, and new triggers that are no-ops
-- for every write path the app already uses today (service-role calls via
-- supabaseAdmin resolve get_user_role() to NULL, which the guards below
-- explicitly treat as "not an editor" using `is distinct from`, not a bare
-- inequality - a bare `<> 'editor'` would silently evaluate to NULL/false
-- for a NULL role in Postgres's three-valued logic and would have wrongly
-- applied editor column restrictions to admin/service-role writes too).
--
-- Safe to re-run: every policy/trigger is dropped-if-exists before being
-- recreated, and table/column creation uses IF NOT EXISTS.

-- 1. user_roles ---------------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles
  for select
  using (auth.uid() = user_id);

-- Deliberately no insert/update/delete policy for anyone but the service
-- role (which bypasses RLS entirely and needs no policy). This is what
-- makes "an editor can never change their own role" a hard DB wall.

-- 2. get_user_role() helper ----------------------------------------------
-- security definer so policies elsewhere can check the caller's role
-- without recursive RLS evaluation on user_roles itself.
create or replace function public.get_user_role(uid uuid default auth.uid())
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.user_roles where user_id = uid;
$$;

-- 3. restaurant_permissions ----------------------------------------------
create table if not exists public.restaurant_permissions (
  user_id       uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

alter table public.restaurant_permissions enable row level security;

drop policy if exists "restaurant_permissions_admin_all" on public.restaurant_permissions;
create policy "restaurant_permissions_admin_all" on public.restaurant_permissions
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "restaurant_permissions_editor_select_own" on public.restaurant_permissions;
create policy "restaurant_permissions_editor_select_own" on public.restaurant_permissions
  for select
  using (user_id = auth.uid());

-- 4. deals.times -----------------------------------------------------------
-- Additive nullable column. Distinct from restaurants.hours (which already
-- exists and stays separately editable) - this is the lunch-special-
-- specific times detail called out in the requirements.
alter table public.deals add column if not exists times text;

-- 5. restaurants: new RLS policies (alongside the existing, untouched
--    public-read policy) --------------------------------------------------
alter table public.restaurants enable row level security;

drop policy if exists "restaurants_admin_all" on public.restaurants;
create policy "restaurants_admin_all" on public.restaurants
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "restaurants_editor_select" on public.restaurants;
create policy "restaurants_editor_select" on public.restaurants
  for select
  using (
    public.get_user_role() = 'editor'
    and exists (
      select 1 from public.restaurant_permissions rp
      where rp.restaurant_id = restaurants.id and rp.user_id = auth.uid()
    )
  );

drop policy if exists "restaurants_editor_update" on public.restaurants;
create policy "restaurants_editor_update" on public.restaurants
  for update
  using (
    public.get_user_role() = 'editor'
    and exists (
      select 1 from public.restaurant_permissions rp
      where rp.restaurant_id = restaurants.id and rp.user_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'editor'
    and exists (
      select 1 from public.restaurant_permissions rp
      where rp.restaurant_id = restaurants.id and rp.user_id = auth.uid()
    )
  );

-- No editor insert/delete policy at all - editors can never create or
-- delete a restaurant, full stop (RLS defaults to deny for any action
-- with no matching policy).

-- 6. restaurants: column allow-list guard, editor-only -------------------
-- RLS gates rows, not columns - this is what actually stops an editor
-- from PATCHing is_active, slug, rating, seats, website, phone, emoji,
-- walk_in, etc. even via a direct, validly-signed editor-JWT PostgREST
-- call. Every admin/service-role write (today's existing /api/admin/*
-- routes, all of which use the service-role key) resolves
-- get_user_role() to NULL and is a guaranteed no-op through this guard.
create or replace function public.restaurants_editor_column_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text[] := array[
    'name', 'address', 'neighborhood', 'cuisine', 'hours', 'bio',
    'photo_url', 'photo_urls', 'work_friendly', 'wifi', 'lat', 'lng'
  ];
  col text;
begin
  if public.get_user_role() is distinct from 'editor' then
    return new;
  end if;
  for col in select jsonb_object_keys(to_jsonb(new)) loop
    if col = any(allowed) then
      continue;
    end if;
    if to_jsonb(old) ->> col is distinct from to_jsonb(new) ->> col then
      raise exception 'editor cannot modify column: %', col;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists restaurants_editor_column_guard_trg on public.restaurants;
create trigger restaurants_editor_column_guard_trg
  before update on public.restaurants
  for each row
  execute function public.restaurants_editor_column_guard();

-- 7. deals: new RLS policies + column allow-list guard, same shape -------
alter table public.deals enable row level security;

drop policy if exists "deals_admin_all" on public.deals;
create policy "deals_admin_all" on public.deals
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "deals_editor_select" on public.deals;
create policy "deals_editor_select" on public.deals
  for select
  using (
    public.get_user_role() = 'editor'
    and exists (
      select 1 from public.restaurant_permissions rp
      where rp.restaurant_id = deals.restaurant_id and rp.user_id = auth.uid()
    )
  );

drop policy if exists "deals_editor_update" on public.deals;
create policy "deals_editor_update" on public.deals
  for update
  using (
    public.get_user_role() = 'editor'
    and exists (
      select 1 from public.restaurant_permissions rp
      where rp.restaurant_id = deals.restaurant_id and rp.user_id = auth.uid()
    )
  )
  with check (
    public.get_user_role() = 'editor'
    and exists (
      select 1 from public.restaurant_permissions rp
      where rp.restaurant_id = deals.restaurant_id and rp.user_id = auth.uid()
    )
  );

-- No editor insert/delete policy on deals either.

-- is_active, is_exclusive, courses, restaurant_id stay locked on purpose -
-- is_exclusive in particular gates the customer LGX claim flow and stays
-- admin-only, full stop.
create or replace function public.deals_editor_column_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text[] := array['special', 'price', 'days', 'times'];
  col text;
begin
  if public.get_user_role() is distinct from 'editor' then
    return new;
  end if;
  for col in select jsonb_object_keys(to_jsonb(new)) loop
    if col = any(allowed) then
      continue;
    end if;
    if to_jsonb(old) ->> col is distinct from to_jsonb(new) ->> col then
      raise exception 'editor cannot modify column: %', col;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists deals_editor_column_guard_trg on public.deals;
create trigger deals_editor_column_guard_trg
  before update on public.deals
  for each row
  execute function public.deals_editor_column_guard();

-- 8. claims: no changes made here on purpose. It already has RLS with a
--    select-own-rows-only policy keyed on auth.uid() and no authenticated
--    INSERT policy - an editor gets exactly the same (empty, for a staff
--    account) view as any other authenticated user. Run this afterward to
--    confirm that's still true rather than trusting this comment:
--
--   select polname, cmd, roles, qual, with_check
--   from pg_policies
--   where schemaname = 'public' and tablename = 'claims';
--
--    Expect: a SELECT policy scoped to auth.uid() = user_id (or similar),
--    and no INSERT/UPDATE/DELETE policy for the "authenticated" role.

-- 9. restaurant-photos Storage bucket: no changes in Phase A. See the plan
--    doc for why (Phase B item) - uploads keep using the same anon-key
--    path the existing admin panel already uses.
