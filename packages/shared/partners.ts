// The Collection — partner-showroom provisioning (admin-only).
//
// Thin client over the `admin-partners` Edge Function, which is the only place
// the SERVICE ROLE key exists. Creating a login with a password and stamping the
// app_metadata claim ({ role:'partner', showroom_id }) cannot be done from the
// browser with the anon key — that is the whole point of the function, and the
// reason this module makes network calls instead of touching tables directly.
//
// Every call carries the caller's session automatically (functions.invoke sends
// the Authorization header), and the function rejects anyone whose
// app_metadata.role is not 'admin'. RLS is not the boundary here — the function's
// own admin check is.

import { supabase } from "./supabase";

export interface PartnerAccount {
  id: string;
  email: string;
}

export interface Partner {
  /** The showroom id — the tenant key every car carries. */
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  /** May this partner SEE The Collection's inventory? Read-only either way. */
  canViewMaster: boolean;
  /**
   * May this partner SEE every OTHER partner's inventory? Read-only, and
   * one-directional — granting it to A does not let B see A (migration 0021).
   */
  canViewPartners: boolean;
  createdAt: string;
  /** Cars currently filed under this showroom — drives the remove confirmation. */
  carCount: number;
  /** Login accounts scoped to this showroom (normally exactly one). */
  accounts: PartnerAccount[];
}

export interface CreatePartnerInput {
  name: string;
  email: string;
  password: string;
  canViewMaster?: boolean;
  canViewPartners?: boolean;
}

/**
 * The two independent read-visibility axes, as a COMPLETE desired state — both
 * fields are required even when only one switch moved.
 *
 * That is deliberate and load-bearing. An older deployment of the Edge Function
 * read `Boolean(body.canViewMaster)` unconditionally, so a partial patch that
 * omitted it wrote `can_view_master = false` and silently revoked a grant the
 * operator never touched, while returning 200. Sending the full state means the
 * worst an out-of-date function can do is rewrite a value to what it already
 * was. Never reintroduce partial patches here.
 */
export interface PartnerAccess {
  canViewMaster: boolean;
  canViewPartners: boolean;
}

/** Thrown when a remove is refused because the showroom still holds cars. */
export interface PartnerHasCarsError extends Error {
  code: "has_cars";
  carCount: number;
}

/** True when a failed removePartner() needs an explicit force confirmation. */
export function isPartnerHasCarsError(e: unknown): e is PartnerHasCarsError {
  return e instanceof Error && (e as PartnerHasCarsError).code === "has_cars";
}

/**
 * Invoke the function and unwrap its error shape.
 *
 * functions.invoke() reports any non-2xx as a generic "non-2xx status code",
 * burying the function's own message in the raw Response. Dig it out so the UI
 * can show "An account already exists for …" instead of an HTTP platitude.
 */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-partners", { body });
  if (!error) return data as T;

  let message = error.message;
  let payload: { error?: string; carCount?: number } | null = null;
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      payload = await context.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* non-JSON body — keep the original message */
    }
  }

  const err = new Error(message) as PartnerHasCarsError;
  if (payload?.error === "has_cars") {
    err.code = "has_cars";
    err.carCount = payload.carCount ?? 0;
    err.message = `This showroom still has ${err.carCount} car${err.carCount === 1 ? "" : "s"}.`;
  }
  throw err;
}

/**
 * Normalise a partner off the wire.
 *
 * An older function build omits `canViewPartners` from its response entirely.
 * Left undefined it would reach a Radix <Switch checked={undefined}>, which
 * silently becomes UNCONTROLLED — it would render off, ignore the real database
 * value, and then drift as the operator clicked it. Coerce to the DB defaults,
 * exactly as showrooms.ts does for the same columns.
 */
function normalisePartner(p: Partner): Partner {
  return {
    ...p,
    canViewMaster: p.canViewMaster ?? false,
    canViewPartners: p.canViewPartners ?? false,
    accounts: p.accounts ?? [],
    carCount: p.carCount ?? 0,
  };
}

/** Every partner showroom, with its login accounts and car count. Admin-only. */
export async function listPartners(): Promise<Partner[]> {
  const { partners } = await call<{ partners: Partner[] }>({ action: "list" });
  return (partners ?? []).map(normalisePartner);
}

/**
 * Create a partner showroom AND its login in one step.
 *
 * The password is set by The Collection on the partner's behalf; it is sent over
 * HTTPS to the function, used once, and never stored or returned. If the login
 * cannot be created the showroom row is rolled back, so a half-provisioned
 * tenant with no way in can never exist.
 */
export async function createPartner(input: CreatePartnerInput): Promise<Partner> {
  const { partner } = await call<{ partner: Partner }>({
    action: "create",
    name: input.name,
    email: input.email,
    password: input.password,
    canViewMaster: input.canViewMaster ?? false,
    canViewPartners: input.canViewPartners ?? false,
  });
  return normalisePartner(partner);
}

/**
 * Grant or revoke what this partner may SEE — The Collection's inventory
 * (migration 0020), other partners' inventory (0021), or both. Read-only in
 * every case: neither flag grants any write, publish or feature ability.
 *
 * Takes effect on the partner's next query, with no re-login, because these are
 * columns rather than JWT claims. Pass only the axis being changed.
 */
export async function setPartnerAccess(showroomId: string, access: PartnerAccess): Promise<void> {
  // Always both axes — see PartnerAccess. Do not narrow this to the axis that
  // changed; an older function build would read the missing one as false.
  await call({
    action: "set-visibility",
    showroomId,
    canViewMaster: access.canViewMaster,
    canViewPartners: access.canViewPartners,
  });
}

/** Set a new password on a partner login. Refused for non-partner accounts. */
export async function resetPartnerPassword(userId: string, password: string): Promise<void> {
  await call({ action: "reset-password", userId, password });
}

/**
 * Remove a partner showroom: its logins, then the tenant row.
 *
 * Refuses with a `has_cars` error when the showroom still holds inventory
 * (inventory.showroom_id is ON DELETE RESTRICT). Call again with
 * `{ force: true }` only after the operator has confirmed — that path also
 * deletes the cars and their uploaded images, and is not reversible.
 */
export async function removePartner(
  showroomId: string,
  opts?: { force?: boolean },
): Promise<{ removedCars: number; removedAccounts: number }> {
  return call<{ removedCars: number; removedAccounts: number }>({
    action: "remove",
    showroomId,
    force: opts?.force ?? false,
  });
}
