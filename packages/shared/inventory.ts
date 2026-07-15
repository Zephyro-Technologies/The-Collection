import { supabase } from "./supabase";
import type { Car, CarStatus } from "./car";

// ---------------------------------------------------------------------------
// Inventory data layer.
//
// Every read/write of the `inventory` table goes through this module. The rest
// of the app (and, later, the LLM bot) speaks the app's existing `Car` shape;
// this file is the single place that knows the database column names. Keeping
// the boundary here means the UI never changed when we moved off mock data, and
// the bot can `import { listAvailableCars } from "@collection/shared"` without
// touching React.
// ---------------------------------------------------------------------------

const TABLE = "inventory";

/** Used when a car has no photo so the UI always has something to render. */
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80";

/** Raw shape of a row in `public.inventory` (snake_case, DB column names). */
export interface InventoryRow {
  id: string;
  showroom_id: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  mileage: number;
  color: string;
  price: number;
  currency: string;
  status: CarStatus;
  photos: string[] | null;
  description: string | null;
  docs_complete: boolean;
  published: boolean;   // 0014 — website Collection listing
  featured: boolean;    // 0014 — website Featured strip (implies published)
  source: string;       // 0016 — 'internal' | 'seller_migrated'
  created_at: string;
  updated_at: string;
}

/** Fields the UI supplies when creating/updating a car (no id / timestamps).
 *  showroom_id is not part of the form — it is carried separately into addCar. */
export type CarInput = Omit<Car, "id" | "addedAt" | "showroomId">;

// --- mappers ---------------------------------------------------------------

/** DB row → the app's `Car` shape used throughout the UI. */
export function rowToCar(row: InventoryRow): Car {
  const photos = row.photos ?? [];
  return {
    id: row.id,
    showroomId: row.showroom_id,
    make: row.make,
    model: row.model,
    variant: row.variant,
    year: row.year,
    mileageKm: row.mileage,
    colour: row.color,
    price: row.price,
    currency: row.currency,
    status: row.status,
    image: photos[0] ?? DEFAULT_IMAGE,
    photos,
    description: row.description ?? "",
    // Older rows (pre-0013) may not carry the column; treat missing as true,
    // matching the DB default (the dealership's own stock has full docs).
    docsComplete: row.docs_complete ?? true,
    // Website visibility + provenance (0014/0016). Rows fetched before those
    // migrations won't carry the columns; fall back to the DB defaults.
    published: row.published ?? false,
    featured: row.featured ?? false,
    source: row.source ?? "internal",
    addedAt: row.created_at,
  };
}

/** App `Car` fields → DB columns for insert/update. Excludes showroom_id, which
 *  is stamped ONLY on insert (a car keeps its owner across edits — see addCar).
 *  `published`/`featured` are emitted ONLY when the caller supplies them (the
 *  admin form does; every other form leaves them undefined) so a non-admin write
 *  omits the columns entirely and the DB keeps its values — the publish guard
 *  trigger then has nothing to reject on a routine edit. `source` is never
 *  written from the app (DB default / the seller migration set it). */
type CarRowWrite = Omit<
  InventoryRow,
  "id" | "showroom_id" | "created_at" | "updated_at" | "published" | "featured" | "source"
> &
  Partial<Pick<InventoryRow, "published" | "featured">>;

function carToRow(input: CarInput): CarRowWrite {
  const photos = input.photos?.length
    ? input.photos
    : input.image
    ? [input.image]
    : [];
  const row: CarRowWrite = {
    make: input.make,
    model: input.model,
    variant: input.variant ?? "",
    year: input.year,
    mileage: input.mileageKm,
    color: input.colour ?? "",
    price: input.price,
    currency: input.currency ?? "PKR",
    status: input.status,
    photos,
    description: input.description ?? "",
    // Default true: the dealership's own stock has complete docs unless the
    // form's toggle is explicitly turned off for a rare no-docs car.
    docs_complete: input.docsComplete ?? true,
  };
  if (input.published !== undefined) row.published = input.published;
  if (input.featured !== undefined) row.featured = input.featured;
  return row;
}

// --- queries ---------------------------------------------------------------

/**
 * Cars, newest first. Optionally scoped to a single showroom.
 * - `{ showroomId }` → only that showroom's cars (the partner's own, or the
 *   admin's active context).
 * - omitted → every showroom's cars (the admin's "All" overview).
 * NOTE (Phase B): scoping here is a UI convenience; RLS still permits all reads.
 * Phase C makes RLS the real boundary.
 */
export async function listInventory(opts?: { showroomId?: string }): Promise<Car[]> {
  let query = supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.showroomId) query = query.eq("showroom_id", opts.showroomId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as InventoryRow[]).map(rowToCar);
}

/**
 * Available cars only, newest first.
 *
 * This is the function the LLM bot will reuse to answer availability questions,
 * so it lives in the shared data layer rather than in any component.
 */
export async function listAvailableCars(): Promise<Car[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as InventoryRow[]).map(rowToCar);
}

/**
 * A single car by id, or `null` if it does not exist. Backed by a
 * `.eq("id", id).single()` query. Used by the public website's detail page (and
 * anywhere a specific car must be resolved straight from the DB).
 */
export async function getCarById(id: string): Promise<Car | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // no matching row
    throw error;
  }
  return rowToCar(data as InventoryRow);
}

// --- mutations -------------------------------------------------------------

export async function addCar(input: CarInput, showroomId: string): Promise<Car> {
  const { data, error } = await supabase
    .from(TABLE)
    // showroom_id is stamped on insert from the caller's active context (the
    // admin's selected showroom, or the partner's own). RLS enforces it: a
    // partner can only insert rows for their own showroom.
    .insert({ ...carToRow(input), showroom_id: showroomId })
    .select("*")
    .single();
  if (error) throw error;
  return rowToCar(data as InventoryRow);
}

export async function updateCar(id: string, patch: CarInput): Promise<Car> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(carToRow(patch))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToCar(data as InventoryRow);
}

export async function changeCarStatus(id: string, status: CarStatus): Promise<Car> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToCar(data as InventoryRow);
}

export async function deleteCar(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

// --- realtime --------------------------------------------------------------

/**
 * Subscribe to live inventory changes (INSERT / UPDATE / DELETE by anyone). Calls
 * `onChange` on any change so the caller can re-fetch its current scope. Returns
 * an unsubscribe function — call it on unmount.
 *
 * Tenancy is enforced by RLS, which Realtime honours: the stream only carries
 * rows the subscriber may SELECT. So a partner receives events for their OWN
 * showroom's cars only (never another showroom's), and the admin receives events
 * across every showroom. We deliberately don't read the row payload here — the
 * caller re-queries — so DELETE events (which carry only the primary key) still
 * work without needing `replica identity full`.
 *
 * Requires `public.inventory` to be a member of the `supabase_realtime`
 * publication (see supabase/migrations/0008_inventory_realtime.sql).
 */
export function subscribeInventory(onChange: () => void): () => void {
  const channel = supabase
    .channel("inventory-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
