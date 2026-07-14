-- The Collection — notifications (admin-only "partner added a car" feed)
-- ---------------------------------------------------------------------------
-- The master showroom (The Collection) admin is notified, LIVE, whenever a
-- PARTNER showroom adds a car to inventory. Created by a DATABASE TRIGGER (not
-- app code) so it fires no matter how the row is inserted, and delivered live to
-- the admin via Supabase Realtime. Only the admin can read / mark-read these rows
-- (RLS). The master (The Collection) adding its OWN cars does NOT notify.
--
-- APPLY THIS IN THE SUPABASE SQL EDITOR (it runs as the service role, which
-- bypasses RLS). A commented ROLLBACK block is at the bottom.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto; -- gen_random_uuid()

-- 1) HELPER -----------------------------------------------------------------
-- Same app_role() the inventory RLS uses (0006). create-or-replace so this
-- migration is self-contained whether or not 0006 has been applied.
create or replace function public.app_role()
  returns text
  language sql
  stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

-- 2) TABLE ------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null default 'car_added',
  showroom_id uuid        references public.showrooms(id) on delete set null,  -- the partner who added
  car_id      uuid        references public.inventory(id) on delete set null,  -- the car that was added
  message     text        not null,                                           -- e.g. "Apex Motors added a 2024 Ferrari 296 GTB"
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- The panel's query: unread first, newest first.
create index if not exists notifications_unread_created_idx
  on public.notifications (is_read, created_at desc);

-- 3) TRIGGER ----------------------------------------------------------------
-- AFTER INSERT on inventory: if a PARTNER (non-master showroom) added the car,
-- insert a notification with a message built from the showroom name + the car's
-- year/make/model. SECURITY DEFINER so the insert into notifications succeeds
-- regardless of who inserted the car (the definer/owner bypasses notifications
-- RLS, which otherwise forbids client inserts).
create or replace function public.notify_partner_car_added()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_is_master boolean;
  v_name      text;
begin
  select is_master, name
    into v_is_master, v_name
    from public.showrooms
   where id = new.showroom_id;

  -- Only for a real, non-master (partner) showroom. Master (The Collection)
  -- adding its own cars, or an unknown/absent showroom, must NOT notify.
  if new.showroom_id is null or coalesce(v_is_master, true) then
    return new;
  end if;

  insert into public.notifications (type, showroom_id, car_id, message)
  values (
    'car_added',
    new.showroom_id,
    new.id,
    coalesce(v_name, 'A partner') || ' added a '
      || new.year::text || ' ' || new.make || ' ' || new.model
  );

  return new;
end;
$$;

drop trigger if exists inventory_notify_car_added on public.inventory;
create trigger inventory_notify_car_added
  after insert on public.inventory
  for each row
  execute function public.notify_partner_car_added();

-- 4) RLS --------------------------------------------------------------------
-- Admin-only: SELECT + UPDATE (mark read). No partner access. There is NO insert
-- or delete policy, so clients cannot write directly — only the SECURITY DEFINER
-- trigger above writes (and the service role bypasses RLS).
alter table public.notifications enable row level security;

grant select, update on public.notifications to authenticated;

drop policy if exists "notifications select admin" on public.notifications;
create policy "notifications select admin"
  on public.notifications for select
  to authenticated
  using ( public.app_role() = 'admin' );

drop policy if exists "notifications update admin" on public.notifications;
create policy "notifications update admin"
  on public.notifications for update
  to authenticated
  using ( public.app_role() = 'admin' )
  with check ( public.app_role() = 'admin' );

-- 5) REALTIME ---------------------------------------------------------------
-- Publish the table so the admin dashboard receives changes live. RLS still
-- applies to Realtime, so only the admin's subscription receives the rows.
-- Guarded so re-running the migration doesn't error on "already a member".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- ===========================================================================
-- ROLLBACK — paste into the SQL editor to remove this feature entirely.
-- ===========================================================================
-- do $$ begin
--   if exists (select 1 from pg_publication_tables
--     where pubname='supabase_realtime' and schemaname='public' and tablename='notifications')
--   then alter publication supabase_realtime drop table public.notifications; end if;
-- end $$;
-- drop trigger if exists inventory_notify_car_added on public.inventory;
-- drop function if exists public.notify_partner_car_added();
-- drop table if exists public.notifications;
-- -- app_role() is shared with the inventory RLS — leave it; drop only for a full teardown:
-- -- drop function if exists public.app_role();
