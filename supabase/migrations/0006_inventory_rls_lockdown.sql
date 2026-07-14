-- The Collection — Phase C: inventory RLS lockdown (the real security boundary)
-- ---------------------------------------------------------------------------
-- Replaces the permissive policies from 0001 (inventory) and 0004 (showrooms)
-- with role-scoped policies keyed on the app_metadata JWT claims added in
-- Phase B: { role, showroom_id }.
--
--   * website (anon):     reads ALL cars, all showrooms; cannot write.
--   * admin (authenticated, role='admin'): full access to every showroom's cars
--     (this is what makes the admin context switch work).
--   * partner (authenticated, role='partner'): sees / writes ONLY their own
--     showroom's cars; a partner CANNOT insert or move a row into another
--     showroom, even by sending a different showroom_id — the WITH CHECK rejects
--     it at the database, not just in the UI.
--
-- APPLY THIS IN THE SUPABASE SQL EDITOR (runs as service_role, which bypasses
-- RLS, so you can never lock yourself out of the editor). A commented ROLLBACK
-- block is at the bottom of this file.
-- ---------------------------------------------------------------------------

-- 1) HELPER FUNCTIONS -------------------------------------------------------
-- Read role + showroom from the request's app_metadata claim. Named in `public`
-- so they do NOT shadow Supabase's built-in auth.role().
create or replace function public.app_role()
  returns text
  language sql
  stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role'
$$;

create or replace function public.app_showroom_id()
  returns uuid
  language sql
  stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'showroom_id', '')::uuid
$$;

-- 2) INVENTORY POLICIES -----------------------------------------------------
-- Drop the permissive 0001 policies.
drop policy if exists "inventory read"  on public.inventory;
drop policy if exists "inventory write" on public.inventory;

-- SELECT — anon (the public website): every car, every showroom. Unchanged.
create policy "inventory select public"
  on public.inventory for select
  to anon
  using (true);

-- SELECT — authenticated: admin sees all; partner sees only their own.
create policy "inventory select scoped"
  on public.inventory for select
  to authenticated
  using ( public.app_role() = 'admin' or showroom_id = public.app_showroom_id() );

-- INSERT — admin: any showroom; partner: ONLY their own. The WITH CHECK is the
-- enforcement — a partner client sending a foreign showroom_id is rejected.
create policy "inventory insert"
  on public.inventory for insert
  to authenticated
  with check ( public.app_role() = 'admin' or showroom_id = public.app_showroom_id() );

-- UPDATE — admin: any; partner: only own. WITH CHECK also prevents a partner
-- from re-homing a row into another showroom.
create policy "inventory update"
  on public.inventory for update
  to authenticated
  using ( public.app_role() = 'admin' or showroom_id = public.app_showroom_id() )
  with check ( public.app_role() = 'admin' or showroom_id = public.app_showroom_id() );

-- DELETE — admin: any; partner: only own.
create policy "inventory delete"
  on public.inventory for delete
  to authenticated
  using ( public.app_role() = 'admin' or showroom_id = public.app_showroom_id() );

-- (anon has NO insert/update/delete policy → those are denied. The website only
--  reads.)

-- 3) SHOWROOMS POLICIES -----------------------------------------------------
-- Replace the Phase-A permissive read.
drop policy if exists "showrooms read (phase A)" on public.showrooms;

-- authenticated: admin lists all (for the context switcher); partner sees only
-- their own. anon has NO policy (the website never reads showrooms). Writes have
-- NO policy either — showrooms are managed via the service role (SQL editor),
-- which bypasses RLS.
create policy "showrooms select scoped"
  on public.showrooms for select
  to authenticated
  using ( public.app_role() = 'admin' or id = public.app_showroom_id() );

-- ===========================================================================
-- ROLLBACK — paste this into the SQL editor to instantly restore the previous
-- permissive (working) state if anything locks the app out. (Kept commented so
-- it never runs as part of the migration.)
-- ===========================================================================
-- drop policy if exists "inventory select public" on public.inventory;
-- drop policy if exists "inventory select scoped"  on public.inventory;
-- drop policy if exists "inventory insert"         on public.inventory;
-- drop policy if exists "inventory update"         on public.inventory;
-- drop policy if exists "inventory delete"         on public.inventory;
-- create policy "inventory read"  on public.inventory for select
--   to anon, authenticated using (true);
-- create policy "inventory write" on public.inventory for all
--   to anon, authenticated using (true) with check (true);
--
-- drop policy if exists "showrooms select scoped" on public.showrooms;
-- create policy "showrooms read (phase A)" on public.showrooms for select
--   to anon, authenticated using (true);
--
-- -- The helper functions are harmless to leave; drop only for a full teardown:
-- -- drop function if exists public.app_role();
-- -- drop function if exists public.app_showroom_id();
