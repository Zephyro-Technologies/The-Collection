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

/**
 * A filter holds normalised KEYS, never the spelling shown in the dropdown.
 *
 * This is the important invariant. The label is whichever spelling happened to be
 * encountered first, so it changes as stock changes — a newly added "PORSCHE"
 * outranks an older "Porsche" once the list re-sorts. If the filter stored the
 * label, Radix (which matches the selected item by EXACT string equality, and
 * only shows its placeholder for ""/undefined) would find no item matching the
 * held value and render the trigger completely blank, over a grid that is still
 * filtered — a control that looks broken with no visible cause. Storing the key
 * makes value and item agree by construction.
 */
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
 * The Inventory form captures these as free text. `carToRow` now trims on write,
 * but rows written before that still hold untrimmed values, and case is never
 * folded (no rule could correctly case "BMW", "McLaren" and "Mercedes-Benz"). So
 * the same make can be stored as "Porsche", "porsche" or " Porsche ", and only a
 * normalised key can treat them as one.
 */
export const key = (v?: string) => (v ?? "").trim().toLowerCase();

/** An option: the stable key that is filtered on, and a spelling to show. */
export interface FilterOption {
  key: string;
  label: string;
}

/** The single definition of what the filter selects. `f` holds keys. */
export function matchesCarFilter(car: Car, f: CarFilter): boolean {
  if (f.make !== ANY && key(car.make) !== f.make) return false;
  if (f.model !== ANY && key(car.model) !== f.model) return false;
  // NONE selects exactly the cars with no variant recorded — checked before the
  // named comparison, since it is not a value to compare against.
  if (f.variant === NONE) return key(car.variant) === "";
  if (f.variant !== ANY && key(car.variant) !== f.variant) return false;
  return true;
}

/**
 * Distinct options, collapsed case- and whitespace-insensitively. The first
 * spelling encountered becomes the label, so the dropdown shows one "Porsche"
 * rather than three; the key is what is actually filtered on, so a label change
 * can never invalidate a live selection.
 */
export const distinct = (values: (string | undefined)[]): FilterOption[] => {
  const byKey = new Map<string, string>();
  for (const raw of values) {
    const label = (raw ?? "").trim();
    if (!label) continue;
    if (!byKey.has(key(label))) byKey.set(key(label), label);
  }
  return Array.from(byKey, ([k, label]) => ({ key: k, label })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
};

const hasKey = (options: FilterOption[], k: string) => options.some((o) => o.key === k);

/** The makes available in scope. */
export const makeOptions = (cars: Car[]) => distinct(cars.map((c) => c.make));

/** The models available under the selected make. */
export const modelOptions = (cars: Car[], f: CarFilter) =>
  distinct(cars.filter((c) => f.make === ANY || key(c.make) === f.make).map((c) => c.model));

/** The cars the variant control is choosing between, after make/model narrowing. */
export const variantScope = (cars: Car[], f: CarFilter) =>
  cars
    .filter((c) => f.make === ANY || key(c.make) === f.make)
    .filter((c) => f.model === ANY || key(c.model) === f.model);

export const variantOptions = (cars: Car[], f: CarFilter) =>
  distinct(variantScope(cars, f).map((c) => c.variant));

export const hasBlankVariant = (cars: Car[], f: CarFilter) =>
  variantScope(cars, f).some((c) => key(c.variant) === "");

/**
 * Drop any part of the filter that no longer exists in scope — the admin switched
 * showroom, or the live feed removed the last matching car.
 *
 * Computed during render rather than corrected in an effect. An effect runs after
 * paint, so the operator would see a full empty grid for one frame before the
 * filter cleared itself. Returns the SAME object when nothing needs changing, so
 * it is safe to feed straight into a useMemo dependency.
 */
export function sanitizeCarFilter(f: CarFilter, cars: Car[]): CarFilter {
  if (!isCarFilterActive(f)) return f;

  if (f.make !== ANY && !hasKey(makeOptions(cars), f.make)) return emptyCarFilter();
  if (f.model !== ANY && !hasKey(modelOptions(cars, f), f.model)) {
    return { make: f.make, model: ANY, variant: ANY };
  }

  const variantValid =
    f.variant === ANY ||
    (f.variant === NONE ? hasBlankVariant(cars, f) : hasKey(variantOptions(cars, f), f.variant));
  if (!variantValid) return { make: f.make, model: f.model, variant: ANY };

  return f;
}
