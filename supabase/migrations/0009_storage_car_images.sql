-- The Collection — car-images Storage bucket + tenant-isolated RLS
-- ===========================================================================
-- Real file uploads for car photos. Partners upload ONLY into their own
-- showroom's path; the master admin may upload into ANY showroom's path (for the
-- context switcher). Mirrors the inventory RLS asymmetry from 0006
-- (admin = every showroom, partner = own showroom only).
--
-- APPLY THIS IN THE SUPABASE SQL EDITOR (it runs as the service role, which
-- bypasses RLS). Re-runnable: policies are dropped first and the bucket upserts
-- its settings. A commented ROLLBACK block is at the bottom.
--
-- Reuses the existing helpers from 0006:
--   public.app_role()        -> text  (auth.jwt() -> 'app_metadata' ->> 'role')
--   public.app_showroom_id() -> uuid  (nullif(... ->> 'showroom_id','')::uuid)
-- ===========================================================================

-- 1) BUCKET ------------------------------------------------------------------
-- public = true  -> anyone can DOWNLOAD an image by its URL via
--   /storage/v1/object/public/car-images/<path>  (this is what "public read
--   (anon)" means; that endpoint bypasses RLS, so the website needs no policy).
-- file_size_limit = 10 MB. allowed_mime_types is the EXPLICIT image set below —
--   enforced server-side by Storage on every upload, regardless of the client.
-- do UPDATE (not do nothing) so an already-existing bucket is re-hardened.
--
-- ⚠ Why an explicit list and NOT the broad `image/*`: a wildcard also matches
--   image/svg+xml, and an SVG can carry inline <script> that executes when the
--   object is served back with that content-type (stored XSS). The content-TYPE,
--   not the filename, is what gets served, so a name-based guard alone can't stop
--   it — the MIME allowlist is the real control, so SVG is excluded here. This
--   list mirrors the client (packages/shared/storage.ts) and the RLS extension
--   guard below, so the three layers agree and no valid upload is opaquely
--   rejected. If you truly want to accept any image type (re-opening the SVG
--   risk), swap in the commented `image/*` line.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'car-images',
  'car-images',
  true,
  10485760,                              -- 10 MB per file (bytes)
  array['image/jpeg','image/png','image/webp','image/avif','image/gif']  -- images, no SVG
  -- array['image/*']                    -- ← accept ANY image type (re-opens the SVG XSS risk)
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS is already ENABLED on storage.objects by default in Supabase — no ALTER
-- needed. A fresh project ships with no permissive policies there (all denied
-- except the service role, which bypasses RLS), so the four policies below only
-- GRANT the specific access we want.

-- ---------------------------------------------------------------------------
-- ⚠ THE [1] vs [0] GOTCHA (read before touching the policies)
-- ---------------------------------------------------------------------------
-- Object paths are  {showroom_id}/{car_id_or_uuid}/{filename}.
-- storage.foldername(name) returns the FOLDER segments as a Postgres text[],
-- EXCLUDING the filename. For 'aaaa.../bbbb.../pic.jpg' it returns
--   {aaaa..., bbbb...}
-- Postgres arrays are ONE-INDEXED, so the FIRST folder (the showroom_id) is
--   (storage.foldername(name))[1]      -- ✅ the owning showroom_id
-- NOT [0], which in Postgres is out of bounds and evaluates to NULL — a [0]
-- comparison would be NULL (never true) and would silently DENY every partner
-- upload. Always use [1].
-- ---------------------------------------------------------------------------

-- 2) READ (SELECT) -----------------------------------------------------------
-- Public image DOWNLOADS are already served to anon by the public-bucket CDN
-- endpoint above (it bypasses RLS), so no anon SELECT policy is needed to render
-- images on the website or dashboard.
-- We deliberately do NOT grant SELECT to anon/public: that would ALSO open the
-- list() API to anyone holding the site's anon key, letting them enumerate every
-- showroom's object keys (showroom_id / car_id / draft ids). Instead we scope
-- authenticated reads admin-or-own, mirroring the inventory table (0006).
drop policy if exists "car-images public read" on storage.objects;   -- remove any earlier draft
drop policy if exists "car-images authed read" on storage.objects;
create policy "car-images authed read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'car-images'
    and (
      public.app_role() = 'admin'
      or (storage.foldername(name))[1] = public.app_showroom_id()::text
    )
  );
-- ALTERNATIVE — uncomment ONLY if you specifically want an explicit anon SELECT
-- policy. It is NOT required for the website to display images, and it lets
-- anyone with the anon key enumerate every tenant's object keys via list():
-- create policy "car-images anon read"
--   on storage.objects for select to anon using ( bucket_id = 'car-images' );

-- 3) INSERT (upload) ---------------------------------------------------------
-- authenticated only; partner may write ONLY where the FIRST path folder equals
-- their JWT showroom_id; admin may write into ANY showroom's path.
-- The extension guard enforces images-only AT THE POLICY LEVEL (defense-in-depth;
-- the served-content-type control is the bucket's allowed_mime_types above). It
-- lists exactly the extensions the client (packages/shared/storage.ts) emits —
-- keys are built from a random uuid + a MIME-derived canonical extension — so a
-- legitimate upload can never be rejected here. storage.extension('a/b/c.jpg') ->
-- 'jpg'. Keep "=" (do NOT use "is not distinct from"): a claimless user has
-- app_showroom_id() = NULL, and "seg = NULL" is NULL (not true), so they are
-- correctly DENIED. A null-safe comparison would let them write root objects.
drop policy if exists "car-images insert own or admin" on storage.objects;
create policy "car-images insert own or admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'car-images'
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','avif','gif')
    and (
      public.app_role() = 'admin'
      or (storage.foldername(name))[1] = public.app_showroom_id()::text
    )
  );

-- 4) UPDATE ------------------------------------------------------------------
-- Same ownership rule. MUST keep BOTH using + with check: using gates which
-- existing rows may be targeted (blocks moving another showroom's object OUT);
-- with check gates the resulting name (blocks renaming/moving an object INTO
-- another showroom's prefix). Do not "simplify" to using-only.
drop policy if exists "car-images update own or admin" on storage.objects;
create policy "car-images update own or admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'car-images'
    and (
      public.app_role() = 'admin'
      or (storage.foldername(name))[1] = public.app_showroom_id()::text
    )
  )
  with check (
    bucket_id = 'car-images'
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','avif','gif')
    and (
      public.app_role() = 'admin'
      or (storage.foldername(name))[1] = public.app_showroom_id()::text
    )
  );

-- 5) DELETE ------------------------------------------------------------------
-- Same ownership rule (partner: only their own path; admin: any).
drop policy if exists "car-images delete own or admin" on storage.objects;
create policy "car-images delete own or admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'car-images'
    and (
      public.app_role() = 'admin'
      or (storage.foldername(name))[1] = public.app_showroom_id()::text
    )
  );

-- ===========================================================================
-- ROLLBACK — paste into the SQL editor to remove this feature.
-- ===========================================================================
-- drop policy if exists "car-images authed read"        on storage.objects;
-- drop policy if exists "car-images insert own or admin" on storage.objects;
-- drop policy if exists "car-images update own or admin" on storage.objects;
-- drop policy if exists "car-images delete own or admin" on storage.objects;
-- -- The bucket must be emptied before it can be removed:
-- -- delete from storage.objects where bucket_id = 'car-images';
-- -- delete from storage.buckets where id = 'car-images';
