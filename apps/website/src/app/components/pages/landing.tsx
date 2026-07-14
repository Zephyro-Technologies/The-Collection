import { useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Check } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Wordmark } from "../wordmark";
import { CarCard } from "../car-card";
import { Reveal } from "../reveal";
import { Marquee } from "../marquee";
import { useInventory } from "../../data/use-inventory";
import { CollectionSkeleton } from "../states";
import heroImg from "../../../assets/hero.jpg";
import statementImg from "../../../assets/statement.jpg";
import processImg from "../../../assets/process.jpg";
import houseImg from "../../../assets/house.jpg";
import ethosImg from "../../../assets/ethos.jpg";
import featuredImg from "../../../assets/featured.jpg";
import { useDocumentTitle } from "../../hooks/use-document-title";

// TODO (client content): these are self-hosted placeholder stock photos (Unsplash,
// see ATTRIBUTIONS.md). Replace with real, licensed photography of the collection
// before launch.
const HERO_IMG = heroImg;
const STATEMENT_IMG = statementImg;
const PROCESS_IMG = processImg;     // a wheel in shadow — a detail, not a hero shot
const HOUSE_IMG = houseImg;         // a coupé emerging from black — texture, not subject
const ETHOS_IMG = ethosImg;         // a headlight surfacing out of black
const FEATURED_IMG = featuredImg;   // a garage, pre-blurred and de-saturated at build
                                    // time: the palette is monochrome, and a runtime
                                    // blur on a full-bleed background is not free.

const PRINCIPLES = [
  { label: "Discreet", desc: "Privacy is the product. We speak quietly, in confidence, and keep the rest unsaid." },
  { label: "Editorial", desc: "We curate, we don't retail. Each car is considered and presented: written, not merchandised." },
  { label: "Provenance-led", desc: "History and condition are verified before a car is offered. What we cannot stand behind, we decline." },
  { label: "Understated", desc: "Certainty without volume. The strongest claim is the one that does not strain to be heard." },
];

const PROCESS = [
  { n: "01", t: "Enquire", d: "Tell us the motorcar you have in mind, or the brief you would like us to hold. A single, private conversation to begin." },
  { n: "02", t: "Private viewing", d: "We arrange an unhurried viewing in Islamabad: the car alone, and the time to consider it properly." },
  { n: "03", t: "Due diligence", d: "Provenance, history, and condition are verified and independently inspected before anything proceeds." },
  { n: "04", t: "Acquisition & handover", d: "Paperwork is handled in confidence and the car is delivered, prepared, to you and you alone." },
];

const ASSURANCE = [
  { t: "Provenance verified", d: "Ownership and history confirmed before a car enters the collection." },
  { t: "Independently inspected", d: "Mechanical and cosmetic condition assessed by a third party." },
  { t: "Complete history", d: "Service records and documentation, held and presented in full." },
  { t: "Discreet handover", d: "Every transaction conducted privately, with discretion assured throughout." },
];

// Small numbered kicker matching the brand sheet's section index style.
function Kicker({ index, label, tone = "dark" }: { index: string; label: string; tone?: "dark" | "light" }) {
  const ink = tone === "light" ? "color-mix(in srgb, var(--text-primary) 62%, transparent)" : "var(--text-muted)";
  return (
    <div className="flex items-center gap-4">
      <span className="text-[0.72rem] tabular-nums tracking-[0.1em]" style={{ color: ink }}>{index}</span>
      <span className="h-px w-8 bg-[var(--accent)]" />
      <span
        className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]"
        style={tone === "light" ? { color: "var(--accent-soft)" } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

// ------------------------------ How we work — editorial ethos (parallax + a detail)
// The watermark is the section's gesture and stays exactly as it was. Everything
// added here sits BEHIND it and behind the copy: a headlight surfacing out of the
// black at the right edge, a single pool of silver, and grain so the ground reads
// as an exposure rather than a fill. The copy's ground is untouched — the detail
// is scrimmed to page colour everywhere a word lands.
function Ethos() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const wordY = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);
  const detailY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section ref={ref} className="film-grain relative overflow-hidden bg-[var(--surface-page)] text-[var(--text-primary)]">
      {/* The detail: bleeds in from the right and dissolves leftward long before it
          reaches the paragraph, and downward before it reaches the principles. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%] overflow-hidden lg:w-[46%]" aria-hidden>
        <motion.div className="absolute inset-x-0 -top-[8%] -bottom-[8%]" style={{ y: reduce ? 0 : detailY }}>
          {/* Mirrored: the lamp sits left-of-centre in the frame, which is exactly
              where the scrim is at its heaviest. Flipped, it surfaces at the open
              right edge — the one part of this section no word ever crosses. */}
          <ImageWithFallback
            src={ETHOS_IMG}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 44%", opacity: 0.62, transform: "scaleX(-1)" }}
          />
        </motion.div>
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(to right, var(--surface-page) 0%, color-mix(in srgb, var(--surface-page) 92%, transparent) 42%, color-mix(in srgb, var(--surface-page) 60%, transparent) 72%, color-mix(in srgb, var(--surface-page) 26%, transparent) 100%)",
              "linear-gradient(to bottom, color-mix(in srgb, var(--surface-page) 48%, transparent) 0%, color-mix(in srgb, var(--surface-page) 20%, transparent) 26%, color-mix(in srgb, var(--surface-page) 46%, transparent) 58%, var(--surface-page) 88%)",
            ].join(", "),
          }}
        />
      </div>

      {/* A single pool of silver, so the black has a light source. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 55% 60% at 78% 28%, color-mix(in srgb, var(--accent) 7%, transparent), transparent 70%)" }}
        aria-hidden
      />

      {/* Oversized, faint drifting word — the section's quiet cinematic gesture */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ y: reduce ? 0 : wordY }}
        aria-hidden
      >
        <span
          className="whitespace-nowrap"
          style={{
            fontFamily: "var(--typeface-serif)",
            fontWeight: 500,
            fontSize: "clamp(6rem, 24vw, 22rem)",
            letterSpacing: "-0.02em",
            color: "color-mix(in srgb, var(--accent) 6%, transparent)",
            lineHeight: 1,
          }}
        >
          Considered
        </span>
      </motion.div>

      <div className="relative mx-auto max-w-[1240px] px-6 py-28 lg:px-10 lg:py-40">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <Reveal>
            <div>
              <Kicker index="01" label="How we work" tone="light" />
              <h2
                className="mt-8 max-w-xl"
                style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(2.1rem, 5vw, 3.6rem)", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.015em" }}
              >
                A considered selection, shown quietly and with certainty.
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="lg:pt-2">
              <p className="max-w-md text-cream/74" style={{ lineHeight: 1.9, fontSize: "1.08rem" }}>
                The Collection speaks the way it sells: without noise, and without haste. Each
                motorcar is chosen for its provenance and its condition, verified before it is
                offered. There is no showroom floor. Only the car, and the time to consider it.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-x-12 gap-y-12 border-t border-cream/14 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.label} delay={i * 0.08}>
              <div>
                <div className="mb-4 h-px w-8 bg-[var(--accent)]" />
                <h3 style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.15rem", fontWeight: 500 }}>{p.label}</h3>
                <p className="mt-3 text-[0.92rem] text-cream/60" style={{ lineHeight: 1.65 }}>{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------- Statement band (parallax)
function StatementBand() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={ref} className="relative h-[70vh] min-h-[440px] w-full overflow-hidden bg-[var(--surface-page)]">
      <motion.div className="absolute inset-x-0 -top-[10%] -bottom-[10%]" style={{ y: reduce ? 0 : y }}>
        <ImageWithFallback
          src={STATEMENT_IMG}
          alt="A single motorcar at rest, quietly lit"
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--onyx) 55%, transparent), color-mix(in srgb, var(--onyx) 35%, transparent) 45%, color-mix(in srgb, var(--onyx) 70%, transparent))" }} />

      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-8 h-px w-16 bg-[var(--accent)]" />
            <p
              className="text-[var(--text-primary)]"
              style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.8rem, 4.5vw, 3.2rem)", fontWeight: 500, lineHeight: 1.15, letterSpacing: "-0.01em" }}
            >
              Shown to a single owner at a time.
            </p>
            <p className="mt-6 text-[0.66rem] uppercase tracking-[0.28em] text-cream/60">
              The Collection · Islamabad
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------ A seat for a card on the plate
// The card's own ground, near-opaque, so its caption and price never inherit the
// showroom behind the plate. Landing-only: CarCard itself is shared with the
// /collection grid and stays exactly as it is there.
function CardSeat({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="h-full rounded-[3px] border border-[var(--border)] p-3"
      style={{ backgroundColor: "color-mix(in srgb, var(--surface-raised) 94%, transparent)" }}
      whileHover={
        reduce
          ? undefined
          : {
              y: -6,
              borderColor: "color-mix(in srgb, var(--accent) 34%, transparent)",
              boxShadow: "0 22px 44px color-mix(in srgb, var(--onyx) 55%, transparent)",
            }
      }
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------- The process (timeline + a detail plate)
// The timeline is a single narrow column, which left the right half of the section
// empty. It now carries a tall detail plate — a wheel in shadow, held still while
// the four steps scroll past it — so the section is composed rather than merely
// left-aligned.
function Process() {
  const reduce = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: railRef, offset: ["start 65%", "end 55%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const plateRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: plateProgress } = useScroll({ target: plateRef, offset: ["start end", "end start"] });
  const plateY = useTransform(plateProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section className="bg-[var(--surface-raised)]">
      <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-20">
          <div>
            <Reveal>
              <div className="max-w-2xl">
                <Kicker index="03" label="The process" />
                <h2
                  className="mt-7"
                  style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.9rem, 4vw, 2.9rem)", fontWeight: 500, lineHeight: 1.14 }}
                >
                  From first enquiry to a car in your keeping.
                </h2>
                <p className="mt-6 text-[var(--text-body)]" style={{ lineHeight: 1.7, fontSize: "1.02rem" }}>
                  Four unhurried steps, each conducted privately and without pressure.
                </p>
              </div>
            </Reveal>

            {/* Scroll-drawn timeline */}
            <div ref={railRef} className="relative mt-16 pl-[70px] sm:pl-20">
              <div className="absolute left-[23px] top-4 bottom-4 w-px bg-[var(--border)] sm:left-[27px]" aria-hidden />
              <motion.div
                className="absolute left-[23px] top-4 bottom-4 w-px origin-top bg-[var(--accent)] sm:left-[27px]"
                style={{ scaleY: reduce ? 1 : scaleY }}
                aria-hidden
              />

              <ol className="space-y-12 sm:space-y-16">
                {PROCESS.map((step) => (
                  <li key={step.n} className="relative">
                    <div className="absolute -left-[70px] top-0 sm:-left-20">
                      <span
                        className="flex size-[46px] items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--surface-raised)] text-[var(--accent)] sm:size-[54px]"
                        style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.05rem", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
                      >
                        {step.n}
                      </span>
                    </div>
                    <Reveal>
                      <div className="pt-1.5 sm:pt-2.5">
                        <h3 style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.2rem, 2vw, 1.4rem)", fontWeight: 500 }}>{step.t}</h3>
                        <p className="mt-3 max-w-lg text-[0.96rem] text-[var(--text-body)]" style={{ lineHeight: 1.75 }}>{step.d}</p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* The detail plate. Sticky on desktop so it holds the right half while the
              steps run past; a closing image on mobile, where there is no dead space. */}
          <Reveal delay={0.1}>
            <div ref={plateRef} className="h-full">
              <div className="lg:sticky lg:top-28">
                <div className="relative h-[380px] overflow-hidden rounded-[3px] border border-[var(--border)] sm:h-[460px] lg:h-[620px]">
                  <motion.div className="absolute inset-x-0 -top-[7%] -bottom-[7%]" style={{ y: reduce ? 0 : plateY }}>
                    <ImageWithFallback
                      src={PROCESS_IMG}
                      alt="A wheel, photographed in shadow"
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                  {/* Fades into the section at top and foot, so the plate sits IN the
                      page rather than being pasted onto it. */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to bottom, color-mix(in srgb, var(--surface-raised) 62%, transparent) 0%, transparent 26%, transparent 52%, color-mix(in srgb, var(--surface-raised) 92%, transparent) 100%)",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-7">
                    <div className="hairline mb-5" />
                    <p
                      className="italic text-[var(--text-body)]"
                      style={{ fontFamily: "var(--typeface-serif)", fontSize: "0.98rem", lineHeight: 1.5 }}
                    >
                      Verified before it is offered.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------- The assurance (its own darker band)
// Was a flat quartet at the foot of the process section. Standing on the page's
// deepest surface, with the four plates raised out of it, it reads as a seal
// rather than as more text on more black.
function Assurance() {
  return (
    <section className="relative overflow-hidden bg-[var(--surface-page)]">
      {/* A single soft pool of silver — depth without another photograph. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 68% 90% at 50% 0%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 72%)" }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1240px] px-6 py-20 lg:px-10 lg:py-24">
        <div className="hairline" />
        <Reveal>
          <div className="mt-12 flex flex-wrap items-baseline justify-between gap-4">
            <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">
              The assurance
            </span>
            <span className="text-[0.8rem] text-[var(--text-muted)]">Every car, without exception.</span>
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[3px] border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
            {ASSURANCE.map((a) => (
              <div key={a.t} className="h-full bg-[var(--surface-raised)] p-7">
                <Check className="size-[18px] text-[var(--accent)]" strokeWidth={2} />
                <h4 className="mt-4" style={{ fontFamily: "var(--typeface-serif)", fontSize: "1.05rem", fontWeight: 500 }}>{a.t}</h4>
                <p className="mt-2 text-[0.88rem] text-[var(--text-body)]" style={{ lineHeight: 1.6 }}>{a.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ----------------------------------------------------- The house (about / 04)
// The copy is unchanged; what it stands on is not. A coupé rises out of the black
// at the FOOT of the section — a horizon under the words, not a picture behind
// them. Run full-bleed behind the copy it reached ~4.5:1 against the dimmest body
// text and fought the paragraph for the same pixels; banded to the bottom and
// faded out well below the last line, it is atmosphere and nothing else.
function House() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--surface-page)]">
      {/* The band is sized in PIXELS from the foot, not as a share of the section.
          As a percentage it rode up the taller mobile layout until the roofline —
          the brightest strip in the photograph — sat directly behind the fact
          labels, which measured 2.1:1 there. Pinned to the foot, and with the wash
          fully closed to page colour by the band's top, the labels land on
          near-black at every width; the car keeps the space below them. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[300px] overflow-hidden sm:h-[360px] lg:h-[440px]" aria-hidden>
        <motion.div className="absolute inset-x-0 -top-[10%] -bottom-[10%]" style={{ y: reduce ? 0 : y }}>
          <ImageWithFallback
            src={HOUSE_IMG}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 45%", opacity: 0.55 }}
          />
        </motion.div>

        {/* Dissolves at BOTH ends: into the page well below the copy, and into the
            page again at the very foot, so the car is never cut by the edge. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--surface-page) 88%, transparent) 0%, color-mix(in srgb, var(--surface-page) 52%, transparent) 7%, color-mix(in srgb, var(--surface-page) 22%, transparent) 24%, color-mix(in srgb, var(--surface-page) 62%, transparent) 48%, color-mix(in srgb, var(--surface-page) 92%, transparent) 66%, var(--surface-page) 82%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1240px] px-6 pt-24 pb-48 lg:px-10 lg:pt-32 lg:pb-60">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <Reveal>
            <div>
              <Kicker index="04" label="The house" />
              <h2
                className="mt-7 max-w-lg"
                style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.9rem, 4vw, 2.9rem)", fontWeight: 500, lineHeight: 1.14 }}
              >
                A private house for considered motorcars.
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="lg:pt-2">
              {/* cream/74, as HOW WE WORK sets it — --text-body measured 7.76:1 here
                  against that paragraph's 9.76:1, and the pair read as a mismatch. */}
              <p className="max-w-md text-cream/74" style={{ lineHeight: 1.9, fontSize: "1.05rem" }}>
                The Collection is a by-appointment dealership in Islamabad, dealing privately in
                high-value and collectible motorcars. We acquire selectively, verify thoroughly,
                and present each car to a small circle of serious owners, quietly and on your
                terms.
              </p>
              <div className="mt-9 grid grid-cols-2 gap-6">
                {[
                  { k: "Speciality", v: "High-value & collectible" },
                  { k: "Approach", v: "Provenance-led" },
                ].map((f) => (
                  <div key={f.k} className="border-t border-[var(--border)] pt-4">
                    <div className="text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-muted)]">{f.k}</div>
                    <div className="mt-1.5 text-[0.9rem]" style={{ fontFamily: "var(--typeface-serif)", lineHeight: 1.35 }}>{f.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  const reduce = useReducedMotion();
  const { cars, state } = useInventory();
  const featured = cars.filter((c) => c.status === "available").slice(0, 3);
  const marques = Array.from(new Set(cars.map((c) => c.make)));
  useDocumentTitle("The Collection · Private Luxury Motorcars, Islamabad · By Appointment");
  // Fade the scroll cue away once the visitor has begun to scroll.
  const { scrollY } = useScroll();
  const cueOpacity = useTransform(scrollY, [0, 160], [1, 0]);

  return (
    <div className="bg-[var(--surface-page)]">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative h-[100svh] min-h-[600px] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.08, opacity: 0 }}
          animate={reduce ? undefined : { scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <ImageWithFallback
            src={HERO_IMG}
            alt="A single motorcar, quietly lit"
            className="h-full w-full object-cover"
          />
          {/* The scrim. The photograph is a black car against a PALE sky and a light
              road, so a flat vertical wash either left the centre at ~2.9:1 (it did)
              or flattened the whole frame to tar. Two layers instead:

              1. an elliptical pool of onyx sitting exactly under the text column —
                 deep at the centre, gone by the frame's edge;
              2. a light vertical wash: enough at the top for the header, enough at
                 the foot for the scroll cue, almost nothing across the middle.

              Where they overlap (behind the copy) they compound to ~78% onyx, which
              puts cream at ~10:1 over the brightest part of the sky. At the edges the
              road, the wheels and the taillight keep their contrast — the car reads
              as a silhouette rather than a black rectangle. */}
          <div
            className="absolute inset-0"
            style={{
              background: [
                "radial-gradient(ellipse 70% 58% at 50% 46%, color-mix(in srgb, var(--onyx) 72%, transparent) 0%, color-mix(in srgb, var(--onyx) 58%, transparent) 45%, color-mix(in srgb, var(--onyx) 20%, transparent) 78%, transparent 100%)",
                "linear-gradient(to bottom, color-mix(in srgb, var(--onyx) 55%, transparent) 0%, color-mix(in srgb, var(--onyx) 18%, transparent) 32%, color-mix(in srgb, var(--onyx) 22%, transparent) 62%, color-mix(in srgb, var(--onyx) 78%, transparent) 100%)",
              ].join(", "),
            }}
          />
        </motion.div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="sr-only">The Collection, a private luxury car dealership in Islamabad, by appointment</h1>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <Wordmark size="hero" tone="light" />
            <div className="my-8 h-px w-16 bg-[var(--accent)]" />
            {/* --accent (platinum), not --accent-soft (platinum-dim): the dim silver
                measured 3.44:1 here, and this line is the hero's whole argument. */}
            <p
              className="italic text-[var(--accent)]"
              style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.05rem, 2.4vw, 1.35rem)" }}
            >
              Acquired, never simply bought.
            </p>
            <p className="mt-6 max-w-xl text-cream/88" style={{ lineHeight: 1.7, fontSize: "1rem" }}>
              A private dealership for high-value motorcars in Islamabad, where each car is
              acquired for its provenance and its history, not merely listed.
            </p>

            <div className="mt-9 flex justify-center">
              <Link
                to="/collection"
                className="inline-flex items-center justify-center border border-cream/50 px-7 py-3.5 text-[var(--text-primary)] text-[0.74rem] uppercase tracking-[0.16em] transition-colors hover:bg-cream/10"
              >
                View the collection
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Animated scroll cue — fades away once the visitor scrolls */}
        <motion.div
          className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-3"
          style={{ opacity: reduce ? undefined : cueOpacity }}
        >
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-cream/60">Scroll</span>
          <motion.span
            className="block h-8 w-px bg-cream/40"
            style={{ transformOrigin: "top" }}
            animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
          />
        </motion.div>
      </section>

      {/* ---------------------------------------------------- Marque marquee */}
      {marques.length > 0 && (
        <section className="border-y border-[var(--border)] bg-[var(--surface-raised)] py-8">
          <div className="mb-5 text-center text-[0.62rem] uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Marques represented
          </div>
          <Marquee items={marques} />
        </section>
      )}

      {/* ----------------------------------------------------- How we work (ethos) */}
      <Ethos />

      {/* ------------------------------------------------------ Featured selection */}
      {/* The first attempt put the vignette's DARKEST point dead centre — exactly
          where the eye lands — so the room only showed in the margins and the card
          zone stayed flat. Inverted:
            · the showroom is brought forward and reads THROUGH the row;
            · the scrim is heavy only in the HEADER band, because the kicker's index
              is --text-muted and needs a ground at or below #252525 to hold AA;
            · the cards are lifted onto a frosted plate, and each one onto its own
              near-opaque seat, so their captions and prices keep a controlled dark
              ground no matter how bright the room behind them gets.
          The room is therefore visible BEHIND and BETWEEN the cards, never under
          their text. */}
      <section className="film-grain relative overflow-hidden bg-[var(--surface-raised)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <ImageWithFallback
            src={FEATURED_IMG}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 46%", opacity: 0.92 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: [
                // Frame the edges, but leave the middle open — the opposite of before.
                "radial-gradient(ellipse 82% 74% at 50% 54%, transparent 0%, transparent 42%, color-mix(in srgb, var(--surface-raised) 55%, transparent) 100%)",
                // Heavy across the header, open through the row, closed again at the foot.
                "linear-gradient(to bottom, var(--surface-raised) 0%, color-mix(in srgb, var(--surface-raised) 93%, transparent) 15%, color-mix(in srgb, var(--surface-raised) 62%, transparent) 27%, color-mix(in srgb, var(--surface-raised) 55%, transparent) 68%, color-mix(in srgb, var(--surface-raised) 88%, transparent) 88%, var(--surface-raised) 100%)",
              ].join(", "),
            }}
          />
        </div>

        {/* A platinum sweep behind the heading, so the black has a direction. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[46%]"
          style={{ background: "radial-gradient(ellipse 46% 90% at 24% 34%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 72%)" }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-32">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Kicker index="02" label="Currently available" />
                <h2 className="mt-5" style={{ fontFamily: "var(--typeface-serif)", fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)", fontWeight: 500 }}>
                  A few from the collection
                </h2>
              </div>
              <Link
                to="/collection"
                className="hidden items-center gap-2 pb-2 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--accent)] transition-colors hover:text-[var(--text-primary)] sm:inline-flex"
              >
                View the full collection <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>

          {state === "loading" ? (
            <div className="mt-14">
              <CollectionSkeleton count={3} />
            </div>
          ) : featured.length > 0 ? (
            <div className="relative mt-14">
              <div className="hairline mb-10" />
              {/* The plate: frosted, not opaque, so the showroom still reads through
                  the padding and the gaps — the row sits IN the room, not on a slab. */}
              <div
                className="relative rounded-[4px] border border-[var(--border)] p-4 sm:p-6 lg:p-8"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--surface-page) 46%, transparent)",
                  backdropFilter: "blur(7px)",
                  WebkitBackdropFilter: "blur(7px)",
                  boxShadow:
                    "inset 0 1px 0 color-mix(in srgb, var(--cream) 6%, transparent), 0 30px 70px color-mix(in srgb, var(--onyx) 50%, transparent)",
                }}
              >
                {/* The plate's own mark. Small, and a different device from the one
                    big-word moment in 01 — that stays "Considered"'s alone. */}
                <span
                  className="pointer-events-none absolute right-5 top-2 select-none lg:right-7"
                  style={{
                    fontFamily: "var(--typeface-serif)",
                    fontSize: "clamp(3rem, 5vw, 4.5rem)",
                    fontWeight: 500,
                    lineHeight: 1,
                    color: "color-mix(in srgb, var(--cream) 6%, transparent)",
                  }}
                  aria-hidden
                >
                  C
                </span>

                <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((car, i) => (
                    <Reveal key={car.id} delay={i * 0.1}>
                      <CardSeat>
                        <CarCard car={car} priority={i === 0} />
                      </CardSeat>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-10 max-w-md text-[var(--text-body)]" style={{ lineHeight: 1.7, fontSize: "1.02rem" }}>
              Between acquisitions at the moment. Enquire, and we will look on your behalf.
            </p>
          )}

          {state !== "loading" && (
            <div className="mt-14 text-center">
              <Link
                to="/collection"
                className="inline-flex items-center gap-2 border border-[var(--text-muted)] px-7 py-3.5 text-[0.72rem] uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--surface-page)]"
              >
                View the full collection <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------- Statement band */}
      <StatementBand />

      {/* ------------------------------------------------------- The process (03) */}
      <Process />

      {/* --------------------------------------------------------- The assurance */}
      <Assurance />

      {/* ------------------------------------------------ The house (about / 04) */}
      {/* TODO (client content): replace with the real founder's name + portrait,
          the year established, business registration, and any press/affiliations. */}
      <House />
    </div>
  );
}
