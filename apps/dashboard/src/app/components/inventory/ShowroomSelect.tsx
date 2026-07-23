import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../ui/utils";
import type { Showroom } from "@collection/shared";

interface Props {
  showrooms: Showroom[];
  activeShowroomId: string | "all";
  onChange: (id: string | "all") => void;
}

/**
 * Admin-only showroom context switcher, sized to sit in the screen header.
 *
 * This replaced a full-width banner. The banner's copy is gone, but the ONE
 * thing it existed to prevent must not be: the active showroom is a WORKING
 * context — it scopes the list AND stamps every new car — so adding a car while
 * a partner's showroom is selected files it under that partner. That is the
 * expensive mistake, and it is why the trigger goes amber for a partner context
 * instead of looking identical to the house one. "All" is read-only and the
 * caller disables Add, so it only needs to read as inert.
 */
export function ShowroomSelect({ showrooms, activeShowroomId, onChange }: Props) {
  const isAll = activeShowroomId === "all";
  const active = isAll ? undefined : showrooms.find((s) => s.id === activeShowroomId);
  const isPartner = !!active && !active.isMaster;
  // A specific id not (yet) in the loaded list — still loading, a failed load, or
  // a stale localStorage id. Render calm, never crash.
  const unresolved = !isAll && !active;

  const hint = isAll
    ? "Read-only overview. Select a showroom to add or edit cars."
    : isPartner
    ? `Partner showroom. New cars are filed under ${active.name}.`
    : active
    ? "Your showroom. New cars are added to The Collection."
    : "Resolving the active showroom…";

  return (
    <Select value={activeShowroomId} onValueChange={(v) => onChange(v as string | "all")}>
      <SelectTrigger
        aria-label="Active showroom"
        title={hint}
        className={cn(
          // Narrower on phones so it and "Add a car" still fit the header row.
          "h-9 w-[10.5rem] sm:w-[13.5rem] shrink-0",
          isPartner && "border-signal-amber/70 bg-signal-amber/10 text-noir",
          (isAll || unresolved) && "text-ink-60",
        )}
        style={{ fontSize: "0.8rem" }}
      >
        {/* Dot and value are wrapped as ONE flex child: the trigger lays its
            children out with justify-between, so a loose dot would be flung to
            the opposite end from the name it belongs to. The wrapper carries the
            clamp that the trigger's own `*:data-[slot=select-value]` rule can no
            longer reach, since SelectValue is not a direct child any more.
            A dot rather than a word because it survives a truncated name. */}
        <span className="flex min-w-0 items-center gap-1.5">
          {isPartner && (
            <span className="size-1.5 shrink-0 rounded-full bg-signal-amber" aria-hidden />
          )}
          <SelectValue className="line-clamp-1 text-left" />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        {showrooms.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
        <SelectItem value="all">All showrooms — read-only</SelectItem>
      </SelectContent>
    </Select>
  );
}
