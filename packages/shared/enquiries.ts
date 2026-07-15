// The Collection — enquiries + matching (admin/Collection-only).
//
// Backed by the `enquiries` table + the match_enquiry SQL function (migrations
// 0010/0017). RLS restricts everything here to the admin (app_role()='admin'); a
// partner's queries return nothing and their realtime subscription receives
// nothing. Single-value car criteria per enquiry (v1). Matching is rules-based,
// on-demand, and spans ALL showrooms' inventory (the admin's RLS lets the
// SECURITY INVOKER function read every showroom). Only BUYING enquiries exist —
// a car offered for sale is added to inventory instead (migrations 0016-0018).

import { supabase } from "./supabase";

export type EnquiryType = "buying";
export type EnquiryStatus = "active" | "fulfilled" | "dismissed" | "archived";
export type EnquiryChannel = "whatsapp" | "instagram" | "messenger" | "phone" | "walk_in" | "other";
export type MatchTier = "exact" | "possible";

export interface Enquiry {
  id: string;
  type: EnquiryType;
  status: EnquiryStatus;
  // customer / contact
  customerName: string;
  customerPhone: string;
  customerId: string | null;
  channel: EnquiryChannel | null;
  // car criteria — a buyer's wishlist: year = MIN desired year, color = preferred,
  // mileageMaxKm = MAX acceptable, docsComplete = REQUIRES docs (true) / any
  // (null), price = budget (max).
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  color: string | null;
  mileageKm: number | null;      // vestigial (buyers use mileageMaxKm)
  mileageMaxKm: number | null;   // buyer's max acceptable mileage
  docsComplete: boolean | null;
  price: number | null;
  currency: string;
  notes: string | null;
  // outcome
  fulfilledSource: "inventory" | null;
  fulfilledRefId: string | null;
  fulfilledAt: string | null;
  // meta
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

interface EnquiryRow {
  id: string;
  type: EnquiryType;
  status: EnquiryStatus;
  customer_name: string;
  customer_phone: string;
  customer_id: string | null;
  channel: EnquiryChannel | null;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  color: string | null;
  mileage_km: number | null;
  mileage_max_km: number | null;
  docs_complete: boolean | null;
  price: number | null;
  currency: string;
  notes: string | null;
  fulfilled_source: "inventory" | null;
  fulfilled_ref_id: string | null;
  fulfilled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/** Fields the UI supplies when creating/updating an enquiry. `type` is set on
 *  create and never changed (it re-interprets the criteria columns). */
export interface EnquiryInput {
  type: EnquiryType;
  customerName: string;
  customerPhone: string;
  customerId?: string | null;
  channel?: EnquiryChannel | null;
  make: string;
  model: string;
  variant?: string | null;
  year?: number | null;
  color?: string | null;
  mileageKm?: number | null;
  mileageMaxKm?: number | null;
  docsComplete?: boolean | null;
  price?: number | null;
  currency?: string;
  notes?: string | null;
}

/** A match row from match_enquiry(): an inventory car that fits a buying enquiry,
 *  with its confidence tier. (`source` is always 'inventory' — sellers are now
 *  inventory. The customer/photo columns keep the DB function's 18-col shape;
 *  customerName/Phone/channel are always null for an inventory row.) */
export interface EnquiryMatch {
  source: "inventory";
  tier: MatchTier;
  refId: string;                 // inventory.id
  showroomId: string | null;
  showroomName: string | null;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  mileageKm: number | null;
  price: number | null;
  currency: string | null;
  status: string | null;         // inventory car_status
  docsComplete: boolean | null;
  customerName: string | null;   // always null (legacy shape)
  customerPhone: string | null;  // always null (legacy shape)
  channel: EnquiryChannel | null;
  photo: string | null;
}

// --- mappers ---------------------------------------------------------------

function rowToEnquiry(r: EnquiryRow): Enquiry {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerId: r.customer_id,
    channel: r.channel,
    make: r.make,
    model: r.model,
    variant: r.variant,
    year: r.year,
    color: r.color,
    mileageKm: r.mileage_km,
    mileageMaxKm: r.mileage_max_km,
    docsComplete: r.docs_complete,
    price: r.price,
    currency: r.currency,
    notes: r.notes,
    fulfilledSource: r.fulfilled_source,
    fulfilledRefId: r.fulfilled_ref_id,
    fulfilledAt: r.fulfilled_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    expiresAt: r.expires_at,
  };
}

/** Blank strings → null, so optional text criteria are stored as NULL (the match
 *  functions treat NULL/blank as "no preference"). */
const nn = (v: string | null | undefined): string | null => {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
};

function inputToRow(input: EnquiryInput): Omit<EnquiryRow,
  "id" | "status" | "fulfilled_source" | "fulfilled_ref_id" | "fulfilled_at" |
  "created_by" | "created_at" | "updated_at" | "expires_at"> {
  return {
    type: input.type,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone.trim(),
    customer_id: input.customerId ?? null,
    channel: input.channel ?? null,
    make: input.make.trim(),
    model: input.model.trim(),
    variant: nn(input.variant),
    year: input.year ?? null,
    color: nn(input.color),
    mileage_km: input.mileageKm ?? null,
    mileage_max_km: input.mileageMaxKm ?? null,
    docs_complete: input.docsComplete ?? null,
    price: input.price ?? null,
    currency: input.currency ?? "PKR",
    notes: nn(input.notes),
  };
}

// --- queries ---------------------------------------------------------------

export interface ListEnquiriesOpts {
  type?: EnquiryType;
  status?: EnquiryStatus;
  /** Only active + not expired (status='active' AND now() < expires_at). */
  activeOnly?: boolean;
  /** Only enquiries created today (local day). */
  today?: boolean;
}

/** Enquiries, newest first. Admin-only by RLS. */
export async function listEnquiries(opts: ListEnquiriesOpts = {}): Promise<Enquiry[]> {
  let query = supabase.from("enquiries").select("*").order("created_at", { ascending: false });
  if (opts.type) query = query.eq("type", opts.type);
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.activeOnly) query = query.eq("status", "active").gt("expires_at", new Date().toISOString());
  if (opts.today) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    query = query.gte("created_at", start.toISOString());
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as EnquiryRow[]).map(rowToEnquiry);
}

/** A single enquiry by id, or null. Admin-only by RLS. */
export async function getEnquiry(id: string): Promise<Enquiry | null> {
  const { data, error } = await supabase.from("enquiries").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null; // no matching row
    throw error;
  }
  return rowToEnquiry(data as EnquiryRow);
}

// --- mutations -------------------------------------------------------------

export async function createEnquiry(input: EnquiryInput): Promise<Enquiry> {
  const { data, error } = await supabase.from("enquiries").insert(inputToRow(input)).select("*").single();
  if (error) throw error;
  return rowToEnquiry(data as EnquiryRow);
}

export async function updateEnquiry(id: string, input: EnquiryInput): Promise<Enquiry> {
  const { data, error } = await supabase.from("enquiries").update(inputToRow(input)).eq("id", id).select("*").single();
  if (error) throw error;
  return rowToEnquiry(data as EnquiryRow);
}

/** Change lifecycle status. When fulfilling, optionally record the matched
 *  inventory car it converted against. */
export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus,
  fulfilled?: { source: "inventory"; refId: string },
): Promise<Enquiry> {
  const patch: Record<string, unknown> = { status };
  if (status === "fulfilled") {
    patch.fulfilled_at = new Date().toISOString();
    patch.fulfilled_source = fulfilled?.source ?? null;
    patch.fulfilled_ref_id = fulfilled?.refId ?? null;
  }
  const { data, error } = await supabase.from("enquiries").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return rowToEnquiry(data as EnquiryRow);
}

/** Reset the 1-month expiry window and reactivate. Day-clamps like Postgres
 *  interval math (renewing on Jan 31 → Feb 28, not overflowing into March), so
 *  client renewal agrees with the table's `now() + interval '1 month'` default. */
export async function renewEnquiry(id: string): Promise<Enquiry> {
  const expiresAt = new Date();
  const day = expiresAt.getDate();
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  if (expiresAt.getDate() !== day) expiresAt.setDate(0); // overflowed → last day of intended month
  const { data, error } = await supabase
    .from("enquiries")
    .update({ status: "active", expires_at: expiresAt.toISOString(), fulfilled_source: null, fulfilled_ref_id: null, fulfilled_at: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToEnquiry(data as EnquiryRow);
}

/** Hard-delete — admin escape hatch for a mis-entered row (archive is normal). */
export async function deleteEnquiry(id: string): Promise<void> {
  const { error } = await supabase.from("enquiries").delete().eq("id", id);
  if (error) throw error;
}

// --- matching (on-demand, rules-based, SECURITY INVOKER RPCs) --------------

/** Matches for a buying enquiry: inventory across all showrooms, each tiered
 *  exact/possible. Exact-first, ordered by the function. */
export async function matchEnquiry(id: string): Promise<EnquiryMatch[]> {
  const { data, error } = await supabase.rpc("match_enquiry", { p_enquiry_id: id });
  if (error) throw error;
  return (data as Array<Record<string, unknown>>).map((r) => ({
    source: r.source as EnquiryMatch["source"],
    tier: r.tier as MatchTier,
    refId: r.ref_id as string,
    showroomId: (r.showroom_id as string) ?? null,
    showroomName: (r.showroom_name as string) ?? null,
    make: r.make as string,
    model: r.model as string,
    variant: (r.variant as string) ?? null,
    year: (r.year as number) ?? null,
    mileageKm: (r.mileage_km as number) ?? null,
    price: (r.price as number) ?? null,
    currency: (r.currency as string) ?? null,
    status: (r.status as string) ?? null,
    docsComplete: (r.docs_complete as boolean) ?? null,
    customerName: (r.customer_name as string) ?? null,
    customerPhone: (r.customer_phone as string) ?? null,
    channel: (r.channel as EnquiryChannel) ?? null,
    photo: (r.photo as string) ?? null,
  }));
}

// --- helpers / realtime ----------------------------------------------------

/** Active = status 'active' AND not past its 1-month expiry. */
export function isEnquiryActive(e: Enquiry): boolean {
  return e.status === "active" && new Date(e.expiresAt).getTime() > Date.now();
}

/**
 * Live enquiries: calls `onChange` on any insert/update/delete so the caller can
 * re-fetch. Returns an unsubscribe function — call it on unmount. Admin-only in
 * practice: RLS filters the realtime stream (a partner receives nothing).
 */
export function subscribeEnquiries(onChange: () => void): () => void {
  const channel = supabase
    .channel("enquiries-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
