// The Collection — admin-partners Edge Function (Deno).
//
// The ONE privileged path for partner-showroom provisioning. Creating an auth
// user with a password, and stamping the trusted app_metadata claim
// ({ role:'partner', showroom_id }), both require the SERVICE ROLE key — which
// must never reach the browser bundle. So it lives here, server-side, and the
// dashboard calls this function with the admin's own session.
//
// SECURITY MODEL — the whole thing rests on step 2 below:
//   1. Only the service role can do any of this.
//   2. Therefore EVERY action re-verifies the caller's JWT and requires
//      app_metadata.role === 'admin'. app_metadata is server-set and not
//      user-editable; user_metadata is NEVER consulted (a user can edit their
//      own and would self-escalate).
//   3. CORS is not the boundary — the JWT check is. The origin allowlist below
//      is defence in depth, not the lock.
//
// Passwords are never logged, never persisted here, and never returned.
//
// Deploy:  supabase functions deploy admin-partners
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
//  automatically by the platform — do not set them yourself.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** The fixed master showroom (migration 0004). Never removable, never a partner. */
const MASTER_SHOWROOM_ID = "11111111-1111-1111-1111-111111111111";

/** Admin-set passwords are a human typing into a form — hold a real floor. */
const MIN_PASSWORD_LENGTH = 10;

const ALLOWED_ORIGINS = [
  "https://admin.thecollectionisb.pk",
  "http://localhost:3000",
  "http://localhost:5173",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

/** name -> url-safe slug. Collisions are resolved by the caller with a suffix. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "partner";
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);

  // --- 1) Verify the caller is a signed-in ADMIN ---------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing authorization." }, 401, origin);
  }

  // Validates signature + expiry against the project's JWKS.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return json({ error: "Invalid session." }, 401, origin);

  // app_metadata ONLY — never user_metadata.
  if ((user.app_metadata as { role?: string } | null)?.role !== "admin") {
    return json({ error: "Admin only." }, 403, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, origin);
  }
  const action = String(body.action ?? "");

  /** Partner accounts, keyed by the showroom they are scoped to. */
  async function partnersByShowroom(): Promise<Map<string, { id: string; email: string }[]>> {
    const map = new Map<string, { id: string; email: string }[]>();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const md = (u.app_metadata ?? {}) as { role?: string; showroom_id?: string };
      if (md.role !== "partner" || !md.showroom_id) continue;
      const list = map.get(md.showroom_id) ?? [];
      list.push({ id: u.id, email: u.email ?? "" });
      map.set(md.showroom_id, list);
    }
    return map;
  }

  try {
    switch (action) {
      // --- LIST -----------------------------------------------------------
      case "list": {
        const { data: showrooms, error } = await admin
          .from("showrooms")
          .select("id, slug, name, is_master, is_active, can_view_master, created_at")
          .eq("is_master", false)
          .order("name");
        if (error) throw error;

        const accounts = await partnersByShowroom();

        // Car counts, so the UI can warn before a destructive remove.
        const { data: cars, error: carsError } = await admin.from("inventory").select("showroom_id");
        if (carsError) throw carsError;
        const carCount = new Map<string, number>();
        for (const c of cars as { showroom_id: string }[]) {
          carCount.set(c.showroom_id, (carCount.get(c.showroom_id) ?? 0) + 1);
        }

        return json({
          partners: (showrooms ?? []).map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            isActive: s.is_active,
            canViewMaster: s.can_view_master,
            createdAt: s.created_at,
            carCount: carCount.get(s.id) ?? 0,
            accounts: accounts.get(s.id) ?? [],
          })),
        }, 200, origin);
      }

      // --- CREATE ---------------------------------------------------------
      case "create": {
        const name = String(body.name ?? "").trim();
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        const canViewMaster = Boolean(body.canViewMaster ?? false);

        if (!name) return json({ error: "Showroom name is required." }, 400, origin);
        if (!isEmail(email)) return json({ error: "A valid email is required." }, 400, origin);
        if (password.length < MIN_PASSWORD_LENGTH) {
          return json(
            { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
            400,
            origin,
          );
        }

        // Unique slug: base, then -2, -3, … Bounded so a pathological name
        // cannot spin here.
        const base = slugify(name);
        let slug = base;
        for (let n = 2; n <= 50; n++) {
          const { data: taken, error: slugError } = await admin
            .from("showrooms").select("id").eq("slug", slug).maybeSingle();
          if (slugError) throw slugError;
          if (!taken) break;
          slug = `${base}-${n}`;
        }

        const { data: showroom, error: insertError } = await admin
          .from("showrooms")
          .insert({ slug, name, is_master: false, is_active: true, can_view_master: canViewMaster })
          .select("id, slug, name, is_active, can_view_master, created_at")
          .single();
        if (insertError) throw insertError;

        // Create the login. If this fails the showroom row must NOT survive —
        // a tenant with no way in is worse than a clean failure.
        const { data: created, error: userError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // admin-provisioned; there is no invite flow
          app_metadata: { role: "partner", showroom_id: showroom.id },
        });

        if (userError || !created?.user) {
          await admin.from("showrooms").delete().eq("id", showroom.id);
          const msg = userError?.message ?? "Could not create the partner login.";
          const dup = /already|registered|exists/i.test(msg);
          return json(
            { error: dup ? `An account already exists for ${email}.` : msg },
            dup ? 409 : 400,
            origin,
          );
        }

        return json({
          partner: {
            id: showroom.id,
            slug: showroom.slug,
            name: showroom.name,
            isActive: showroom.is_active,
            canViewMaster: showroom.can_view_master,
            createdAt: showroom.created_at,
            carCount: 0,
            accounts: [{ id: created.user.id, email: created.user.email ?? email }],
          },
        }, 201, origin);
      }

      // --- SET VISIBILITY --------------------------------------------------
      case "set-visibility": {
        const showroomId = String(body.showroomId ?? "");
        const canViewMaster = Boolean(body.canViewMaster);
        if (!showroomId) return json({ error: "showroomId is required." }, 400, origin);
        if (showroomId === MASTER_SHOWROOM_ID) {
          return json({ error: "The Collection already sees everything." }, 400, origin);
        }
        const { error } = await admin
          .from("showrooms").update({ can_view_master: canViewMaster }).eq("id", showroomId);
        if (error) throw error;
        return json({ ok: true, showroomId, canViewMaster }, 200, origin);
      }

      // --- RESET PASSWORD --------------------------------------------------
      case "reset-password": {
        const userId = String(body.userId ?? "");
        const password = String(body.password ?? "");
        if (!userId) return json({ error: "userId is required." }, 400, origin);
        if (password.length < MIN_PASSWORD_LENGTH) {
          return json(
            { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
            400,
            origin,
          );
        }
        // Only ever reset a PARTNER account — never an admin or photographer.
        const { data: target, error: getError } = await admin.auth.admin.getUserById(userId);
        if (getError || !target?.user) return json({ error: "No such account." }, 404, origin);
        if ((target.user.app_metadata as { role?: string })?.role !== "partner") {
          return json({ error: "Only partner accounts can be reset here." }, 403, origin);
        }
        const { error } = await admin.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        return json({ ok: true }, 200, origin);
      }

      // --- REMOVE ----------------------------------------------------------
      case "remove": {
        const showroomId = String(body.showroomId ?? "");
        const force = Boolean(body.force ?? false);
        if (!showroomId) return json({ error: "showroomId is required." }, 400, origin);
        if (showroomId === MASTER_SHOWROOM_ID) {
          return json({ error: "The Collection cannot be removed." }, 400, origin);
        }

        // inventory.showroom_id is ON DELETE RESTRICT (0005), so cars must go
        // first — and only ever deliberately.
        const { count, error: countError } = await admin
          .from("inventory").select("id", { count: "exact", head: true }).eq("showroom_id", showroomId);
        if (countError) throw countError;

        if ((count ?? 0) > 0 && !force) {
          return json({ error: "has_cars", carCount: count ?? 0 }, 409, origin);
        }

        if ((count ?? 0) > 0) {
          // Remove the showroom's uploaded images before the rows that name
          // them, or the storage objects become unreachable orphans.
          const { data: objects } = await admin.storage
            .from("car-images").list(showroomId, { limit: 1000 });
          for (const folder of objects ?? []) {
            const { data: files } = await admin.storage
              .from("car-images").list(`${showroomId}/${folder.name}`, { limit: 1000 });
            const paths = (files ?? []).map((f) => `${showroomId}/${folder.name}/${f.name}`);
            if (paths.length) await admin.storage.from("car-images").remove(paths);
          }
          const { error: carsError } = await admin
            .from("inventory").delete().eq("showroom_id", showroomId);
          if (carsError) throw carsError;
        }

        // Delete the logins, then the tenant.
        const accounts = (await partnersByShowroom()).get(showroomId) ?? [];
        for (const a of accounts) {
          const { error: delUserError } = await admin.auth.admin.deleteUser(a.id);
          if (delUserError) throw delUserError;
        }

        const { error: delError } = await admin.from("showrooms").delete().eq("id", showroomId);
        if (delError) throw delError;

        return json({ ok: true, removedCars: count ?? 0, removedAccounts: accounts.length }, 200, origin);
      }

      default:
        return json({ error: `Unknown action "${action}".` }, 400, origin);
    }
  } catch (e) {
    // Never echo the request body — it may carry a password.
    const message = e instanceof Error ? e.message : "Unexpected error.";
    console.error(`[admin-partners] action=${action} failed:`, message);
    return json({ error: message }, 500, origin);
  }
});
