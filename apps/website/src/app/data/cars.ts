// The Collection — website inventory access + presentation helpers.
//
// Car data now comes from Supabase via the shared package (@collection/shared),
// the single source of truth shared with the operator dashboard: cars added and
// managed in the dashboard appear here. This module re-exports the shared Car
// type and read queries, and keeps the website's own PKR / mileage / status
// presentation helpers.

import type { Car, CarStatus } from "@collection/shared";

export type { Car, CarStatus };
export { listInventory, getCarById } from "@collection/shared";

/**
 * Formats a PKR amount using the Pakistani crore / lakh convention.
 *   98,500,000  -> "PKR 9.85 Cr"
 *   7,100,000   -> "PKR 71 Lakh"
 * Trailing zeros in the decimal are trimmed for a cleaner, editorial read.
 */
export function formatPKR(price: number, currency: string = "PKR"): string {
  const crore = 10000000;
  const lakh = 100000;
  const trim = (n: number) => Number(n.toFixed(2)).toString();

  if (price >= crore) return `${currency} ${trim(price / crore)} Cr`;
  if (price >= lakh) return `${currency} ${trim(price / lakh)} Lakh`;
  return `${currency} ${price.toLocaleString("en-PK")}`;
}

export function formatMileage(km: number): string {
  return `${km.toLocaleString("en-PK")} km`;
}

export const statusLabel: Record<CarStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

// Collection display order: available first, then reserved, then sold — so the
// buyable cars lead and sold stock never dominates the top. Stable within a
// group, since listInventory() already returns newest-first.
const STATUS_ORDER: Record<CarStatus, number> = { available: 0, reserved: 1, sold: 2 };

export function byDisplayOrder(a: Car, b: Car): number {
  return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
}
