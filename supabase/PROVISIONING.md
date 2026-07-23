# Provisioning dashboard accounts

What makes an account an admin, a partner, or a photographer is its
**`app_metadata`** JWT claim (server-set, not user-editable). Both the app
(`authContextFromSession`) and the database (RLS via `public.app_role()` /
`public.app_showroom_id()`) read `role` and `showroom_id` from `app_metadata` —
never `user_metadata`.

> ## Partners: use the dashboard, not this runbook
>
> **Partner showrooms are now self-served.** An admin creates them from
> **Dashboard → Partners**: enter a showroom name, the partner's email and a
> password, and the showroom row *and* its login are created together with the
> right claim already stamped. The same screen resets a partner's password,
> toggles whether they may view The Collection's inventory, and removes a partner
> outright.
>
> That screen calls the `admin-partners` Edge Function, which is the only holder
> of the service-role key — the browser cannot create a user or set
> `app_metadata` with the anon key, which is exactly why the function exists.
>
> The SQL below remains the path for **admin** and **photographer** accounts
> (there is no UI for those), and as a fallback if the function is unavailable.

| role | `app_metadata` | Can do |
| --- | --- | --- |
| `admin` | `{ "role": "admin" }` | Everything, all showrooms. (No `showroom_id` needed.) |
| `partner` | `{ "role": "partner", "showroom_id": "<their showroom>" }` | Their own showroom's inventory only. |
| `photographer` | `{ "role": "photographer", "showroom_id": "11111111-1111-1111-1111-111111111111" }` | Add cars + edit photos/specs on **The Collection's** inventory only. No delete, no status change, no publish/feature, no enquiries/matching/notifications. |

The Collection's (master) showroom id is the fixed seed
`11111111-1111-1111-1111-111111111111` — a photographer is scoped to it exactly
like a partner is scoped to their own showroom.

## Steps (photographer — partners are identical, just a different role/showroom)

1. **Create the user.** Supabase Dashboard → Authentication → Users → *Add user*
   (email + password), or send an invite. Note the new user's email.

2. **Stamp the claim.** In the SQL editor (runs as service role):

   ```sql
   update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || '{"role":"photographer","showroom_id":"11111111-1111-1111-1111-111111111111"}'::jsonb
    where email = 'photographer@thecollection.pk';   -- ← the account's email
   ```

   For a **partner**, use their own showroom id instead:

   ```sql
   update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || '{"role":"partner","showroom_id":"<partner-showroom-uuid>"}'::jsonb
    where email = 'partner@example.com';
   ```

   (Equivalent via the Auth Admin API: `supabase.auth.admin.updateUserById(id,
   { app_metadata: { role: 'photographer', showroom_id: '1111…' } })`.)

3. **Verify the claim.**

   ```sql
   select email, raw_app_meta_data ->> 'role'        as role,
                 raw_app_meta_data ->> 'showroom_id'  as showroom_id
     from auth.users where email = 'photographer@thecollection.pk';
   ```

4. **The user must sign out and back in** for their JWT to carry the new claim.

## Guard rails (already enforced — nothing extra to do)

- A photographer scoped to the master showroom inherits inventory read/insert/
  update on The Collection's cars through the existing showroom-scoped RLS. They
  are denied enquiries and notifications (those policies are admin-only).
- **Never** put `role`/`showroom_id` in `user_metadata` — a user can edit their
  own `user_metadata` and would self-escalate. Only `app_metadata` is trusted.
- A missing/empty `showroom_id` for a partner or photographer means
  `app_showroom_id()` is null, so they see **zero** inventory rows (fail-closed) —
  a symptom of a mis-stamped claim, not a security hole.
