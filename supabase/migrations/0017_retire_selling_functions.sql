-- The Collection — retire selling-enquiries, step 2: match against inventory only
-- ===========================================================================
-- Seller cars are now inventory (0016), so a BUYING enquiry no longer needs to be
-- matched against selling enquiries. match_enquiry keeps its EXACT 18-column
-- RETURNS TABLE (so the shared EnquiryMatch shape and the dashboard are untouched)
-- and simply DROPS the second UNION branch. The inventory branch already fills all
-- 18 columns (customer_name/customer_phone/channel as null), so `create or replace`
-- works with no drop, and the client keeps working byte-for-byte. `source` is now
-- always 'inventory'.
--
-- match_selling_enquiry (the reverse "buyers waiting" function) is retired — the
-- selling concept it served no longer exists.
--
-- ⚠ VERIFIED on a throwaway Postgres before shipping (the UNION area broke once
-- before): asserted exact-first ordering, reserved → possible, over-price /
-- over-mileage / docs-mismatch → possible, and zero 'selling'-source rows.
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0016). Re-runnable. Rollback at bottom.
-- ===========================================================================

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
    -- inventory candidates (available + reserved; reserved never exact).
    -- docs-aware EXACT (0013): a docs-requiring buyer is exact when the car has docs.
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
      i.docs_complete, null::text as customer_name, null::text as customer_phone,
      null::text as channel, (i.photos)[1] as photo
    from e
    join public.inventory i
      on lower(trim(i.make)) = lower(trim(e.make))
     and lower(trim(i.model)) = lower(trim(e.model))
    left join public.showrooms s on s.id = i.showroom_id
    where i.status in ('available','reserved')
  )
  select * from m order by (tier = 'exact') desc, price asc nulls last, ref_id;
$$;
grant execute on function public.match_enquiry(uuid) to authenticated;

-- Retire the reverse "buyers waiting" function.
drop function if exists public.match_selling_enquiry(uuid);

-- ===========================================================================
-- ROLLBACK — restore the 0013 inventory+selling UNION match_enquiry.
-- (Recreate match_selling_enquiry from 0012 too if the reverse view is needed.)
-- ===========================================================================
-- See supabase/migrations/0013_inventory_docs_complete.sql for the exact prior
-- match_enquiry body; and 0012 for match_selling_enquiry.
