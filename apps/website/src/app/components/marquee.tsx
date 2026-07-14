import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";

interface MarqueeProps {
  items: string[];
  /** Seconds for one full loop. Larger = slower. */
  duration?: number;
  className?: string;
  /** The surface the marquee sits on — the edge fades resolve into it. */
  fade?: string;
}

// A quiet, seamless marquee: the track is duplicated and translated -50%, so the
// loop is invisible. It never stops — not on hover, not on focus — and renders a
// static centred row when the visitor prefers reduced motion.
export function Marquee({ items, duration = 40, className = "", fade = "var(--surface-raised)" }: MarqueeProps) {
  const reduce = useReducedMotion();

  const Row = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((item, i) => (
        <Fragment key={`${item}-${i}`}>
          <span
            className="whitespace-nowrap px-8 text-[var(--text-muted)]"
            style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.1rem, 2.2vw, 1.6rem)", letterSpacing: "0.01em" }}
          >
            {item}
          </span>
          <span className="inline-block size-[5px] shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
        </Fragment>
      ))}
    </div>
  );

  if (reduce) {
    return (
      <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-3 ${className}`}>
        <Row />
      </div>
    );
  }

  return (
    <div className={`relative flex overflow-hidden ${className}`} aria-label={items.join(", ")}>
      {/* Edge fades resolve into the SECTION's own surface, so the track slides out
          of view instead of being smudged by a light band. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{ background: `linear-gradient(to right, ${fade}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{ background: `linear-gradient(to left, ${fade}, transparent)` }}
      />

      <motion.div
        className="flex"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        <Row />
        <Row ariaHidden />
      </motion.div>
    </div>
  );
}
