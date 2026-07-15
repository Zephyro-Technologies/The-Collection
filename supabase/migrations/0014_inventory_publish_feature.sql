-- The Collection — publish / feature flags on inventory (admin-only)
-- ===========================================================================
-- Two independent per-car booleans that drive the PUBLIC website:
--   published  → the car appears in the website's Collection listing
--   featured   → the car appears in the website's Featured strip
-- Both default FALSE (new cars start as drafts). featured ⇒ published (a car
-- cannot be featured without being published); unpublishing auto-unfeatures.
--
-- ONLY The Collection's admin may set or change these. That cannot be a pure RLS
-- rule: every dashboard user shares the Postgres role `authenticated` and is told
-- apart only by their app_metadata.role JWT claim, so Postgres column privileges
-- (role-based) don't apply, and an RLS WITH CHECK sees only the NEW row (never the
-- OLD), so it can't tell "did published change". The correct tool is a BEFORE
-- trigger that reads the JWT role — enforce_inventory_publication() below.
--
-- ORDER MATTERS: the backfill runs BEFORE the guard trigger is created, so it is
-- not blocked by it (a migration runs as service_role, which has no JWT).
--
-- FAIL-CLOSED: the guard blocks anyone who is not an admin, INCLUDING an unknown
-- or null role. A future raw-SQL toggle (service_role in the SQL editor) is
-- therefore also blocked and must disable the trigger deliberately first — this
-- is intentional; publishing is a dashboard-admin action.
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0013). Re-runnable. Rollback at bottom.
-- Reuses public.app_role() from 0006. Master showroom id is the 0004 seed.
-- ===========================================================================

begin;

-- 1) COLUMNS -----------------------------------------------------------------
alter table public.inventory
  add column if not exists published boolean not null default false,
  add column if not exists featured  boolean not null default false;

-- 2) INVARIANT — featured implies published ----------------------------------
alter table public.inventory drop constraint if exists inventory_featured_requires_published;
alter table public.inventory add constraint inventory_featured_requires_published
  check (published or not featured);

-- 3) INDEXES — partial, the website filters on published (and featured) = true -
create index if not exists inventory_published_idx on public.inventory (published) where published;
create index if not exists inventory_featured_idx  on public.inventory (featured)  where featured;

-- 4) BACKFILL — BEFORE the guard trigger exists ------------------------------
-- Keep the live site showing exactly what it shows today: every existing
-- Collection (master) car becomes published. Partner cars stay unpublished.
update public.inventory
   set published = true
 where showroom_id = '11111111-1111-1111-1111-111111111111';

-- Seed the Featured strip so it isn't empty at launch — the 3 most-recent
-- available Collection cars (matches today's landing slice(0,3)). Admin
-- re-curates from the dashboard afterwards.
update public.inventory set featured = true
 where id in (
   select id from public.inventory
    where showroom_id = '11111111-1111-1111-1111-111111111111'
      and status = 'available'
      and published
    order by created_at desc
    limit 3
 );

-- 5) GUARD TRIGGER — created AFTER the backfill -------------------------------
-- Fail-closed: only an admin JWT may set/change published or featured; any other
-- role (partner, photographer, unknown, or null) is blocked. Unpublishing always
-- un-features, so an admin never trips the CHECK by simply unpublishing.
create or replace function public.enforce_inventory_publication()
  returns trigger
  language plpgsql
  security invoker
  set search_path = public
as $$
begin
  -- Unpublishing auto-unfeatures (keeps the featured ⇒ published CHECK satisfied).
  if new.published is false then
    new.featured := false;
  end if;

  -- Only an admin may touch these two flags.
  if public.app_role() is distinct from 'admin' then
    if tg_op = 'INSERT' then
      if new.published or new.featured then
        raise exception 'only The Collection admin may publish or feature a car';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.published is distinct from old.published
         or new.featured is distinct from old.featured then
        raise exception 'only The Collection admin may change publish/feature';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists inventory_publication_guard on public.inventory;
create trigger inventory_publication_guard
  before insert or update on public.inventory
  for each row execute function public.enforce_inventory_publication();

commit;

-- ===========================================================================
-- ROLLBACK — paste into the SQL editor to undo this migration.
-- ===========================================================================
-- drop trigger  if exists inventory_publication_guard on public.inventory;
-- drop function if exists public.enforce_inventory_publication();
-- drop index    if exists public.inventory_featured_idx;
-- drop index    if exists public.inventory_published_idx;
-- alter table public.inventory drop constraint if exists inventory_featured_requires_published;
-- alter table public.inventory drop column if exists featured;
-- alter table public.inventory drop column if exists published;
