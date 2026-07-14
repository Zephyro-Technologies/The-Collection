-- The Collection — Enquiries + Matching (Collection/admin-only)
-- ===========================================================================
-- One `enquiries` table, type in ('buying','selling'), entered manually by The
-- Collection's staff. Admin-only RLS (mirrors notifications 0007). On-demand,
-- rules-based matching via SECURITY INVOKER functions so the admin's existing
-- all-showroom inventory RLS (0006) applies — matches can include any partner's
-- car; partners see/are-notified nothing about enquiries.
--
-- APPLY IN THE SUPABASE SQL EDITOR (runs as service role, bypasses RLS).
-- Re-runnable. Rollback block at the bottom.
--
-- Reuses helpers from 0001/0006: public.set_updated_at(), public.app_role().
-- ===========================================================================

create extension if not exists pgcrypto;

-- 1) TABLE -------------------------------------------------------------------
-- Per-type interpretation of the shared car-criteria columns:
--   year           selling: the car's year        | buying: MIN desired year
--   color          selling: the car's colour       | buying: preferred colour
--   mileage_km     selling: the car's actual km     | (buying uses mileage_max_km)
--   mileage_max_km (buying only): MAX acceptable km
--   docs_complete  selling: HAS complete docs       | buying: REQUIRES docs (true) / any (null)
--   price          selling: asking price            | buying: budget (max)
create table if not exists public.enquiries (
  id             uuid        primary key default gen_random_uuid(),
  type           text        not null check (type in ('buying','selling')),
  status         text        not null default 'active' check (status in ('active','fulfilled','dismissed','archived')),

  -- customer / contact
  customer_name  text        not null,
  customer_phone text        not null,
  customer_id    uuid,                                   -- reserved for a future customers table
  channel        text        check (channel in ('whatsapp','instagram','messenger','phone','walk_in','other')),
  handle         text,

  -- car criteria (single-value per enquiry — v1 limitation)
  make           text        not null,
  model          text        not null,
  variant        text,
  year           integer,
  color          text,
  mileage_km     integer,
  mileage_max_km integer,
  docs_complete  boolean,
  price          numeric(14, 2),
  currency       text        not null default 'PKR',
  notes          text,

  -- outcome (set when status -> fulfilled)
  fulfilled_source text      check (fulfilled_source in ('inventory','selling')),
  fulfilled_ref_id uuid,
  fulfilled_at     timestamptz,

  created_by     uuid        default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- PLAIN default (NOT a generated column: timestamptz + interval is STABLE, not
  -- IMMUTABLE, so a stored generated column would abort the migration). Active =
  -- status='active' AND now() < expires_at. "Renew" just resets this column.
  expires_at     timestamptz not null default (now() + interval '1 month')
);

-- A buying enquiry's docs preference is REQUIRES(true) or ANY(null) — never false.
alter table public.enquiries drop constraint if exists enquiries_buying_docs_chk;
alter table public.enquiries add constraint enquiries_buying_docs_chk
  check (type <> 'buying' or docs_complete is null or docs_complete = true);

-- Indexes. The lower(trim(...)) expressions MUST match the match functions'
-- join predicates exactly, or the planner can't use them.
create index if not exists enquiries_type_status_idx      on public.enquiries (type, status);
create index if not exists enquiries_make_model_lower_idx on public.enquiries (lower(trim(make)), lower(trim(model)));
create index if not exists enquiries_expires_idx          on public.enquiries (expires_at);
create index if not exists enquiries_created_idx          on public.enquiries (created_at desc);
create index if not exists inventory_make_model_lower_idx on public.inventory (lower(trim(make)), lower(trim(model)));

drop trigger if exists enquiries_set_updated_at on public.enquiries;
create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();

-- 2) RLS — admin-only (read + write). No anon, no partner. -------------------
alter table public.enquiries enable row level security;
grant select, insert, update, delete on public.enquiries to authenticated;

drop policy if exists "enquiries admin select" on public.enquiries;
create policy "enquiries admin select" on public.enquiries
  for select to authenticated using ( public.app_role() = 'admin' );

drop policy if exists "enquiries admin insert" on public.enquiries;
create policy "enquiries admin insert" on public.enquiries
  for insert to authenticated with check ( public.app_role() = 'admin' );

drop policy if exists "enquiries admin update" on public.enquiries;
create policy "enquiries admin update" on public.enquiries
  for update to authenticated using ( public.app_role() = 'admin' ) with check ( public.app_role() = 'admin' );

-- Hard-delete kept as an admin escape hatch (archive is the normal lifecycle).
drop policy if exists "enquiries admin delete" on public.enquiries;
create policy "enquiries admin delete" on public.enquiries
  for delete to authenticated using ( public.app_role() = 'admin' );

-- 3) MATCH — a BUYING enquiry → inventory (ALL showrooms) + active SELLING enquiries.
-- SECURITY INVOKER: runs with the caller's RLS. Admin → sees all inventory + all
-- enquiries. Partner → the CTE 'e' is empty (can't SELECT enquiries) so it returns
-- nothing. EXACT = make+model+variant match AND mileage/year/price/colour/docs all
-- satisfied; POSSIBLE = make+model match but one is off. year/price/colour are SOFT
-- downgraders (cap at possible, never filtered out). Reserved caps at possible;
-- sold excluded. Inventory has no docs column, so a docs-requiring buyer's
-- inventory matches can't be EXACT (docs unverifiable) — intentional; do not "fix".
create or replace function public.match_enquiry(p_enquiry_id uuid)
returns table (
  source text, tier text, ref_id uuid, showroom_id uuid, showroom_name text,
  make text, model text, variant text, year integer, mileage_km integer,
  price numeric, currency text, status text, docs_complete boolean,
  customer_name text, customer_phone text, channel text, handle text, photo text
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
      -- Alias every column so the CTE `m` has real names (a CTE takes its column
      -- names from the FIRST union branch) — required for the outer ORDER BY.
      i.id as ref_id, i.showroom_id, s.name as showroom_name,
      i.make, i.model, i.variant, i.year, i.mileage as mileage_km,
      i.price, i.currency, i.status::text as status,   -- car_status enum -> text
      -- docs_complete, customer_name, customer_phone, channel, handle (all N/A for
      -- inventory), then photo. 6 values to fill positions 14-19 of RETURNS TABLE.
      null::boolean as docs_complete, null::text as customer_name, null::text as customer_phone,
      null::text as channel, null::text as handle, (i.photos)[1] as photo
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
      se.docs_complete, se.customer_name, se.customer_phone, se.channel, se.handle, null::text
    from e
    join public.enquiries se
      on se.type = 'selling' and se.status = 'active' and now() < se.expires_at and se.id <> e.id
     and lower(trim(se.make)) = lower(trim(e.make))
     and lower(trim(se.model)) = lower(trim(e.model))
  )
  select * from m order by (tier = 'exact') desc, price asc nulls last, ref_id;
$$;
grant execute on function public.match_enquiry(uuid) to authenticated;

-- 4) REVERSE MATCH — a SELLING enquiry → active BUYING enquiries (buyers waiting).
create or replace function public.match_selling_enquiry(p_enquiry_id uuid)
returns table (
  tier text, ref_id uuid, customer_name text, customer_phone text, channel text, handle text,
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
      b.id as ref_id, b.customer_name, b.customer_phone, b.channel, b.handle,
      b.make, b.model, b.variant, b.year, b.mileage_max_km,
      b.price, b.currency, b.docs_complete as docs_required, b.created_at
    from se
    join public.enquiries b
      on b.type = 'buying' and b.status = 'active' and now() < b.expires_at and b.id <> se.id
     and lower(trim(b.make)) = lower(trim(se.make))
     and lower(trim(b.model)) = lower(trim(se.model))
  )
  -- Wrap in `r` so `tier` is a real column the ORDER BY can reference (an output
  -- alias can't be used inside an ORDER BY expression).
  select * from r order by (tier = 'exact') desc, created_at desc;
$$;
grant execute on function public.match_selling_enquiry(uuid) to authenticated;

-- ===========================================================================
-- ROLLBACK — paste into the SQL editor to remove this migration.
-- ===========================================================================
-- drop function if exists public.match_selling_enquiry(uuid);
-- drop function if exists public.match_enquiry(uuid);
-- drop table if exists public.enquiries;   -- also drops its policies, indexes, trigger
-- -- (public.set_updated_at / public.app_role are shared — leave them.)
