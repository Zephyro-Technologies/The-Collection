-- The Collection — multi-tenant "showrooms" (Phase A: schema only, NON-BREAKING)
-- ---------------------------------------------------------------------------
-- A showroom is a tenant. The Collection is the single MASTER showroom (admin);
-- partners are ordinary showrooms. This phase ONLY introduces the table + the
-- master row (and, in 0005, an inventory.showroom_id). There is NO auth, NO role
-- logic, and NO change to how the existing app reads/writes data. Real
-- role-scoped RLS and app_metadata claims arrive in Phases B and C.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto; -- gen_random_uuid()

create table if not exists public.showrooms (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,
  name        text        not null,
  is_master   boolean     not null default false,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- Only ONE showroom may be the master (The Collection).
create unique index if not exists showrooms_one_master
  on public.showrooms (is_master) where is_master;

-- --- Seed the master showroom -----------------------------------------------
-- Fixed id so the app can reference The Collection's showroom during Phase A,
-- before real auth/context exists (see @collection/shared TODO(phase-c)).
insert into public.showrooms (id, slug, name, is_master, is_active)
values ('11111111-1111-1111-1111-111111111111', 'the-collection', 'The Collection', true, true)
on conflict (slug) do nothing;

-- --- Row Level Security (non-breaking) --------------------------------------
-- Enable RLS (Supabase best practice: never leave a public table open) with a
-- PERMISSIVE read so nothing breaks. The app does not WRITE showrooms in Phase A;
-- the seed above runs as the migration role, which bypasses RLS. The real
-- role-scoped showrooms policies land in Phase C alongside auth.
alter table public.showrooms enable row level security;

drop policy if exists "showrooms read (phase A)" on public.showrooms;
create policy "showrooms read (phase A)"
  on public.showrooms
  for select
  to anon, authenticated
  using (true);
