// Car details, presented with hierarchy.
//
// A car carries two kinds of information, and they should never look the same:
//
//   IDENTITY   make / model / variant — a NAME. Set in the display serif, the
//              way a car is named on the Inventory cards.
//   CRITERIA   year / mileage / price / colour / docs — BOUNDS and attributes.
//              Each has an implicit label ("2023+" means a year floor), so they
//              get a labelled treatment: outline chips where space is tight (the
//              deal row), a labelled spec grid where there's room (the sheet).
//
// The criteria chip is an OUTLINE chip on purpose — the match-count chips are
// FILLED. A spec should never be misread as a match count.

import type { Enquiry } from "@collection/shared";
import { formatCurrency } from "../../data/mock";

export interface Spec {
  /** Grid label in the sheet ("Max mileage"). */
  label: string;
  /** Compact + self-describing for a chip ("≤ 5,600 km"). */
  short: string;
  /** Spelled out for the sheet's grid, where the label carries the meaning. */
  long: string;
}

const km = (n: number) => `${n.toLocaleString()} km`;

interface Criteria {
  /** A buyer's wishlist — BOUNDS: year floor, mileage/price ceiling. */
  year?: number | null;
  mileage?: number | null;
  price?: number | null;
  currency?: string | null;
  color?: string | null;
  docs?: boolean | null;
}

// Reading order: broadest constraint to finest — year, mileage, money, colour, docs.
function build({ year, mileage, price, currency, color, docs }: Criteria): Spec[] {
  const out: Spec[] = [];

  if (year != null) out.push({ label: "Year", short: `${year}+`, long: `${year} or newer` });
  if (mileage != null) out.push({ label: "Max mileage", short: `≤ ${km(mileage)}`, long: km(mileage) });
  if (price != null) {
    const v = formatCurrency(price, currency ?? "PKR");
    out.push({ label: "Budget", short: `≤ ${v}`, long: v });
  }
  if (color) out.push({ label: "Colour", short: color, long: color });
  if (docs === true) out.push({ label: "Documents", short: "Full docs", long: "Complete originals required" });
  return out;
}

export function enquirySpecs(e: Enquiry): Spec[] {
  return build({
    year: e.year,
    mileage: e.mileageMaxKm,
    price: e.price,
    currency: e.currency,
    color: e.color,
    docs: e.docsComplete,
  });
}

/** The car's NAME: make + model in the display serif, variant a quiet second tier.
 *  `stack` drops the variant to its own line — it reads better in a narrow card. */
export function CarName({ make, model, variant, year, stack = false }: {
  make: string; model: string; variant?: string | null; year?: number | null; stack?: boolean;
}) {
  const name = `${year ? `${year} ` : ""}${make} ${model}`;
  if (stack) {
    return (
      <span className="block min-w-0">
        <span className="editorial text-noir block truncate" style={{ fontSize: "1.05rem", lineHeight: 1.25 }}>{name}</span>
        {variant && <span className="text-ink-60 block truncate" style={{ fontSize: "0.76rem" }}>{variant}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-1.5 min-w-0 max-w-full">
      <span className="editorial text-noir truncate" style={{ fontSize: "1rem", lineHeight: 1.2 }}>{name}</span>
      {variant && <span className="text-ink-60 truncate" style={{ fontSize: "0.78rem" }}>{variant}</span>}
    </span>
  );
}

/** Criteria as outline chips — for tight places. `title` spells out the label. */
export function SpecChips({ specs }: { specs: Spec[] }) {
  if (specs.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1 min-w-0">
      {specs.map((s) => (
        <span
          key={s.label}
          title={`${s.label}: ${s.long}`}
          className="inline-flex items-center whitespace-nowrap rounded-full border border-border text-ink-60 px-2 py-0.5"
          style={{ fontSize: "0.68rem", fontWeight: 500 }}
        >
          {s.short}
        </span>
      ))}
    </span>
  );
}

/** Criteria as a labelled spec grid — where there's room, every value readable on its own. */
export function SpecGrid({ specs }: { specs: Spec[] }) {
  if (specs.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
      {specs.map((s) => (
        <div key={s.label} className="min-w-0">
          <dt className="text-ink-40" style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
            {s.label}
          </dt>
          <dd className="text-noir mt-0.5" style={{ fontSize: "0.85rem", fontWeight: 500, lineHeight: 1.35 }}>
            {s.long}
          </dd>
        </div>
      ))}
    </dl>
  );
}
