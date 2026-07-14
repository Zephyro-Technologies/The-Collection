-- The Collection — inventory table
-- ---------------------------------------------------------------------------
-- This is the first real, database-backed entity for the operator dashboard.
-- The dashboard admin UI reads/writes this table directly from the browser
-- using the Supabase anon key, so Row Level Security is ENABLED and explicit
-- policies are defined below.
--
-- A later session adds the LLM bot, which will READ this table for availability
-- and WRITE to new tables for the conversational side of the business. Those
-- tables are intentionally NOT created here — see the "FUTURE TABLES" note at
-- the bottom for the intended shape so the data layer can plug in cleanly.
-- ---------------------------------------------------------------------------

-- gen_random_uuid() lives in pgcrypto; enabled by default on Supabase, but be explicit.
create extension if not exists pgcrypto;

-- Status is a small, fixed set — model it as an enum so bad values are rejected.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'car_status') then
    create type car_status as enum ('available', 'reserved', 'sold');
  end if;
end
$$;

create table if not exists public.inventory (
  id          uuid primary key default gen_random_uuid(),
  make        text        not null,
  model       text        not null,
  variant     text        not null default '',
  year        integer     not null,
  mileage     integer     not null default 0,           -- kilometres
  color       text        not null default '',
  price       numeric(14, 2) not null default 0,           -- large enough for PKR figures
  currency    text        not null default 'PKR',
  status      car_status  not null default 'available',
  photos      text[]      not null default '{}',          -- ordered list of image URLs
  description text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Inventory is browsed by status constantly (available cars for the bot, filters
-- in the admin UI) — index it.
create index if not exists inventory_status_idx on public.inventory (status);
create index if not exists inventory_created_at_idx on public.inventory (created_at desc);

-- --- updated_at trigger ----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at
  before update on public.inventory
  for each row
  execute function public.set_updated_at();

-- --- Row Level Security -----------------------------------------------------
-- The dashboard has no end-user auth yet, so the browser uses the anon role for
-- everything. To keep the admin dashboard fully functional we grant the anon
-- (and authenticated) roles read+write on inventory.
--
-- TODO(auth): once operator login is added, restrict writes to `authenticated`
-- (or a staff role/claim) and consider keeping reads public for the storefront.
alter table public.inventory enable row level security;

drop policy if exists "inventory read" on public.inventory;
create policy "inventory read"
  on public.inventory
  for select
  to anon, authenticated
  using (true);

drop policy if exists "inventory write" on public.inventory;
create policy "inventory write"
  on public.inventory
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- --- Seed data --------------------------------------------------------------
-- A few sample cars so the screen is never empty on a fresh project.
-- Prices are in PKR (tens to hundreds of millions of rupees) — believable
-- placeholder figures for luxury stock; real inventory is imported later.
insert into public.inventory (make, model, variant, year, mileage, color, price, currency, status, photos, description)
values
  ('Porsche', '911', 'GT3 Touring', 2023, 8400, 'GT Silver', 165000000, 'PKR', 'available',
   array['https://images.unsplash.com/photo-1611821064430-0d40291922d2?auto=format&fit=crop&w=1600&q=80'],
   'Naturally aspirated 4.0L flat-six, Touring package, full Porsche service history.'),
  ('Mercedes-Benz', 'G-Class', 'G63 AMG', 2024, 3200, 'Obsidian Black', 145000000, 'PKR', 'available',
   array['https://images.unsplash.com/photo-1669215511800-c5c6c4f6c554?auto=format&fit=crop&w=1600&q=80'],
   'Handbuilt 4.0L biturbo V8, AMG Night Package, as-new condition.'),
  ('Range Rover', 'Autobiography', 'LWB', 2023, 14500, 'Santorini Black', 115000000, 'PKR', 'reserved',
   array['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=80'],
   'Long-wheelbase Autobiography, rear executive seating, export documentation available.'),
  ('Bentley', 'Continental GT', 'Speed', 2022, 11200, 'Glacier White', 135000000, 'PKR', 'available',
   array['https://images.unsplash.com/photo-1622022003290-c5b5e5e5b80b?auto=format&fit=crop&w=1600&q=80'],
   'W12 Speed specification, full Bentley main-dealer history.'),
  ('Ferrari', 'Roma', 'Coupé', 2023, 4900, 'Rosso Corsa', 175000000, 'PKR', 'available',
   array['https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1600&q=80'],
   'Front-engined 3.9L V8 grand tourer, low mileage, immaculate.'),
  ('Lamborghini', 'Urus', 'Performante', 2024, 2100, 'Giallo Auge', 210000000, 'PKR', 'sold',
   array['https://images.unsplash.com/photo-1633509817627-ed3535e88a2f?auto=format&fit=crop&w=1600&q=80'],
   'Performante specification, carbon package, delivery mileage only.');

-- ---------------------------------------------------------------------------
-- FUTURE TABLES (NOT created in this migration — for the upcoming LLM bot)
-- ---------------------------------------------------------------------------
-- The bot will READ inventory (via lib/inventory.ts → listAvailableCars) and
-- WRITE the conversational side of the business. Intended tables, roughly:
--
--   customers          (id, name, handle, channel, phone, created_at)
--   conversations      (id, customer_id, channel, status, handler, last_at)
--   messages           (id, conversation_id, "from", text, at)
--   tickets            (id, conversation_id, customer_id, question, status, window_closes_at)
--   appointments       (id, customer_id, car_id -> inventory.id, at, status, reminder_sent)
--   wanted_requests    (id, customer_id, query, status, created_at)   -- "wanted"/open requests
--   reengagement_matches (id, car_id -> inventory.id, customer_id, original_query, status)
--
-- They are documented here only; create them in the bot session.
