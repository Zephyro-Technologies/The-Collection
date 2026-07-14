-- The Collection — Enquiries reverse-push + Realtime
-- ===========================================================================
-- (Q3) Preserves re-engagement's headline behaviour: when a car is added to
-- inventory (by ANY showroom — master or partner), if it matches one or more
-- ACTIVE buying enquiries, notify the admin via the existing notifications table
-- (0007). (Q12) Publishes `enquiries` for Realtime so multiple Collection admins
-- see live list updates.
--
-- APPLY IN THE SUPABASE SQL EDITOR (runs as service role). Requires 0007
-- (notifications) and 0010 (enquiries). Re-runnable. Rollback at the bottom.
-- ===========================================================================

-- 1) REVERSE-PUSH TRIGGER ----------------------------------------------------
-- AFTER INSERT on inventory: count matching ACTIVE buying enquiries (same
-- make+model, case-insensitive) and, if any, insert an 'enquiry_match'
-- notification. SECURITY DEFINER so it can read enquiries (admin-only RLS) and
-- write notifications (also admin-only) regardless of who inserted the car — a
-- partner insert triggers it too. Matches the reverse-push spec message, e.g.
-- "New 2024 Ferrari 296 GTB matches 2 buying enquiries."
--
-- Note: this is independent of 0007's notify_partner_car_added (which fires only
-- for partner additions). A partner adding a matching car yields both a
-- "partner added a car" and an "enquiry_match" notification — by design.
create or replace function public.notify_matching_buying_enquiries()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_count integer;
begin
  -- Best-effort: the notification must NEVER roll back the car insert. An
  -- unhandled error in an AFTER INSERT trigger aborts the whole statement, so the
  -- body is wrapped and any failure is swallowed (the car still gets added).
  begin
    select count(*)
      into v_count
      from public.enquiries e
     where e.type = 'buying'
       and e.status = 'active'
       and now() < e.expires_at
       and lower(trim(e.make))  = lower(trim(new.make))
       and lower(trim(e.model)) = lower(trim(new.model));

    if v_count > 0 then
      insert into public.notifications (type, showroom_id, car_id, message)
      values (
        'enquiry_match',
        new.showroom_id,
        new.id,
        'New ' || new.year::text || ' ' || new.make || ' ' || new.model
          || ' matches ' || v_count::text || ' buying '
          || case when v_count = 1 then 'enquiry' else 'enquiries' end
      );
    end if;
  exception when others then
    -- swallow: adding the car is what matters; the alert is non-critical.
    null;
  end;

  return new;
end;
$$;

drop trigger if exists inventory_notify_enquiry_match on public.inventory;
create trigger inventory_notify_enquiry_match
  after insert on public.inventory
  for each row execute function public.notify_matching_buying_enquiries();

-- 2) REALTIME ----------------------------------------------------------------
-- Publish `enquiries` so the Matching screen live-updates across admins. RLS
-- still applies to Realtime, so only admins receive rows. Guarded for re-runs.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'enquiries'
  ) then
    alter publication supabase_realtime add table public.enquiries;
  end if;
end
$$;

-- ===========================================================================
-- ROLLBACK
-- ===========================================================================
-- do $$ begin
--   if exists (select 1 from pg_publication_tables
--     where pubname='supabase_realtime' and schemaname='public' and tablename='enquiries')
--   then alter publication supabase_realtime drop table public.enquiries; end if;
-- end $$;
-- drop trigger if exists inventory_notify_enquiry_match on public.inventory;
-- drop function if exists public.notify_matching_buying_enquiries();
