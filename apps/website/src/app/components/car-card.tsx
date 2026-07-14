import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { StatusPill } from "./status-pill";
import { formatPKR, type Car } from "../data/cars";

interface CarCardProps {
  car: Car;
  /** Priority (eager) loading for above-the-fold cards. */
  priority?: boolean;
}

export function CarCard({ car, priority = false }: CarCardProps) {
  const reduce = useReducedMotion();

  return (
    <Link
      to={`/collection/${car.id}`}
      className="group block rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-page)]"
      aria-label={`${car.year} ${car.make} ${car.model} — view details`}
    >
      <div className="relative overflow-hidden bg-[var(--surface-raised)] rounded-[3px]">
        <div className="aspect-[4/3] overflow-hidden">
          <motion.div
            className="h-full w-full"
            whileHover={reduce ? undefined : { scale: 1.04 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <ImageWithFallback
              src={car.image}
              alt={`${car.year} ${car.make} ${car.model} ${car.variant}`}
              loading={priority ? "eager" : "lazy"}
              className="h-full w-full object-cover"
            />
          </motion.div>
        </div>

        <div className="absolute left-4 top-4">
          <StatusPill status={car.status} />
        </div>

        {/* Quiet gradient anchors the eye without shouting */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--surface-page) 28%, transparent), transparent)" }}
        />
      </div>

      <div className="flex items-start justify-between gap-4 pt-5">
        <div>
          <div className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {car.make} · {car.year}
          </div>
          <h3
            className="mt-2 text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]"
            style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.3rem", fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.01em" }}
          >
            {car.model}
          </h3>
          <div className="mt-1 text-[0.86rem] text-[var(--text-body)]">{car.variant}</div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="text-metal"
            style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.02rem", fontWeight: 500, whiteSpace: "nowrap" }}
          >
            {formatPKR(car.price, car.currency)}
          </div>
        </div>
      </div>
    </Link>
  );
}
