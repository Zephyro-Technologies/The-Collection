-- The Collection — the photographer role: inventory content only
-- ===========================================================================
-- A photographer manages ONLY The Collection's own inventory — add cars, edit
-- photos / specs / details — and nothing else. They are provisioned exactly like
-- a partner, but with app_metadata.role = 'photographer' and showroom_id set to
-- the master (The Collection) showroom:
--     { "role": "photographer",
--       "showroom_id": "11111111-1111-1111-1111-111111111111" }
--
-- MOST OF THE ROLE NEEDS NO NEW POLICY. Every inventory/showroom/storage policy
-- reads `app_role() = 'admin' OR showroom_id = app_showroom_id()`; a photographer
-- scoped to the master showroom falls through the second branch and gets
-- read/insert/update on The Collection's inventory and its car-image folder for
-- free. Enquiries + notifications are already admin-only, so a photographer is
-- denied there with no change. What must be SUBTRACTED:
--
--   • publish / feature  → already blocked for every non-admin by the 0014
--                          guard trigger (enforce_inventory_publication).
--   • delete             → the existing "inventory delete" policy is PERMISSIVE
--                          and grants delete on own-showroom rows. Permissive
--                          policies OR-combine, so a *new* "deny" policy would be
--                          a no-op — we MODIFY the existing policy instead.
--   • status change      → status is admin-only for a photographer. Per-column,
--                          same reason publish/feature can't be pure RLS, so a
--                          BEFORE trigger enforces it (partners keep status control
--                          of their own cars; only 'photographer' is restricted).
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0014). Re-runnable. Rollback at bottom.
-- ===========================================================================

begin;

-- 1) DELETE — exclude photographer by MODIFYING the existing policy ------------
drop policy if exists "inventory delete" on public.inventory;
create policy "inventory delete"
  on public.inventory for delete
  to authenticated
  using (
    public.app_role() = 'admin'
    or (showroom_id = public.app_showroom_id() and public.app_role() <> 'photographer')
  );

-- 2) STATUS — a photographer may not set/change a car's status ----------------
-- New photographer cars come in as 'available'; they cannot move a car to
-- reserved/sold. Admin and partner are unaffected.
create or replace function public.enforce_photographer_limits()
  returns trigger
  language plpgsql
  security invoker
  set search_path = public
as $$
begin
  if public.app_role() = 'photographer' then
    if tg_op = 'INSERT' and new.status is distinct from 'available'::car_status then
      raise exception 'a photographer may only add cars as available';
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      raise exception 'only The Collection admin may change a car''s status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_photographer_limits on public.inventory;
create trigger inventory_photographer_limits
  before insert or update on public.inventory
  for each row execute function public.enforce_photographer_limits();

commit;

-- ===========================================================================
-- ROLLBACK — restore the plain delete policy and drop the status guard.
-- ===========================================================================
-- drop trigger  if exists inventory_photographer_limits on public.inventory;
-- drop function if exists public.enforce_photographer_limits();
-- drop policy   if exists "inventory delete" on public.inventory;
-- create policy "inventory delete" on public.inventory for delete to authenticated
--   using ( public.app_role() = 'admin' or showroom_id = public.app_showroom_id() );
