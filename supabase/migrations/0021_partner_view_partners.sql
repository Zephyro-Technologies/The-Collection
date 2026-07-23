-- The Collection — per-partner visibility of OTHER partners' inventory
-- ===========================================================================
-- 0020 gave each partner an opt-in view of the MASTER showroom's cars. This adds
-- the second, independent axis: an opt-in view of every OTHER PARTNER's cars.
--
-- The two flags compose, so a partner ends up in one of four states:
--
--   can_view_master  can_view_partners   sees
--   ---------------  -----------------   ------------------------------------
--   false            false               own showroom only            (default)
--   true             false               own + The Collection
--   false            true                own + every other partner
--   true             true                everything
--
-- WHAT THIS GRANTS, PRECISELY:
--
--   • SELECT only, exactly as 0020. INSERT / UPDATE / DELETE are untouched and
--     still read `admin OR showroom_id = app_showroom_id()`, so a flagged partner
--     can read another partner's cars and can never add to, edit, delete,
--     publish or feature them.
--   • It ALSO widens the showrooms SELECT policy. That is not incidental: without
--     it the dashboard cannot name whose car it is showing, and every foreign car
--     renders with a blank owner badge. The cost is that a flagged partner learns
--     the NAME and SLUG of the other showrooms whose cars they can already see.
--     Nothing else on the row is sensitive (id, is_master, is_active, flags).
--
-- TWO THINGS THE OPERATOR SHOULD BE AWARE OF:
--
--   1. IT IS ONE-DIRECTIONAL. Turning this on for partner A lets A see B and C.
--      It does NOT let B or C see A. Mutual visibility means turning it on for
--      each of them.
--   2. THE PARTNER BEING VIEWED DOES NOT CONSENT. The flag is set by The
--      Collection on the VIEWER. B has no say in A seeing B's stock. That is a
--      deliberate consequence of The Collection owning the platform — but it does
--      mean competing showrooms can be shown each other's inventory, so it stays
--      OFF by default and is enabled one partner at a time.
--
-- If per-pair control is ever needed ("A may see B but not C"), this boolean is
-- the wrong shape and should be replaced by a showroom_visibility junction table.
-- It is deliberately not built that way now: nothing has asked for it.
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0020). Re-runnable. Rollback at bottom.
-- ===========================================================================

begin;

-- 1) THE FLAG ----------------------------------------------------------------
alter table public.showrooms
  add column if not exists can_view_partners boolean not null default false;

comment on column public.showrooms.can_view_partners is
  'When true, users scoped to THIS showroom may SELECT every OTHER partner '
  'showroom''s inventory (read-only), and read those showrooms'' rows so the UI '
  'can name them. One-directional; never grants write access. See migration 0021.';

-- 2) HELPER ------------------------------------------------------------------
-- Mirrors app_can_view_master(). SECURITY DEFINER so the check never depends on
-- the caller's own ability to read public.showrooms — which matters more here
-- than in 0020, because this function is used INSIDE the showrooms policy
-- itself. Running as the definer bypasses RLS on that internal read, so there is
-- no policy recursion. `set search_path = public` per the 0019 convention.
create or replace function public.app_can_view_partners()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(
    (select s.can_view_partners
       from public.showrooms s
      where s.id = public.app_showroom_id()),
    false)
$$;

revoke all on function public.app_can_view_partners() from public;
grant execute on function public.app_can_view_partners() to authenticated;

-- 3) WIDEN THE INVENTORY SELECT POLICY ---------------------------------------
-- Rebuilt rather than supplemented: permissive policies OR-combine, so adding a
-- second policy would be indistinguishable from editing this one, and far harder
-- to read later. Branch 4 is the only new grant.
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
    or (
      showroom_id <> '11111111-1111-1111-1111-111111111111'::uuid
      and public.app_can_view_partners()
    )
  );

-- 4) WIDEN THE SHOWROOMS SELECT POLICY ---------------------------------------
-- So the dashboard can label a foreign car with its owner. Each branch mirrors
-- exactly one branch of the inventory policy above: a caller may read a showroom
-- row if and only if they may already read that showroom's cars. No flag lets
-- anyone see a showroom whose inventory is hidden from them.
drop policy if exists "showrooms select scoped" on public.showrooms;
create policy "showrooms select scoped"
  on public.showrooms for select
  to authenticated
  using (
    public.app_role() = 'admin'
    or id = public.app_showroom_id()
    or (is_master and public.app_can_view_master())
    or (not is_master and public.app_can_view_partners())
  );

commit;

-- ===========================================================================
-- ROLLBACK — restore the 0020 policies and drop the flag.
-- Destructive: dropping the column discards every partner's setting.
-- ===========================================================================
-- begin;
-- drop policy if exists "inventory select scoped" on public.inventory;
-- create policy "inventory select scoped"
--   on public.inventory for select
--   to authenticated
--   using (
--     public.app_role() = 'admin'
--     or showroom_id = public.app_showroom_id()
--     or ( showroom_id = '11111111-1111-1111-1111-111111111111'::uuid
--          and public.app_can_view_master() )
--   );
-- drop policy if exists "showrooms select scoped" on public.showrooms;
-- create policy "showrooms select scoped"
--   on public.showrooms for select
--   to authenticated
--   using ( public.app_role() = 'admin' or id = public.app_showroom_id() );
-- drop function if exists public.app_can_view_partners();
-- alter table public.showrooms drop column if exists can_view_partners;
-- commit;
