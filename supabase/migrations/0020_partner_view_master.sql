-- The Collection — per-partner visibility of The Collection's own inventory
-- ===========================================================================
-- Until now a partner could see exactly one thing: their own showroom's cars
-- ("inventory select scoped", 0006). The Collection now wants to grant, PER
-- PARTNER, the ability to also SEE the master showroom's inventory — so a
-- partner can view what The Collection is holding, without ever being able to
-- touch it.
--
-- WHAT THIS GRANTS, PRECISELY:
--
--   • SELECT only. INSERT / UPDATE / DELETE policies are NOT touched: they still
--     read `admin OR showroom_id = app_showroom_id()`, so a flagged partner can
--     read The Collection's cars and cannot add to, edit, or delete them. The
--     0014 publish/feature guard and the 0019 photographer limits are unaffected.
--   • The WHOLE master inventory, every status, published or not. That is the
--     literal reading of "they can view The Collection's inventory". If you
--     would rather partners only saw PUBLISHED master cars, add
--     `and published` to the new branch below — it is a one-word change, and
--     the rollback at the bottom is unaffected either way.
--   • Nothing else. Enquiries, notifications and the showrooms table are
--     untouched, so a flagged partner still sees no buyer data and no other
--     partner's cars.
--
-- WHY A COLUMN AND NOT A JWT CLAIM: role/showroom_id live in app_metadata
-- because they are identity. This flag is a setting the admin toggles from the
-- Partners screen, and a JWT claim would not take effect until the partner
-- signed out and back in. A column applies on the partner's very next query,
-- and Realtime re-evaluates RLS per event, so their list updates live.
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0019). Re-runnable. Rollback at bottom.
-- ===========================================================================

begin;

-- 1) THE FLAG ----------------------------------------------------------------
-- Default FALSE: granting sight of The Collection's stock is opt-in, per partner.
alter table public.showrooms
  add column if not exists can_view_master boolean not null default false;

comment on column public.showrooms.can_view_master is
  'When true, users scoped to THIS showroom may SELECT the master showroom''s '
  'inventory (read-only). Set from the dashboard Partners screen. Never grants '
  'write access — see migration 0020.';

-- 2) HELPER ------------------------------------------------------------------
-- Does the CALLER's own showroom carry the flag?
--
-- SECURITY DEFINER so the check does not itself depend on the caller being able
-- to read public.showrooms under RLS. It is a closed question — it reads exactly
-- one boolean for the caller's own showroom id and returns false when the caller
-- has no showroom (admins, or a mis-stamped claim), so it cannot leak a row.
-- `set search_path = public` per the 0019 convention: a SECURITY DEFINER function
-- with a mutable search_path is a privilege-escalation vector.
create or replace function public.app_can_view_master()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(
    (select s.can_view_master
       from public.showrooms s
      where s.id = public.app_showroom_id()),
    false)
$$;

revoke all on function public.app_can_view_master() from public;
grant execute on function public.app_can_view_master() to authenticated;

-- 3) WIDEN THE SELECT POLICY -------------------------------------------------
-- Rebuilt, not added: permissive policies OR-combine, so the 0006 policy is
-- replaced rather than supplemented (same reasoning as the 0019 delete policy).
-- Branch 3 is the only new grant.
drop policy if exists "inventory select scoped" on public.inventory;
create policy "inventory select scoped"
  on public.inventory for select
  to authenticated
  using (
    public.app_role() = 'admin'
    or showroom_id = public.app_showroom_id()
    or (
      showroom_id = '11111111-1111-1111-1111-111111111111'::uuid
      and public.app_can_view_master()
    )
  );

commit;

-- ===========================================================================
-- ROLLBACK — restore the 0006 policy and drop the flag.
-- Destructive: dropping the column discards every partner's setting.
-- ===========================================================================
-- begin;
-- drop policy if exists "inventory select scoped" on public.inventory;
-- create policy "inventory select scoped"
--   on public.inventory for select
--   to authenticated
--   using ( public.app_role() = 'admin' or showroom_id = public.app_showroom_id() );
-- drop function if exists public.app_can_view_master();
-- alter table public.showrooms drop column if exists can_view_master;
-- commit;
