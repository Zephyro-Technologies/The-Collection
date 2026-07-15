import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { StatusPill } from "../status-pill";
import { WhatsAppIcon } from "../whatsapp-icon";
import { Reveal } from "../reveal";
import { CarCard } from "../car-card";
import { getCarById, listInventory, MASTER_SHOWROOM_ID, formatPKR, formatMileage, type Car } from "../../data/cars";
import { LoadError } from "../states";
import { whatsappLink, carViewingMessage, similarCarMessage, reservedCarMessage } from "../../../config/contact";
import { useDocumentTitle } from "../../hooks/use-document-title";

const pad = (n: number) => String(n).padStart(2, "0");

// ------------------------------------------------------------------ Gallery
function Gallery({ car }: { car: Car }) {
  const reduce = useReducedMotion();
  const photos = car.photos && car.photos.length ? car.photos : [car.image];
  const n = photos.length;
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const go = (delta: number) => {
    setDir(delta);
    setActive((a) => (a + delta + n) % n);
  };
  const jump = (i: number) => {
    setDir(i > active ? 1 : -1);
    setActive(i);
  };

  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, n]);

  const slide = reduce
    ? {}
    : {
        initial: (d: number) => ({ opacity: 0, x: d > 0 ? 36 : -36 }),
        animate: { opacity: 1, x: 0 },
        exit: (d: number) => ({ opacity: 0, x: d > 0 ? -36 : 36 }),
      };

  const ctrlBtn =
    "inline-flex size-11 items-center justify-center rounded-full border border-cream/45 text-[var(--text-primary)] backdrop-blur-sm transition-colors hover:bg-cream/16 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  const thumbStyle = (isActive: boolean) => ({
    outline: isActive ? "1.5px solid var(--accent)" : "1.5px solid transparent",
    outlineOffset: "3px",
    opacity: isActive ? 1 : 0.5,
  });

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Thumbnails — horizontal on mobile, vertical rail on desktop */}
        {n > 1 && (
          <div className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:max-h-[560px] lg:w-[88px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((photo, i) => (
              <button
                key={photo + i}
                ref={(el) => { thumbRefs.current[i] = el; }}
                onClick={() => jump(i)}
                className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[2px] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-page)] lg:w-full"
                style={thumbStyle(i === active)}
                aria-label={`View photograph ${i + 1}`}
                aria-current={i === active}
              >
                <ImageWithFallback src={photo} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="order-1 lg:order-2 lg:flex-1">
          <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[3px] bg-[var(--surface-raised)]">
            <AnimatePresence initial={false} custom={dir}>
              <motion.button
                key={active}
                type="button"
                onClick={() => setLightbox(true)}
                className="absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                custom={dir}
                variants={slide as never}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                aria-label="View full screen"
              >
                <ImageWithFallback
                  src={photos[active]}
                  alt={`${car.year} ${car.make} ${car.model} — photograph ${active + 1} of ${n}`}
                  className="h-full w-full object-cover"
                />
              </motion.button>
            </AnimatePresence>

            <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--onyx) 40%, transparent), transparent 34%)" }} />

            {/* Prev / next — centred on the left and right edges, only for multi-photo
                cars. stopPropagation so switching photos never opens the full view. */}
            {n > 1 && (
              <>
                <button
                  type="button"
                  className={`${ctrlBtn} absolute left-3 top-1/2 z-10 -translate-y-1/2`}
                  onClick={(e) => { e.stopPropagation(); go(-1); }}
                  aria-label="Previous photograph"
                >
                  <ChevronLeft className="size-5" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  className={`${ctrlBtn} absolute right-3 top-1/2 z-10 -translate-y-1/2`}
                  onClick={(e) => { e.stopPropagation(); go(1); }}
                  aria-label="Next photograph"
                >
                  <ChevronRight className="size-5" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col bg-[var(--surface-deep)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label={`${car.year} ${car.make} ${car.model} gallery`}
          >
            <div className="flex items-center justify-between px-6 py-5 lg:px-10" onClick={(e) => e.stopPropagation()}>
              <span
                className="text-[var(--text-primary)] tabular-nums"
                style={{ fontFamily: "var(--typeface-serif)", fontSize: "1rem", fontWeight: 500 }}
              >
                {n > 1 ? (
                  <>
                    {pad(active + 1)} <span className="text-cream/50">/ {pad(n)}</span>
                  </>
                ) : null}
              </span>
              <button
                className="inline-flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-opacity hover:opacity-80"
                onClick={() => setLightbox(false)}
              >
                Close <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4" onClick={(e) => e.stopPropagation()}>
              {n > 1 && (
                <button
                  className="absolute left-3 z-10 inline-flex size-12 items-center justify-center rounded-full border border-cream/35 text-[var(--text-primary)] transition-colors hover:bg-cream/14 lg:left-8"
                  onClick={() => go(-1)}
                  aria-label="Previous photograph"
                >
                  <ChevronLeft className="size-6" strokeWidth={1.4} />
                </button>
              )}

              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={active}
                  className="flex h-full w-full items-center justify-center"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ImageWithFallback
                    src={photos[active]}
                    alt={`${car.year} ${car.make} ${car.model} — photograph ${active + 1} of ${n}`}
                    className="max-h-[76vh] max-w-[92vw] object-contain"
                  />
                </motion.div>
              </AnimatePresence>

              {n > 1 && (
                <button
                  className="absolute right-3 z-10 inline-flex size-12 items-center justify-center rounded-full border border-cream/35 text-[var(--text-primary)] transition-colors hover:bg-cream/14 lg:right-8"
                  onClick={() => go(1)}
                  aria-label="Next photograph"
                >
                  <ChevronRight className="size-6" strokeWidth={1.4} />
                </button>
              )}
            </div>

            {n > 1 && (
              <div className="flex justify-center gap-3 px-6 py-6" onClick={(e) => e.stopPropagation()}>
                {photos.map((photo, i) => (
                  <button
                    key={photo + i}
                    onClick={() => jump(i)}
                    className="relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-[2px] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-page)] sm:w-20"
                    style={thumbStyle(i === active)}
                    aria-label={`View photograph ${i + 1}`}
                  >
                    <ImageWithFallback src={photo} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CarDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <section className="mx-auto max-w-[1320px] px-6 pt-28 lg:px-10 lg:pt-32">
        <div className="grid animate-pulse gap-10 motion-reduce:animate-none lg:grid-cols-[1.55fr_1fr] lg:gap-14 xl:gap-20">
          <div className="aspect-[4/3] w-full rounded-[3px] bg-[var(--surface-raised)]" />
          <div className="lg:pt-2">
            <div className="h-6 w-24 rounded-full bg-[var(--surface-raised)]" />
            <div className="mt-6 h-9 w-3/4 rounded bg-[var(--surface-raised)]" />
            <div className="mt-4 h-4 w-1/2 rounded bg-[var(--surface-raised)]" />
            <div className="mt-10 h-8 w-40 rounded bg-[var(--surface-raised)]" />
            <div className="mt-10 h-12 w-full rounded bg-[var(--surface-raised)]" />
          </div>
        </div>
      </section>
    </div>
  );
}

export function CarDetail() {
  const { id } = useParams();
  const [car, setCar] = useState<Car | null | undefined>(undefined); // undefined = loading, null = not found
  const [error, setError] = useState(false);
  const [all, setAll] = useState<Car[]>([]);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setCar(undefined);
    setError(false);
    if (!id) {
      setCar(null);
      return;
    }
    // A hung request should surface the calm error state, not skeletons forever.
    const timer = setTimeout(() => { if (alive) setError(true); }, 8000);
    getCarById(id)
      .then((c) => { if (alive) { clearTimeout(timer); setCar(c); } })
      .catch(() => { if (alive) { clearTimeout(timer); setError(true); } });
    listInventory({ showroomId: MASTER_SHOWROOM_ID })
      .then((list) => { if (alive) setAll(list); })
      .catch(() => {});
    return () => { alive = false; clearTimeout(timer); };
  }, [id, nonce]);

  useDocumentTitle(
    car
      ? `${car.year} ${car.make} ${car.model}${car.variant ? ` ${car.variant}` : ""} · The Collection`
      : "The Collection · Islamabad",
  );

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-page)] px-6">
        <LoadError
          onRetry={() => setNonce((n) => n + 1)}
          title="Unable to load"
          message="This motorcar could not be reached just now. Please try again in a moment."
        />
      </div>
    );
  }

  if (car === undefined) return <CarDetailSkeleton />;

  if (!car) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-page)] px-6 text-center">
        <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">Not found</span>
        <h1 className="mt-5" style={{ fontFamily: "var(--typeface-serif)", fontSize: "2rem", fontWeight: 500 }}>
          This motorcar is no longer listed
        </h1>
        <p className="mt-4 text-[var(--text-body)]">It may have been acquired, or the link is no longer current.</p>
        <Link
          to="/collection"
          className="mt-8 border border-[var(--text-muted)] px-6 py-3 text-[0.72rem] uppercase tracking-[0.14em]"
        >
          Back to the collection
        </Link>
      </div>
    );
  }

  const quickFacts = [
    { k: "Year", v: String(car.year) },
    { k: "Mileage", v: formatMileage(car.mileageKm) },
    { k: "Colour", v: car.colour },
  ];

  // Always show three related cars, ranked available-first then same-make — so an
  // available car always leads and a sold car never occupies the prime slot.
  const relRank = (c: Car) => (c.status === "available" ? 0 : 2) + (c.make === car.make ? 0 : 1);
  const alsoView = all
    .filter((c) => c.id !== car.id)
    .sort((a, b) => relRank(a) - relRank(b))
    .slice(0, 3);
  // Three-way enquiry, so no status is a dead end: available → ask about this car;
  // reserved → register interest in this specific car (reserved cars still
  // convert); sold → ask about something comparable.
  const enquireLabel =
    car.status === "available"
      ? "Enquire about this car"
      : car.status === "reserved"
      ? "Register interest"
      : "Enquire about a similar car";
  const enquireMessage =
    car.status === "available"
      ? carViewingMessage(car)
      : car.status === "reserved"
      ? reservedCarMessage(car)
      : similarCarMessage(car);
  const enquireHref = whatsappLink(enquireMessage);

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      {/* Above-the-fold: gallery + essentials side by side */}
      <section className="mx-auto max-w-[1320px] px-6 pt-28 lg:px-10 lg:pt-32">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <Link to="/collection" className="transition-colors hover:text-[var(--text-primary)]">The Collection</Link>
          <span className="text-[var(--accent)]">/</span>
          <span className="text-[var(--text-body)]">{car.make} {car.model}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-14 xl:gap-20">
          <Reveal>
            <Gallery car={car} />
          </Reveal>

          {/* Essentials */}
          <Reveal delay={0.05}>
            <div className="lg:sticky lg:top-28 lg:self-start">
              <StatusPill status={car.status} />
              <div className="mt-6 text-[0.72rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {car.make}
              </div>
              <h1
                className="mt-3"
                style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(2.1rem, 4.4vw, 3.1rem)", fontWeight: 500, lineHeight: 1.06, letterSpacing: "-0.015em" }}
              >
                {car.model}
              </h1>
              <div className="mt-3 text-[var(--text-body)]" style={{ fontSize: "1.05rem" }}>{car.variant}</div>

              <div className="mt-8 border-t border-[var(--border)] pt-6">
                <div className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">Guide price</div>
                {/* The metal gradient clipped into the numeral — large display only. */}
                <div
                  className="text-metal mt-2"
                  style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.9rem, 3.5vw, 2.4rem)", fontWeight: 500 }}
                >
                  {formatPKR(car.price, car.currency)}
                </div>
              </div>

              {/* Quick facts */}
              <div className="mt-7 grid grid-cols-3 gap-4">
                {quickFacts.map((f) => (
                  <div key={f.k} className="border-t border-[var(--border)] pt-4">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">{f.k}</div>
                    <div className="mt-1.5 text-[0.9rem] text-[var(--text-primary)]" style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", lineHeight: 1.35 }}>{f.v}</div>
                  </div>
                ))}
              </div>

              <a
                href={enquireHref}
                target="_blank"
                rel="noopener noreferrer"
                className="metal-fill sheen mt-9 flex w-full items-center justify-center gap-2.5 px-6 py-4 text-[0.78rem] font-semibold uppercase tracking-[0.14em]"
              >
                <WhatsAppIcon className="size-4" />
                {enquireLabel}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Below-the-fold: the motorcar — a full-width editorial description */}
      <section className="mx-auto max-w-[1320px] px-6 py-20 lg:px-10 lg:py-28">
        <div className="border-t border-[var(--border)] pt-14">
          <Reveal>
            <div>
              <h2 className="text-[0.66rem] font-normal uppercase tracking-[0.16em] text-[var(--accent)]" style={{ fontFamily: "var(--typeface-sans)" }}>Description</h2>
              <p
                className="mt-6 max-w-3xl text-[var(--text-primary)]"
                style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.05rem, 1.6vw, 1.3rem)", fontWeight: 500, lineHeight: 1.6, letterSpacing: "-0.01em" }}
              >
                {car.description}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Also in the collection */}
      <section className="border-t border-[var(--border)] bg-[var(--surface-raised)]">
        <div className="mx-auto max-w-[1320px] px-6 py-20 lg:px-10 lg:py-28">
          <h2 className="mb-12" style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 500 }}>
            Also in the collection
          </h2>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {alsoView.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </div>
      </section>

      {/* Mobile-only sticky enquiry bar — the car-specific action is always on screen.
          Uses position:sticky so it pins while browsing the car and releases above
          the footer rather than overlapping it. */}
      <div
        className="sticky bottom-0 z-40 border-t border-[var(--border)] bg-surface-page/94 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-3">
          <div className="shrink-0">
            <div className="text-[0.55rem] uppercase tracking-[0.14em] text-[var(--text-muted)] leading-none">Guide price</div>
            <div className="mt-1 text-[var(--text-primary)] tabular-nums leading-none" style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.02rem", fontWeight: 500 }}>
              {formatPKR(car.price, car.currency)}
            </div>
          </div>
          <a
            href={enquireHref}
            target="_blank"
            rel="noopener noreferrer"
            className="metal-fill sheen flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-center text-[0.7rem] font-semibold uppercase leading-tight tracking-[0.1em]"
          >
            <WhatsAppIcon className="size-4 shrink-0" />
            {enquireLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
