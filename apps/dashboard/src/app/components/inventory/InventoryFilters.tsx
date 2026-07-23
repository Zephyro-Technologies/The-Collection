import { useMemo } from "react";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Car } from "@collection/shared";
import {
  ANY, NONE, emptyCarFilter, isCarFilterActive,
  makeOptions, modelOptions, variantOptions, hasBlankVariant,
  type CarFilter, type FilterOption,
} from "./car-filter";

// Re-exported so screens can import the whole filter contract from the component
// they already use, without needing to know it lives in a sibling module.
export {
  ANY, NONE, emptyCarFilter, isCarFilterActive, matchesCarFilter, sanitizeCarFilter,
} from "./car-filter";
export type { CarFilter } from "./car-filter";

interface Props {
  /** Cars already narrowed to the visible showroom scope — options come from these. */
  cars: Car[];
  /**
   * The filter to display. Pass the SANITIZED filter (see sanitizeCarFilter), so
   * a selection that no longer exists in scope never reaches the Select as a
   * value with no matching item.
   */
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
 *
 * Each item's VALUE is the normalised key and its LABEL is a spelling found in
 * stock. Radix selects the displayed item by exact string equality, so binding to
 * the key is what stops a label change (a newly added "PORSCHE" outranking an
 * older "Porsche") leaving the trigger blank over a still-filtered grid.
 */
export function InventoryFilters({ cars, value, onChange, trailing }: Props) {
  const makes = useMemo(() => makeOptions(cars), [cars]);
  const models = useMemo(() => modelOptions(cars, value), [cars, value]);
  const variants = useMemo(() => variantOptions(cars, value), [cars, value]);
  const blankVariant = useMemo(() => hasBlankVariant(cars, value), [cars, value]);

  // Picking a make invalidates the model and variant beneath it; picking a model
  // invalidates the variant. Reset them rather than leaving an impossible pair.
  const setMake = (make: string) => onChange({ make, model: ANY, variant: ANY });
  const setModel = (model: string) => onChange({ ...value, model, variant: ANY });
  const setVariant = (variant: string) => onChange({ ...value, variant });

  const field = (
    label: string,
    v: string,
    on: (s: string) => void,
    options: FilterOption[],
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
          <SelectItem key={o.key} value={o.key}>
            {o.label}
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
        value.model === ANY || (variants.length === 0 && !blankVariant),
        blankVariant ? { value: NONE, label: "No variant" } : undefined,
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
