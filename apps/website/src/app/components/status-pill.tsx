import type { CarStatus } from "../data/cars";
import { statusLabel } from "../data/cars";

// One pill, three surfaces: the /collection grid, the featured cards on the
// landing page, and the car detail page. They sit on top of car photography, so
// nothing here may be translucent — a tinted fill lets a bright bonnet through
// and the label disappears.
//
// Every fill is SOLID and every label meets WCAG AA against its own fill, so the
// photo underneath is irrelevant. A hairline ring + a soft shadow lift the pill
// off the image; the ring is also what keeps SOLD legible on the detail page,
// where the pill sits on the near-black page rather than on a photograph.
//
//   available → signal green, dark ink   4.88:1   (reads "open" at a glance)
//   reserved  → signal amber, dark ink   5.43:1
//   sold      → charcoal, fog text       6.72:1   (deliberately the quiet one)
const SCHEME: Record<CarStatus, { bg: string; fg: string; dot: string; ring: string }> = {
  available: {
    bg: "var(--signal-good)",
    fg: "var(--on-accent)",
    dot: "var(--on-accent)",
    ring: "color-mix(in srgb, var(--cream) 26%, transparent)",
  },
  reserved: {
    bg: "var(--signal-amber)",
    fg: "var(--on-accent)",
    dot: "var(--on-accent)",
    ring: "color-mix(in srgb, var(--cream) 26%, transparent)",
  },
  sold: {
    bg: "var(--charcoal)",
    fg: "var(--text-body)",
    dot: "var(--text-muted)",
    ring: "color-mix(in srgb, var(--cream) 22%, transparent)",
  },
};

interface StatusPillProps {
  status: CarStatus;
  className?: string;
}

export function StatusPill({ status, className = "" }: StatusPillProps) {
  const { bg, fg, dot, ring } = SCHEME[status];
  return (
    <span
      className={`inline-flex items-center gap-[7px] rounded-full px-[11px] py-[5px] ${className}`}
      style={{
        backgroundColor: bg,
        boxShadow: `inset 0 0 0 1px ${ring}, 0 2px 10px color-mix(in srgb, var(--onyx) 38%, transparent)`,
      }}
    >
      <span className="inline-block size-[6px] shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
      <span
        style={{
          fontFamily: "var(--typeface-sans)",
          fontSize: "0.68rem",
          lineHeight: 1.2,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: fg,
          fontWeight: 600,
        }}
      >
        {statusLabel[status]}
      </span>
    </span>
  );
}
