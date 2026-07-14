import { useMemo, useState } from "react";
import { CarCard } from "../car-card";
import { Reveal } from "../reveal";
import { byDisplayOrder, type CarStatus } from "../../data/cars";
import { useInventory } from "../../data/use-inventory";
import { CollectionSkeleton, LoadError } from "../states";
import { useDocumentTitle } from "../../hooks/use-document-title";

type StatusFilter = "all" | CarStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
];

export function Collection() {
  const { cars, state, retry } = useInventory();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [make, setMake] = useState("All makes");
  useDocumentTitle("The Collection · Available Motorcars, Islamabad");

  const makes = useMemo(
    () => ["All makes", ...Array.from(new Set(cars.map((c) => c.make)))],
    [cars],
  );

  // Every car shows — available, reserved AND sold. Ordered available-first so
  // the collection still reads well; filtering/search is client-side.
  const filtered = useMemo(
    () =>
      [...cars]
        .sort(byDisplayOrder)
        .filter(
          (c) =>
            (status === "all" || c.status === status) &&
            (make === "All makes" || c.make === make),
        ),
    [cars, status, make],
  );

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Editorial header (offset for the fixed nav) */}
      <header className="mx-auto max-w-[1240px] px-6 pt-32 pb-12 lg:px-10 lg:pt-40 lg:pb-16">
        <Reveal>
          <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">
            A curated inventory · Islamabad
          </span>
          <h1
            className="mt-5 max-w-3xl"
            style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.015em" }}
          >
            A considered selection
          </h1>
          <p className="mt-6 max-w-xl text-[var(--text-body)]" style={{ lineHeight: 1.7, fontSize: "1.02rem" }}>
            Each motorcar here has been acquired for its provenance and condition, verified and held
            with a complete history.
            {state === "ready" && cars.length > 0 ? ` ${cars.length} presently in the collection.` : ""}
          </p>
        </Reveal>
      </header>

      {/* Quiet filters — accent marks only the active option */}
      <div className="sticky top-[64px] z-30 border-y border-[var(--border)] bg-surface-page/86 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {STATUS_FILTERS.map((f) => {
              const active = status === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setStatus(f.value)}
                  className="relative rounded-sm pb-1 text-[0.72rem] uppercase tracking-[0.14em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-page)]"
                  style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {f.label}
                  {active && <span className="absolute inset-x-0 bottom-0 h-px bg-[var(--accent)]" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {makes.map((m) => {
              const active = make === m;
              return (
                <button
                  key={m}
                  onClick={() => setMake(m)}
                  className="rounded-sm text-[0.72rem] tracking-[0.02em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-page)]"
                  style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-[1240px] px-6 py-16 lg:px-10 lg:py-20">
        {state === "loading" ? (
          <CollectionSkeleton />
        ) : state === "error" ? (
          <LoadError onRetry={retry} />
        ) : filtered.length > 0 ? (
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((car, i) => (
              <Reveal key={car.id} delay={(i % 3) * 0.08}>
                <CarCard car={car} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="py-24 text-center">
            <p style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.4rem" }}>The collection is being prepared.</p>
            <p className="mt-3 text-[var(--text-body)]">
              New acquisitions are arriving. Enquire, and we will look on your behalf.
            </p>
          </div>
        ) : (
          <div className="py-24 text-center">
            <p style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.4rem" }}>Nothing to show, for now.</p>
            <p className="mt-3 text-[var(--text-body)]">
              The right motorcar is often found before it is listed. Enquire, and we will look on your behalf.
            </p>
            <button
              onClick={() => {
                setStatus("all");
                setMake("All makes");
              }}
              className="mt-8 border border-[var(--text-muted)] px-6 py-3 text-[0.72rem] uppercase tracking-[0.14em]"
            >
              Reset filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
