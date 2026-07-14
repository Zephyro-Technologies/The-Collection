import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import type { Showroom } from "@collection/shared";

interface Props {
  showrooms: Showroom[];
  activeShowroomId: string | "all";
  onChange: (id: string | "all") => void;
}

// Admin-only. The active showroom context is a WORKING context (it scopes the
// inventory shown AND stamps new cars) — so it must be unmistakable. Each context
// gets a distinct treatment so the admin never adds a car to the wrong showroom.
export function ShowroomBar({ showrooms, activeShowroomId, onChange }: Props) {
  const isAll = activeShowroomId === "all";
  const active = isAll ? undefined : showrooms.find((s) => s.id === activeShowroomId);
  const isOwn = active?.isMaster ?? false;
  const isPartner = !!active && !active.isMaster;
  // A specific id that isn't (yet) in the loaded list — showrooms still loading,
  // a load failure, or a stale localStorage id. Render calm, never crash.
  const unresolved = !isAll && !active;

  // house (own) = noir/accent; partner = amber caution; all/unresolved = muted.
  const tone = isAll || unresolved
    ? { bar: "bg-platinum-soft border-border text-ink-60", label: "text-ink-60", pill: "text-ink-40" }
    : isOwn
    ? { bar: "bg-noir border-noir text-cream", label: "text-cream", pill: "text-accent-on-dark" }
    : { bar: "bg-signal-amber/10 border-signal-amber/60 text-noir", label: "text-noir", pill: "text-signal-amber" };

  const pill = isAll ? "All" : isOwn ? "Your showroom" : isPartner ? "Partner" : "Showroom";
  const heading = isAll
    ? "Viewing all showrooms"
    : isOwn
    ? "Managing: The Collection"
    : isPartner
    ? `You are managing: ${active.name}`
    : "Loading showroom…";
  const sub = isAll
    ? "Read-only overview — select a showroom to add or edit cars."
    : isOwn
    ? "Your showroom. New cars are added to The Collection."
    : isPartner
    ? "Partner showroom. New cars you add here belong to this showroom."
    : "Resolving the active showroom…";

  return (
    <div className={`flex flex-col gap-3 rounded-lg border px-4 py-3 mb-6 sm:flex-row sm:items-center sm:justify-between ${tone.bar}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded px-1.5 py-0.5 ${tone.pill}`}
            style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, background: "rgba(255,255,255,0.12)" }}
          >
            {pill}
          </span>
          <span className={`truncate ${tone.label}`} style={{ fontWeight: 600, fontSize: "0.92rem", letterSpacing: "-0.01em" }}>
            {heading}
          </span>
        </div>
        <div className="mt-0.5" style={{ fontSize: "0.75rem", opacity: 0.82 }}>{sub}</div>
      </div>

      <Select value={activeShowroomId} onValueChange={(v) => onChange(v as string | "all")}>
        <SelectTrigger className="w-full sm:w-[240px] shrink-0 bg-white text-noir border-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {showrooms.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}{s.isMaster ? " · The Collection" : ""}
            </SelectItem>
          ))}
          <SelectItem value="all">All showrooms — read-only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
