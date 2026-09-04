-- Phase A extension: let editors hide/show a listing, and log every editor
-- (and admin) change to restaurants/deals so it can be reviewed and, if
-- needed, reverted. Additive only - no existing table, column, or policy
-- is dropped or altered in a breaking way.
--
-- Safe to re-run: functions are create-or-replace, policies/triggers are
-- dropped-if-exists before recreation, table creation uses IF NOT EXISTS.

-- 1. Open up is_active to editors -----------------------------------------
-- Same allow-list as the original restaurants_editor_column_guard, plus
-- is_active. Editors still cannot touch slug, rating, seats, website,
-- phone, emoji, walk_in, etc. - and still have no delete policy at all, so
-- "hide, don't delete" is enforced at the database level either way.
create or replace function public.restaurants_editor_column_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text[] := array[
    'name', 'address', 'neighborhood', 'cuisine', 'hours', 'bio',
    'photo_url', 'photo_urls', 'work_friendly', 'wifi', 'lat', 'lng',
    'is_active'
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

-- 2. edit_history table ----------------------------------------------------
-- One row per changed restaurants/deals row, storing the full before/after
-- snapshot as jsonb so a revert can restore exactly what changed without
-- needing to know the schema in advance.
create table if not exists public.edit_history (
  id              uuid primary key default gen_random_uuid(),
  table_name      text not null check (table_name in ('restaurants', 'deals')),
  row_id          uuid not null,
  editor_user_id  uuid references auth.users(id) on delete set null,
  before          jsonb not null,
  after           jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists edit_history_created_at_idx on public.edit_history (created_at desc);
create index if not exists edit_history_row_id_idx on public.edit_history (table_name, row_id);

alter table public.edit_history enable row level security;

-- Admin-only visibility. Editors get no policy at all (default deny) -
-- this is Brian's review trail, not something Olga needs to see. Reverts
-- and the history screen both go through service-role API routes anyway,
-- but this policy is here so the intent holds even if a client ever reads
-- edit_history directly with an authenticated session.
drop policy if exists "edit_history_admin_select" on public.edit_history;
create policy "edit_history_admin_select" on public.edit_history
  for select
  using (public.get_user_role() = 'admin');

-- No insert/update/delete policy for anyone - all rows come from the
-- security-definer trigger below, which bypasses RLS the same way
-- get_user_role() and restaurants_editor_column_guard() already do.

-- 3. Logging trigger --------------------------------------------------------
-- Fires after any update to restaurants or deals, regardless of who made
-- it (Olga via RLS, Brian via the old service-role /admin panel, or a
-- future admin via RLS) - auth.uid() lands NULL for service-role writes
-- and a real UUID for an RLS-authenticated session, so editor_user_id
-- naturally distinguishes the two with no extra logic.
create or replace function public.log_edit_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_jsonb(old) is distinct from to_jsonb(new) then
    insert into public.edit_history (table_name, row_id, editor_user_id, before, after)
    values (tg_table_name, new.id, auth.uid(), to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_edit_history_trg on public.restaurants;
create trigger restaurants_edit_history_trg
  after update on public.restaurants
  for each row
  execute function public.log_edit_history();

drop trigger if exists deals_edit_history_trg on public.deals;
create trigger deals_edit_history_trg
  after update on public.deals
  for each row
  execute function public.log_edit_history();
