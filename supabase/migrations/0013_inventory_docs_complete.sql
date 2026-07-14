-- The Collection — inventory.docs_complete + docs-aware EXACT matching
-- ===========================================================================
-- The client's OWN inventory always has complete original documents. Until now
-- `inventory` had no documents column, so a BUYING enquiry that REQUIRES full
-- docs (enquiries.docs_complete = true) could never reach EXACT against a car —
-- match_enquiry capped it at POSSIBLE ("docs unverifiable"). This migration:
--
--   1. Adds inventory.docs_complete (boolean, NOT NULL, DEFAULT true). The NOT
--      NULL + DEFAULT backfills EVERY existing row to true in one statement
--      (they all have complete docs). New rows default true; staff can flip the
--      rare no-docs car off in the Add-a-car form.
--   2. Rebuilds match_enquiry so a docs-requiring buyer matches an available car
--      as EXACT when that car's docs_complete = true. ONLY the docs predicate in
--      the inventory branch changes; make/model/variant/year/mileage/price/colour
--      and the reserved/sold rules are byte-for-byte identical to 0012.
--
-- match_selling_enquiry is NOT touched: it matches a selling enquiry (an offered
-- car, which already carries its own docs_complete) against buying enquiries and
-- never reads inventory, so its docs logic was already correct.
--
-- The match_enquiry signature (RETURNS TABLE, 18 cols) is UNCHANGED, so this uses
-- `create or replace` (no drop needed — unlike 0012, which changed the row type).
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0010/0011/0012). Re-runnable. Rollback
-- block at the bottom.
-- ===========================================================================

-- 1) COLUMN ------------------------------------------------------------------
-- NOT NULL DEFAULT true => existing rows are backfilled to true atomically.
alter table public.inventory
  add column if not exists docs_complete boolean not null default true;

-- 2) match_enquiry — docs-aware EXACT for inventory ---------------------------
-- Changed line (inventory branch tier CASE) vs 0012:
--   before:  and ( e.docs_complete is not true )
--   after:   and ( e.docs_complete is not true or i.docs_complete is true )
-- i.e. EXACT if the buyer doesn't require docs, OR the car actually has them.
-- The inventory row now also REPORTS its docs_complete (was null::boolean before)
-- so the UI can show docs status on an inventory candidate. Everything else is
-- identical to 0012.
create or replace function public.match_enquiry(p_enquiry_id uuid)
returns table (
  source text, tier text, ref_id uuid, showroom_id uuid, showroom_name text,
  make text, model text, variant text, year integer, mileage_km integer,
  price numeric, currency text, status text, docs_complete boolean,
  customer_name text, customer_phone text, channel text, photo text
)
language sql stable security invoker set search_path = public as $$
  with e as (
    select * from public.enquiries
    where id = p_enquiry_id and type = 'buying' and status = 'active' and now() < expires_at
  ), m as (
    -- inventory candidates (available + reserved; reserved never exact)
    select
      'inventory'::text as source,
      case when ( nullif(trim(e.variant),'') is null or lower(trim(i.variant)) = lower(trim(e.variant)) )
             and ( e.mileage_max_km is null or i.mileage <= e.mileage_max_km )
             and ( e.year  is null or i.year  >= e.year )
             and ( e.price is null or i.price <= e.price )
             and ( nullif(trim(e.color),'') is null or lower(trim(i.color)) = lower(trim(e.color)) )
             and ( e.docs_complete is not true or i.docs_complete is true )
             and ( i.status = 'available' )
           then 'exact' else 'possible' end as tier,
      i.id as ref_id, i.showroom_id, s.name as showroom_name,
      i.make, i.model, i.variant, i.year, i.mileage as mileage_km,
      i.price, i.currency, i.status::text as status,
      -- inventory now HAS docs → report it (positions 14-18: docs_complete,
      -- customer_name, customer_phone, channel, photo).
      i.docs_complete, null::text as customer_name, null::text as customer_phone,
      null::text as channel, (i.photos)[1] as photo
    from e
    join public.inventory i
      on lower(trim(i.make)) = lower(trim(e.make))
     and lower(trim(i.model)) = lower(trim(e.model))
    left join public.showrooms s on s.id = i.showroom_id
    where i.status in ('available','reserved')

    union all

    -- active selling enquiries (unchanged from 0012)
    select
      'selling'::text,
      case when ( nullif(trim(e.variant),'') is null or lower(trim(se.variant)) = lower(trim(e.variant)) )
             and ( e.mileage_max_km is null or (se.mileage_km is not null and se.mileage_km <= e.mileage_max_km) )
             and ( e.year  is null or (se.year  is not null and se.year  >= e.year) )
             and ( e.price is null or (se.price is not null and se.price <= e.price) )
             and ( nullif(trim(e.color),'') is null or lower(trim(se.color)) = lower(trim(e.color)) )
             and ( e.docs_complete is not true or se.docs_complete is true )
           then 'exact' else 'possible' end,
      se.id, null::uuid, null::text,
      se.make, se.model, se.variant, se.year, se.mileage_km,
      se.price, se.currency, null::text,
      se.docs_complete, se.customer_name, se.customer_phone, se.channel, null::text
    from e
    join public.enquiries se
      on se.type = 'selling' and se.status = 'active' and now() < se.expires_at and se.id <> e.id
     and lower(trim(se.make)) = lower(trim(e.make))
     and lower(trim(se.model)) = lower(trim(e.model))
  )
  select * from m order by (tier = 'exact') desc, price asc nulls last, ref_id;
$$;
grant execute on function public.match_enquiry(uuid) to authenticated;

-- match_selling_enquiry: intentionally unchanged (never reads inventory).

-- ===========================================================================
-- ROLLBACK — paste into the SQL editor to undo this migration.
-- ===========================================================================
-- -- Restore the 0012 inventory-docs cap (and stop reporting i.docs_complete):
-- create or replace function public.match_enquiry(p_enquiry_id uuid)
-- returns table (
--   source text, tier text, ref_id uuid, showroom_id uuid, showroom_name text,
--   make text, model text, variant text, year integer, mileage_km integer,
--   price numeric, currency text, status text, docs_complete boolean,
--   customer_name text, customer_phone text, channel text, photo text
-- ) language sql stable security invoker set search_path = public as $$
--   with e as (select * from public.enquiries where id=p_enquiry_id and type='buying' and status='active' and now()<expires_at), m as (
--     select 'inventory'::text,
--       case when (nullif(trim(e.variant),'') is null or lower(trim(i.variant))=lower(trim(e.variant)))
--         and (e.mileage_max_km is null or i.mileage<=e.mileage_max_km) and (e.year is null or i.year>=e.year)
--         and (e.price is null or i.price<=e.price) and (nullif(trim(e.color),'') is null or lower(trim(i.color))=lower(trim(e.color)))
--         and (e.docs_complete is not true) and (i.status='available') then 'exact' else 'possible' end,
--       i.id, i.showroom_id, s.name, i.make, i.model, i.variant, i.year, i.mileage, i.price, i.currency, i.status::text,
--       null::boolean, null::text, null::text, null::text, (i.photos)[1]
--     from e join public.inventory i on lower(trim(i.make))=lower(trim(e.make)) and lower(trim(i.model))=lower(trim(e.model))
--     left join public.showrooms s on s.id=i.showroom_id where i.status in ('available','reserved')
--     union all
--     select 'selling'::text,
--       case when (nullif(trim(e.variant),'') is null or lower(trim(se.variant))=lower(trim(e.variant)))
--         and (e.mileage_max_km is null or (se.mileage_km is not null and se.mileage_km<=e.mileage_max_km))
--         and (e.year is null or (se.year is not null and se.year>=e.year)) and (e.price is null or (se.price is not null and se.price<=e.price))
--         and (nullif(trim(e.color),'') is null or lower(trim(se.color))=lower(trim(e.color)))
--         and (e.docs_complete is not true or se.docs_complete is true) then 'exact' else 'possible' end,
--       se.id, null::uuid, null::text, se.make, se.model, se.variant, se.year, se.mileage_km, se.price, se.currency, null::text,
--       se.docs_complete, se.customer_name, se.customer_phone, se.channel, null::text
--     from e join public.enquiries se on se.type='selling' and se.status='active' and now()<se.expires_at and se.id<>e.id
--       and lower(trim(se.make))=lower(trim(e.make)) and lower(trim(se.model))=lower(trim(e.model))
--   ) select * from m order by (tier='exact') desc, price asc nulls last, ref_id;
-- $$;
-- grant execute on function public.match_enquiry(uuid) to authenticated;
--
-- alter table public.inventory drop column if exists docs_complete;
