-- The Collection — trim stray whitespace from existing inventory text
-- ===========================================================================
-- make / model / variant / color / description are typed by hand. `carToRow` in
-- packages/shared/inventory.ts now trims them on every write, so no NEW row can
-- carry leading or trailing whitespace — but rows written before that still can.
--
-- WHAT THIS IS AND IS NOT:
--
--   It is NOT a correctness fix. Everything that COMPARES these values already
--   normalises: match_enquiry joins on `lower(trim(...))` on both sides (0017),
--   and the dashboard's make/model/variant filters compare on a trimmed,
--   case-folded key. Untrimmed rows match, group and filter correctly today.
--
--   It IS a rendering fix. The dashboard and the public website print these
--   values verbatim — the inventory cards render `{car.make} {car.model}`, the
--   car detail page the same — so a row stored as " Porsche " shows up with
--   visible extra spacing. This also makes existing rows identical in shape to
--   anything written from now on, so the two can never be told apart.
--
-- Case is deliberately left alone, exactly as `carToRow` leaves it: no rule
-- correctly cases "BMW", "McLaren" and "Mercedes-Benz", and every comparison in
-- the system is already case-insensitive.
--
-- NOT INCLUDED: `enquiries`. Its writer has always trimmed (inputToRow uses
-- .trim() on make/model and a blank-to-NULL helper on variant/color), so there is
-- nothing to clean. `showrooms.name` is likewise trimmed by the admin-partners
-- Edge Function on create; any older hand-made row is a single-value fix better
-- done by hand than by a migration.
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0021). Re-runnable — a second run
-- matches zero rows. Non-destructive: it only removes surrounding whitespace and
-- never empties a field that had content.
-- ===========================================================================

begin;

-- `is distinct from` rather than `<>` so a NULL description (the only nullable
-- column here) is skipped rather than making the whole OR chain NULL.
update public.inventory
   set make        = btrim(make),
       model       = btrim(model),
       variant     = btrim(variant),
       color       = btrim(color),
       description = btrim(description)
 where make        is distinct from btrim(make)
    or model       is distinct from btrim(model)
    or variant     is distinct from btrim(variant)
    or color       is distinct from btrim(color)
    or description is distinct from btrim(description);

commit;

-- Verify — both queries should return zero rows.
--
-- 1) nothing left untrimmed:
-- select id, make, model, variant, color from public.inventory
--  where make is distinct from btrim(make) or model is distinct from btrim(model)
--     or variant is distinct from btrim(variant) or color is distinct from btrim(color)
--     or description is distinct from btrim(description);
--
-- 2) no make or model was blank-only and has now become empty (there should be
--    none: make/model are required by the form, but worth confirming once):
-- select id, make, model from public.inventory where btrim(make) = '' or btrim(model) = '';

-- ===========================================================================
-- ROLLBACK — none. The removed whitespace carried no information, and the
-- original values are not recoverable. If that matters, snapshot first:
--   create table inventory_pre_0022 as select * from public.inventory;
-- ===========================================================================
