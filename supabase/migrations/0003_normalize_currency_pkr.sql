-- The Collection — normalise any stray non-PKR inventory rows.
-- The dashboard is PKR-only (see 0002). Older/test rows added while a currency
-- selector still existed may carry USD etc., which renders as "$100,000". This
-- one-liner brings them in line. Safe/idempotent — matches nothing on a clean DB.
update public.inventory set currency = 'PKR' where currency <> 'PKR';

-- NOTE (not run here): a junk test row "Porsche Tycan / M5 / $100,000" exists in
-- the live DB. Deleting rows is destructive, so it is intentionally left to the
-- operator to run after confirming, e.g.:
--   delete from public.inventory where make = 'Porsche' and model = 'Tycan';
