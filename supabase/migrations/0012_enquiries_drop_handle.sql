-- The Collection — drop enquiries.handle + recreate match functions without it
-- ===========================================================================
-- Removes the unused `handle` column from public.enquiries and rebuilds BOTH
-- match functions to match. NOTE: the functions are DROPPED then CREATEd (not
-- `create or replace`): removing a column from a RETURNS TABLE changes the
-- function's return type, which `create or replace` cannot do ("cannot change
-- return type of existing function"). Grants are re-issued after recreate.
--
-- The UNION column counts in match_enquiry are the area that broke before, so
-- they were re-counted carefully: RETURNS TABLE now has 18 columns and EACH
-- UNION branch supplies exactly 18 (handle removed from all three).
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0010/0011). Rollback at the bottom.
-- ===========================================================================

-- 1) DROP the column.
alter table public.enquiries drop column if exists handle;

-- 2) match_enquiry — recreate WITHOUT handle (18 columns each side).
drop function if exists public.match_enquiry(uuid);
create function public.match_enquiry(p_enquiry_id uuid)
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
             and ( e.docs_complete is not true )
             and ( i.status = 'available' )
           then 'exact' else 'possible' end as tier,
      i.id as ref_id, i.showroom_id, s.name as showroom_name,
      i.make, i.model, i.variant, i.year, i.mileage as mileage_km,
      i.price, i.currency, i.status::text as status,
      -- docs_complete, customer_name, customer_phone, channel (N/A for inventory), photo.
      -- 5 values → positions 14-18 of RETURNS TABLE.
      null::boolean as docs_complete, null::text as customer_name, null::text as customer_phone,
      null::text as channel, (i.photos)[1] as photo
    from e
    join public.inventory i
      on lower(trim(i.make)) = lower(trim(e.make))
     and lower(trim(i.model)) = lower(trim(e.model))
    left join public.showrooms s on s.id = i.showroom_id
    where i.status in ('available','reserved')

    union all

    -- active selling enquiries
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

-- 3) match_selling_enquiry — recreate WITHOUT handle (14 columns).
drop function if exists public.match_selling_enquiry(uuid);
create function public.match_selling_enquiry(p_enquiry_id uuid)
returns table (
  tier text, ref_id uuid, customer_name text, customer_phone text, channel text,
  make text, model text, variant text, year integer, mileage_max_km integer,
  price numeric, currency text, docs_required boolean, created_at timestamptz
)
language sql stable security invoker set search_path = public as $$
  with se as (
    select * from public.enquiries
    where id = p_enquiry_id and type = 'selling' and status = 'active' and now() < expires_at
  ), r as (
    select
      case when ( nullif(trim(b.variant),'') is null or lower(trim(se.variant)) = lower(trim(b.variant)) )
             and ( b.mileage_max_km is null or (se.mileage_km is not null and se.mileage_km <= b.mileage_max_km) )
             and ( b.year  is null or (se.year  is not null and se.year  >= b.year) )
             and ( b.price is null or (se.price is not null and se.price <= b.price) )
             and ( nullif(trim(b.color),'') is null or lower(trim(se.color)) = lower(trim(b.color)) )
             and ( b.docs_complete is not true or se.docs_complete is true )
           then 'exact' else 'possible' end as tier,
      b.id as ref_id, b.customer_name, b.customer_phone, b.channel,
      b.make, b.model, b.variant, b.year, b.mileage_max_km,
      b.price, b.currency, b.docs_complete as docs_required, b.created_at
    from se
    join public.enquiries b
      on b.type = 'buying' and b.status = 'active' and now() < b.expires_at and b.id <> se.id
     and lower(trim(b.make)) = lower(trim(se.make))
     and lower(trim(b.model)) = lower(trim(se.model))
  )
  select * from r order by (tier = 'exact') desc, created_at desc;
$$;
grant execute on function public.match_selling_enquiry(uuid) to authenticated;

-- ===========================================================================
-- ROLLBACK — restore the handle column and the handle-bearing functions.
-- ===========================================================================
-- alter table public.enquiries add column if not exists handle text;
--
-- drop function if exists public.match_enquiry(uuid);
-- create function public.match_enquiry(p_enquiry_id uuid)
-- returns table (
--   source text, tier text, ref_id uuid, showroom_id uuid, showroom_name text,
--   make text, model text, variant text, year integer, mileage_km integer,
--   price numeric, currency text, status text, docs_complete boolean,
--   customer_name text, customer_phone text, channel text, handle text, photo text
-- ) language sql stable security invoker set search_path = public as $$
--   with e as (select * from public.enquiries where id=p_enquiry_id and type='buying' and status='active' and now()<expires_at), m as (
--     select 'inventory'::text,
--       case when (nullif(trim(e.variant),'') is null or lower(trim(i.variant))=lower(trim(e.variant)))
--         and (e.mileage_max_km is null or i.mileage<=e.mileage_max_km) and (e.year is null or i.year>=e.year)
--         and (e.price is null or i.price<=e.price) and (nullif(trim(e.color),'') is null or lower(trim(i.color))=lower(trim(e.color)))
--         and (e.docs_complete is not true) and (i.status='available') then 'exact' else 'possible' end,
--       i.id, i.showroom_id, s.name, i.make, i.model, i.variant, i.year, i.mileage, i.price, i.currency, i.status::text,
--       null::boolean, null::text, null::text, null::text, null::text, (i.photos)[1]
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
--       se.docs_complete, se.customer_name, se.customer_phone, se.channel, se.handle, null::text
--     from e join public.enquiries se on se.type='selling' and se.status='active' and now()<se.expires_at and se.id<>e.id
--       and lower(trim(se.make))=lower(trim(e.make)) and lower(trim(se.model))=lower(trim(e.model))
--   ) select * from m order by (tier='exact') desc, price asc nulls last, ref_id;
-- $$;
-- grant execute on function public.match_enquiry(uuid) to authenticated;
--
-- drop function if exists public.match_selling_enquiry(uuid);
-- create function public.match_selling_enquiry(p_enquiry_id uuid)
-- returns table (tier text, ref_id uuid, customer_name text, customer_phone text, channel text, handle text,
--   make text, model text, variant text, year integer, mileage_max_km integer, price numeric, currency text,
--   docs_required boolean, created_at timestamptz)
-- language sql stable security invoker set search_path = public as $$
--   with se as (select * from public.enquiries where id=p_enquiry_id and type='selling' and status='active' and now()<expires_at), r as (
--     select case when (nullif(trim(b.variant),'') is null or lower(trim(se.variant))=lower(trim(b.variant)))
--         and (b.mileage_max_km is null or (se.mileage_km is not null and se.mileage_km<=b.mileage_max_km))
--         and (b.year is null or (se.year is not null and se.year>=b.year)) and (b.price is null or (se.price is not null and se.price<=b.price))
--         and (nullif(trim(b.color),'') is null or lower(trim(se.color))=lower(trim(b.color)))
--         and (b.docs_complete is not true or se.docs_complete is true) then 'exact' else 'possible' end,
--       b.id, b.customer_name, b.customer_phone, b.channel, b.handle, b.make, b.model, b.variant, b.year, b.mileage_max_km,
--       b.price, b.currency, b.docs_complete, b.created_at
--     from se join public.enquiries b on b.type='buying' and b.status='active' and now()<b.expires_at and b.id<>se.id
--       and lower(trim(b.make))=lower(trim(se.make)) and lower(trim(b.model))=lower(trim(se.model))
--   ) select * from r order by (tier='exact') desc, created_at desc;
-- $$;
-- grant execute on function public.match_selling_enquiry(uuid) to authenticated;
