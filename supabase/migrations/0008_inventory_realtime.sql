-- The Collection — publish `inventory` for Realtime (live inventory list)
-- ---------------------------------------------------------------------------
-- The dashboard subscribes to inventory changes so a partner adding/editing/
-- deleting a car appears in the admin's list instantly (and in the partner's own
-- list) with no refresh. Realtime honours RLS, so the existing policies from
-- 0006 do the scoping: a partner's subscription only carries their own rows; the
-- admin's carries every showroom's. This migration only adds the table to the
-- publication — it changes NO policies and NO data.
--
-- APPLY THIS IN THE SUPABASE SQL EDITOR. A commented ROLLBACK is at the bottom.
-- Idempotent: safe to re-run (the guard skips the add if already published).
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inventory'
  ) then
    alter publication supabase_realtime add table public.inventory;
  end if;
end
$$;

-- NOTE on DELETE events: the app re-queries on every change and never reads the
-- Realtime row payload, so the default replica identity (primary key) is enough —
-- DELETE still delivers the id, which is all we need to trigger a re-fetch. No
-- `alter table public.inventory replica identity full;` is required.

-- ===========================================================================
-- ROLLBACK — paste into the SQL editor to stop publishing inventory changes.
-- ===========================================================================
-- do $$ begin
--   if exists (select 1 from pg_publication_tables
--     where pubname='supabase_realtime' and schemaname='public' and tablename='inventory')
--   then alter publication supabase_realtime drop table public.inventory; end if;
-- end $$;
