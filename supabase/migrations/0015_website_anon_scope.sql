-- The Collection — scope the public website to published Collection cars
-- ===========================================================================
-- Today the anon (public website) SELECT policy on inventory is `using (true)` —
-- the public site can read EVERY car of EVERY showroom, in any status. Two leaks:
--   1. partner-showroom cars appear publicly;
--   2. (once 0014 lands) unpublished/draft cars would appear publicly.
--
-- This tightens the anon policy to: The Collection's (master) cars that are
-- published. Because this is enforced in RLS — not just the app query — it also
-- closes the deep-link hole: getCarById() for a partner or unpublished car now
-- matches zero rows → PGRST116 → null → the website 404s, with no app change.
--
-- DEPENDS ON 0014 (the `published` column + its backfill). If you want to close
-- the PARTNER leak before the publish feature is ready, you can apply this with
-- only the `showroom_id = '…'` term first, then add `and published is true`
-- after 0014. As written it assumes 0014 has run and backfilled.
--
-- The authenticated policies (admin all-showrooms, partner/photographer own) are
-- UNCHANGED — this only narrows what the anon key can read.
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0014). Re-runnable. Rollback at bottom.
-- ===========================================================================

drop policy if exists "inventory select public" on public.inventory;
create policy "inventory select public"
  on public.inventory for select
  to anon
  using (
    showroom_id = '11111111-1111-1111-1111-111111111111'
    and published is true
  );

-- ===========================================================================
-- ROLLBACK — restore the wide-open public read (NOT recommended — re-leaks).
-- ===========================================================================
-- drop policy if exists "inventory select public" on public.inventory;
-- create policy "inventory select public"
--   on public.inventory for select to anon using (true);
