-- The Collection — retire selling-enquiries, step 1: seller cars → inventory
-- ===========================================================================
-- The "sell a car" concept is retired. A car someone offered to sell becomes a
-- normal inventory row (The Collection's own, unpublished, available). The
-- seller's name / phone / channel are NOT carried over (not stored for now).
--
-- Only ACTIVE selling enquiries are migrated (fulfilled/dismissed/archived are
-- historical and are archived + deleted in 0018, not turned into live stock).
--
-- NULL-SAFETY: inventory.year and inventory.showroom_id are NOT NULL with no
-- default, and an explicitly-selected NULL defeats a column DEFAULT — so every
-- nullable source column is COALESCE'd and the master showroom is set explicitly.
-- A selling enquiry with no year gets a current-year PLACEHOLDER (flagged via
-- source='seller_migrated' so it can be found and corrected — see the null-year
-- report query shipped alongside this migration).
--
-- NOTIFICATIONS: the two AFTER INSERT triggers on inventory (0007 partner-added,
-- 0011 reverse-match) are suppressed during the bulk load so the admin feed isn't
-- flooded with one alert per migrated car. `disable/enable trigger user` +
-- `insert` are wrapped in ONE transaction, so a failed insert also rolls back the
-- DISABLE (the triggers can never be left permanently off). Re-run match_enquiry
-- for active buyers afterwards (see the post-migration match summary).
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0013; independent of 0014/0015).
-- ===========================================================================

begin;

-- 1) PROVENANCE — identify migrated rows (reversible; analytics can tell apart).
alter table public.inventory
  add column if not exists source text not null default 'internal';
alter table public.inventory drop constraint if exists inventory_source_chk;
alter table public.inventory add constraint inventory_source_chk
  check (source in ('internal','seller_migrated'));

-- 2) Suppress the inventory AFTER INSERT triggers for the bulk load only.
--    DISABLE TRIGGER USER leaves FK/constraint triggers intact; ENABLE restores
--    notify_partner_car_added (0007) AND notify_matching_buying_enquiries (0011).
alter table public.inventory disable trigger user;

-- 3) Migrate ACTIVE selling enquiries → inventory. Seller contact NOT selected.
insert into public.inventory
  (showroom_id, make, model, variant, year, mileage, color, price, currency,
   status, docs_complete, published, featured, source)
select
  '11111111-1111-1111-1111-111111111111',        -- The Collection (master)
  e.make,
  e.model,
  coalesce(e.variant, ''),
  coalesce(e.year, extract(year from now())::int), -- null-year → current-year placeholder
  coalesce(e.mileage_km, 0),
  coalesce(e.color, ''),
  coalesce(e.price, 0),
  coalesce(e.currency, 'PKR'),
  'available',
  coalesce(e.docs_complete, true),
  false,                                           -- unpublished
  false,                                           -- not featured
  'seller_migrated'
from public.enquiries e
where e.type = 'selling'
  and e.status = 'active';

-- 4) Restore the triggers.
alter table public.inventory enable trigger user;

commit;

-- ===========================================================================
-- NULL-YEAR REPORT — run AFTER this migration to list rows that got a
-- placeholder year (source='seller_migrated' AND year = the current year is a
-- weak signal; the precise set is the active selling enquiries whose year was
-- null). Correct these in the dashboard.
-- ===========================================================================
-- select i.id, i.make, i.model, i.year as placeholder_year, i.created_at
--   from public.inventory i
--  where i.source = 'seller_migrated'
--    and exists (
--      select 1 from public.enquiries e
--       where e.type='selling' and e.status='active'
--         and lower(trim(e.make))=lower(trim(i.make))
--         and lower(trim(e.model))=lower(trim(i.model))
--         and e.year is null
--    );
--
-- ===========================================================================
-- ROLLBACK — remove the migrated rows (identifiable by source) + the column.
-- ===========================================================================
-- delete from public.inventory where source = 'seller_migrated';
-- alter table public.inventory drop constraint if exists inventory_source_chk;
-- alter table public.inventory drop column if exists source;
