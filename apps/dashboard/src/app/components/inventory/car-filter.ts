// Pure make/model/variant filter logic for the inventory.
//
// Deliberately free of React and Radix imports so it can be reasoned about — and
// exercised — on its own. InventoryFilters.tsx is the UI around it; this file is
// the meaning of the filter, and the ONE place matching is defined, so the
// dropdown options and the filtered grid can never disagree.

import type { Car } from "@collection/shared";

/**
 * Sentinel for "no filter on this field".
 *
 * NOT the empty string: Radix's Select reserves "" to mean "cleared", and a
 * <SelectItem> with an empty value throws. A car's `variant` is also legitimately
 * "" for models that have none, so "" is a real data value here and cannot double
 * as the wildcard.
 */
export const ANY = "__any";

/**
 * "This field is blank" — a filterable value in its own right.
 *
 * Variant is optional, and a car with none is stored as "". Without this the
 * blank-variant cars would be unreachable: they are excluded from the option list
 * (it drops empties) AND excluded by every named variant, so no setting of the
 * control could isolate them. Like ANY it cannot be "" itself.
 */
export const NONE = "__none";

export interface CarFilter {
  make: string;
  model: string;
  variant: string;
}

export const emptyCarFilter = (): CarFilter => ({ make: ANY, model: ANY, variant: ANY });

export const isCarFilterActive = (f: CarFilter) =>
  f.make !== ANY || f.model !== ANY || f.variant !== ANY;

/**
 * Comparison key for a make/model/variant.
 *
 * The Inventory form captures these as raw free text with no trimming or case
 * handling, so the same car can reach the database as "Porsche", "porsche" or
 * " Porsche ". Matching on the raw string would split one make across several
 * dropdown entries — and worse, an option built from a TRIMMED value would fail
 * to match the untrimmed row that produced it, so selecting a filter would hide
 * the very car that put it there. Everything here compares on this key.
 */
export const key = (v?: string) => (v ?? "").trim().toLowerCase();

export const sameValue = (a?: string, b?: string) => key(a) === key(b);

/** The single definition of what the filter selects. */
export function matchesCarFilter(car: Car, f: CarFilter): boolean {
  if (f.make !== ANY && !sameValue(car.make, f.make)) return false;
  if (f.model !== ANY && !sameValue(car.model, f.model)) return false;
  // NONE selects exactly the cars with no variant recorded — checked before the
  // named comparison, since it is not a value to compare against.
  if (f.variant === NONE) return key(car.variant) === "";
  if (f.variant !== ANY && !sameValue(car.variant, f.variant)) return false;
  return true;
}

/**
 * Distinct options, collapsed case- and whitespace-insensitively. The first
 * spelling encountered becomes the label, so the dropdown shows one "Porsche"
 * rather than three, and picking it matches every spelling in stock.
 */
export const distinct = (values: (string | undefined)[]) => {
  const byKey = new Map<string, string>();
  for (const raw of values) {
    const display = (raw ?? "").trim();
    if (!display) continue;
    if (!byKey.has(key(display))) byKey.set(key(display), display);
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
};

/** Is `v` among these options, compared on the normalised key? */
export const includesValue = (options: string[], v: string) =>
  options.some((o) => sameValue(o, v));
