// The Collection — the shared car domain type.
//
// Single source of truth for a car's shape. Imported by both apps (the dashboard
// reads + writes, the website reads) and by the Supabase inventory layer in this
// same package. Extracted from the dashboard's mock.ts so the type never drifts.

export type CarStatus = "available" | "reserved" | "sold";

export interface Car {
  id: string;
  /** The showroom (tenant) that owns this car — every car belongs to exactly one. */
  showroomId: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  mileageKm: number;
  colour: string;
  price: number;
  status: CarStatus;
  image: string;
  addedAt: string;
  // Backed by the Supabase `inventory` table (see inventory.ts). Optional so the
  // legacy mock data and the existing Inventory form stay valid; `image` is kept
  // as a convenience alias for `photos[0]` for the screens that read it.
  currency?: string;
  photos?: string[];
  description?: string;
  // Whether the car has complete original documents. The dealership's own stock
  // always does, so this defaults to true (in the form, the mapper, and the DB
  // column). Only a docs-complete car can be an EXACT match for a buyer that
  // requires full docs — see match_enquiry (migration 0013).
  docsComplete?: boolean;
}
