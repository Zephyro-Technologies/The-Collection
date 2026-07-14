-- The Collection — switch inventory to PKR
-- ---------------------------------------------------------------------------
-- 0001 originally defaulted `currency` to USD and seeded USD prices. The
-- dashboard now defaults cars to PKR. This migration brings databases that
-- already applied the original 0001 in line. (On a brand-new database 0001 now
-- already uses PKR, so the UPDATE below simply matches nothing.)
-- ---------------------------------------------------------------------------

-- New cars default to PKR.
alter table public.inventory alter column currency set default 'PKR';

-- Widen price for large rupee figures (no-op if already numeric(14,2)).
alter table public.inventory alter column price type numeric(14, 2);

-- Re-price the original USD seed cars in PKR. Scoped to the seed rows that are
-- still in USD so any manually-entered cars are left untouched.
update public.inventory set price = 165000000, currency = 'PKR'
  where currency = 'USD' and make = 'Porsche'       and model = '911';
update public.inventory set price = 145000000, currency = 'PKR'
  where currency = 'USD' and make = 'Mercedes-Benz' and model = 'G-Class';
update public.inventory set price = 115000000, currency = 'PKR'
  where currency = 'USD' and make = 'Range Rover'   and model = 'Autobiography';
update public.inventory set price = 135000000, currency = 'PKR'
  where currency = 'USD' and make = 'Bentley'       and model = 'Continental GT';
update public.inventory set price = 175000000, currency = 'PKR'
  where currency = 'USD' and make = 'Ferrari'       and model = 'Roma';
update public.inventory set price = 210000000, currency = 'PKR'
  where currency = 'USD' and make = 'Lamborghini'   and model = 'Urus';
