-- The Collection — retire selling-enquiries, step 3: archive, delete, lock out
-- ===========================================================================
-- Active selling enquiries are now inventory (0016) and nothing matches against
-- selling any more (0017). This preserves every selling row (all statuses) in an
-- archive table, deletes them from enquiries, and tightens the type CHECK so no
-- new selling enquiry can ever be created again.
--
-- The fulfilled_source CHECK ('inventory','selling') is deliberately LEFT AS-IS:
-- historical BUYING enquiries fulfilled against a seller carry
-- fulfilled_source = 'selling', and tightening it would fail on those rows.
--
-- ⚠ CONFIRM THE CONSTRAINT NAME FIRST. 0010 declared the type check inline
--   (`type text ... check (type in ('buying','selling'))`), so Postgres
--   auto-named it. It is almost certainly `enquiries_type_check`, but verify with
--     select conname from pg_constraint
--      where conrelid = 'public.enquiries'::regclass and contype = 'c'
--        and pg_get_constraintdef(oid) ilike '%type%buying%selling%';
--   and adjust the DROP below if it differs.
--
-- APPLY IN THE SUPABASE SQL EDITOR (after 0017). Deletes rows — review first.
-- ===========================================================================

begin;

-- 1) ARCHIVE — nothing is lost silently (all statuses, incl. seller contact).
create table if not exists public._archive_selling_enquiries as
  select * from public.enquiries where type = 'selling';

-- 2) DELETE all selling rows. (Any historical buying row's fulfilled_ref_id that
--    pointed at a selling enquiry is now dangling — no FK, so no error; it is an
--    outcome pointer, not an integrity link.)
delete from public.enquiries where type = 'selling';

-- 3) LOCK OUT — no new selling enquiries. (Confirm the name per the header note.)
alter table public.enquiries drop constraint if exists enquiries_type_check;
alter table public.enquiries add constraint enquiries_type_check
  check (type in ('buying'));

commit;

-- ===========================================================================
-- ROLLBACK — restore selling rows and the original CHECK.
-- ===========================================================================
-- alter table public.enquiries drop constraint if exists enquiries_type_check;
-- alter table public.enquiries add constraint enquiries_type_check
--   check (type in ('buying','selling'));
-- insert into public.enquiries select * from public._archive_selling_enquiries
--   on conflict (id) do nothing;
-- drop table if exists public._archive_selling_enquiries;
