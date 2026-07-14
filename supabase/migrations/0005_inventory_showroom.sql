-- The Collection — add inventory.showroom_id (Phase A: staged, NON-BREAKING)
-- ---------------------------------------------------------------------------
-- Every car belongs to exactly one showroom. Staged so NOT NULL cannot fail:
--   add nullable  ->  backfill all existing rows to The Collection  ->  index
--   ->  verify zero nulls  ->  set not null.
--
-- inventory keeps its EXISTING RLS policies from 0001 UNCHANGED (still permissive
-- anon/authenticated read+write). No policy is added or altered here; the
-- role-scoped inventory policies come in Phase C.
-- ---------------------------------------------------------------------------

-- 1) Add the column, nullable for now, with the FK to showrooms.
alter table public.inventory
  add column if not exists showroom_id uuid references public.showrooms(id) on delete restrict;

-- 2) Backfill every existing car to The Collection (the master showroom).
update public.inventory
  set showroom_id = '11111111-1111-1111-1111-111111111111'
  where showroom_id is null;

-- 3) Index — inventory is filtered by showroom in later phases.
create index if not exists inventory_showroom_idx on public.inventory (showroom_id);

-- 4) Verify zero nulls remain, THEN enforce NOT NULL. Raises loudly (aborting the
--    migration) if any row was missed, rather than silently failing the alter.
do $$
begin
  if exists (select 1 from public.inventory where showroom_id is null) then
    raise exception 'inventory has rows with null showroom_id — backfill before NOT NULL';
  end if;
end $$;

alter table public.inventory
  alter column showroom_id set not null;
