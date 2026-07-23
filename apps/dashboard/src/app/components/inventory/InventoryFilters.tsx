import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Car } from "@collection/shared";
import { ANY, NONE, distinct, includesValue, key, sameValue, emptyCarFilter, isCarFilterActive, type CarFilter } from "./car-filter";

// Re-exported so screens can import the filter contract from the component they
// already use, without needing to know it lives in a sibling module.
export { ANY, NONE, emptyCarFilter, isCarFilterActive, matchesCarFilter } from "./car-filter";
export type { CarFilter } from "./car-filter";

interface Props {
  /** Cars already narrowed to the visible showroom scope — options come from these. */
  cars: Car[];
  value: CarFilter;
  onChange: (next: CarFilter) => void;
  /** Rendered at the end of the row, e.g. a result count. */
  trailing?: React.ReactNode;
}

/**
 * Cascading make → model → variant filters for the inventory.
 *
 * Options are derived from the cars actually in scope rather than a fixed list,
 * so a showroom only ever offers what it holds. They cascade: picking a make
 * narrows the models, and make+model narrows the variants — so the dropdowns can
 * never offer a combination that yields nothing.
 *
 * Deliberately independent of the status filter and the search box. Letting those
 * narrow the options too would make the lists shift under the operator as they
 * type, which reads as the UI losing data.
 */
export function InventoryFilters({ cars, value, onChange, trailing }: Props) {
  const makes = useMemo(() => distinct(cars.map((c) => c.make)), [cars]);

  const models = useMemo(
    () => distinct(cars.filter((c) => value.make === ANY || sameValue(c.make, value.make)).map((c) => c.model)),
    [cars, value.make],
  );

  // The cars the variant control is choosing between, after make/model narrowing.
  const variantScope = useMemo(
    () =>
      cars
        .filter((c) => value.make === ANY || sameValue(c.make, value.make))
        .filter((c) => value.model === ANY || sameValue(c.model, value.model)),
    [cars, value.make, value.model],
  );

  const variants = useMemo(() => distinct(variantScope.map((c) => c.variant)), [variantScope]);

  // Offer "No variant" only when some car in scope actually has none — otherwise
  // it would be an option guaranteed to return nothing.
  const hasBlankVariant = useMemo(
    () => variantScope.some((c) => key(c.variant) === ""),
    [variantScope],
  );

  // Drop a selection that no longer exists — the admin switched showroom context,
  // or the car was sold and removed by the live inventory feed. Without this the
  // grid would sit empty with a filter naming something that isn't there, and no
  // obvious way back. Converges: every branch resets to ANY, which is always valid.
  useEffect(() => {
    const variantStillValid =
      value.variant === ANY ||
      (value.variant === NONE ? hasBlankVariant : includesValue(variants, value.variant));

    if (value.make !== ANY && !includesValue(makes, value.make)) {
      onChange(emptyCarFilter());
    } else if (value.model !== ANY && !includesValue(models, value.model)) {
      onChange({ ...value, model: ANY, variant: ANY });
    } else if (!variantStillValid) {
      onChange({ ...value, variant: ANY });
    }
  }, [makes, models, variants, hasBlankVariant, value, onChange]);

  // Picking a make invalidates the model and variant beneath it; picking a model
  // invalidates the variant. Reset them rather than leaving an impossible pair.
  const setMake = (make: string) => onChange({ make, model: ANY, variant: ANY });
  const setModel = (model: string) => onChange({ ...value, model, variant: ANY });
  const setVariant = (variant: string) => onChange({ ...value, variant });

  const field = (
    label: string,
    v: string,
    on: (s: string) => void,
    options: string[],
    disabled: boolean,
    /** An extra sentinel entry appended after the real options, e.g. "No variant". */
    extra?: { value: string; label: string },
  ) => (
    <Select value={v} onValueChange={on} disabled={disabled}>
      <SelectTrigger
        className="h-9 w-[9.5rem] bg-input-background"
        style={{ fontSize: "0.8rem" }}
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{`All ${label.toLowerCase()}s`}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
        {extra && <SelectItem value={extra.value}>{extra.label}</SelectItem>}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {field("Make", value.make, setMake, makes, makes.length === 0)}
      {/* Model and variant stay disabled until there is something to choose
          between — with no make picked they would list every model in stock. */}
      {field("Model", value.model, setModel, models, value.make === ANY || models.length === 0)}
      {field(
        "Variant",
        value.variant,
        setVariant,
        variants,
        value.model === ANY || (variants.length === 0 && !hasBlankVariant),
        hasBlankVariant ? { value: NONE, label: "No variant" } : undefined,
      )}

      {isCarFilterActive(value) && (
        <button
          onClick={() => onChange(emptyCarFilter())}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-ink-60 hover:text-noir hover:bg-platinum-soft transition-colors"
          style={{ fontSize: "0.75rem" }}
        >
          <X size={13} /> Clear
        </button>
      )}

      {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
    </div>
  );
}
