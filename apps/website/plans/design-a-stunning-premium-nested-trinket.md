# The Collection — Premium Dealership Website

---

# ADDENDUM · Landing page enhancement (round 2)

## Context
The landing page (`src/app/components/pages/landing.tsx`) currently has four sections: Hero,
Positioning/"How we work", Featured selection, and Appointment. The user wants it enhanced —
more sections, a more premium editorial aesthetic, best-practice UI/UX — while staying true to
the brand (quiet, discreet, photography-led; "privacy is the product"). Per the user's choice,
**no testimonials**; add an **assurance** section instead of social proof.

The goal is a longer, more considered scroll that still feels restrained — each new section must
earn its place. All existing brand tokens, `Reveal`, `CarCard`, `EnquiryDialog`, `Wordmark`, and
`cars`/`formatPKR`/`getCarById` (in `src/app/data/cars.ts`) are reused; no new data shape.

## New landing flow (top → bottom)
1. **Hero** — existing; minor polish only (animated scroll cue with subtle motion loop).
2. **Marque marquee** *(new)* — a slow, quiet auto-scrolling row of the marque names represented
   (derived from `Array.from(new Set(cars.map(c => c.make)))`, separated by champagne dots).
   Establishes calibre instantly; pauses on hover; disabled under reduced motion. New reusable
   component `src/app/components/marquee.tsx` (motion-based, seamless loop).
3. **Positioning / "How we work"** — existing; add a small numbered index eyebrow to match the
   brand sheet kicker style (e.g. "01 · How we work" with a champagne hairline).
4. **Spotlight** *(new)* — a cinematic, full-width editorial feature of one exceptional available
   car (e.g. `getCarById("bentley-continental-gt-2021")`, with a graceful fallback to the first
   available car). Large photograph with a subtle parallax (`useScroll` + `useTransform`), overlaid
   marque/model in Fraunces, a one-line provenance note, `formatPKR` price + `StatusPill`, and a
   "View this motorcar" link to `/collection/:id`.
5. **Featured selection** — existing; keep (three available cars).
6. **The acquisition process** *(new)* — numbered 01–04 editorial steps: Enquire → Private
   viewing → Due diligence → Acquisition & handover. Spacious, hairline-separated, staggered
   `Reveal`. Calm, plain, brand-voice copy.
7. **The assurance** *(new, replaces any testimonial idea)* — four understated guarantees
   (Provenance verified · Independently inspected · Complete history · Discreet handover) as quiet
   points (small champagne tick/rule, Fraunces label, ink-60 description). Set on `--noir` for
   contrast, champagne marking only the rules — one restrained accent per the brand's UI discipline.
8. **Statement band** *(new)* — a full-bleed cinematic photographic band with subtle parallax and a
   single brand line in large Fraunces ("Shown to a single owner at a time."). One new wide
   Unsplash image URL; `<ImageWithFallback>` with a dark scrim for legibility.
9. **Appointment** — existing; keep as the closing CTA.

## Implementation notes
- Edit `src/app/components/pages/landing.tsx` to insert sections 2, 4, 6, 7, 8 in order; refine the
  hero scroll cue and add index eyebrows. Alternate surfaces (`--alabaster` / `--cream` / `--noir`)
  for editorial rhythm so no two adjacent sections share a background.
- Create `src/app/components/marquee.tsx` — a small, reusable, seamless marquee using
  `motion` (duplicate the track and animate `x` from `0` to `-50%`; `useReducedMotion` renders a
  static centred row). Accept `items: string[]`.
- Reuse existing primitives: `Reveal` (`src/app/components/reveal.tsx`), `StatusPill`
  (`status-pill.tsx`), `ImageWithFallback`, and the `cars` array + `formatPKR`/`getCarById`.
- Parallax: import `useScroll`/`useTransform` from `motion/react`; guard with `useReducedMotion`
  (no transform when reduced). Keep motion subtle (≤ ~8% travel), per the brand's "tasteful motion".
- Consistent premium details: champagne hairline rules, numbered eyebrows, generous vertical
  rhythm (`py-24`/`lg:py-32`+), tabular-nums on prices. No new fonts, no token changes.

## Files
- Modify: `src/app/components/pages/landing.tsx`.
- Create: `src/app/components/marquee.tsx`.

## Verification (this round)
- Load `/`: the new sections appear in order between the existing ones; backgrounds alternate;
  the marquee scrolls slowly and pauses on hover; spotlight and statement band show gentle parallax
  on scroll; the acquisition steps and assurance points reveal on scroll.
- Spotlight "View this motorcar" routes to the correct `/collection/:id`; price/status render.
- Mobile (~375px): marquee stays legible and doesn't overflow the viewport; spotlight/statement
  stack cleanly; parallax and marquee are disabled under `prefers-reduced-motion`.
- Confirm no console errors and that `cars`/`formatPKR`/`getCarById` remain the only data source.

---

## Context

We're building a two-page marketing/showcase site for **The Collection**, a private,
by-appointment luxury car dealership in Islamabad. The attached `src/imports/brand-sheet.html`
is the single source of truth for identity and must be followed exactly — palette, typography,
wordmark, voice, and photography direction. The goal is a quiet, editorial, photography-led
experience that feels like a fashion house or private members' club, never a used-car marketplace.

The current app is an empty `App.tsx`. The project ships a full **shadcn/ui** component library
(`src/app/components/ui/`) and **react-router v7** — both will be reused. There is **no**
`@make-kits` design system, so styling is custom-built on top of the brand tokens.

A hard technical requirement: every car must render from a **single typed data array** so the
placeholder inventory can later be swapped for a live feed without redesign.

## Brand system (extracted from the brand sheet — the source of truth)

- **Colour tokens**: `--noir #131211`, `--noir-elevated #1E1B16`, `--alabaster #F6F4EE`,
  `--cream #F4F1EA`, `--white`, `--champagne #C7A96A` (signature accent — used sparingly),
  `--champagne-soft #DAC79C`, `--champagne-ink #846425` (gold text on light, AA), `--platinum #E4DFD5`,
  `--platinum-soft #EFEBE2`, `--onyx #0E0D0C`, `--ink-60 #57534B`, `--ink-40 #6E695E`, and signals:
  `good #4F7A55` (available), `amber #C0741F` (reserved), `red #B4483B`, `calm #928B7D`.
- **Type**: body `Inter`, display serif `Fraunces`, script `Pinyon Script` (only for the "The"),
  mark `Oswald` (for "COLLECTION"). Italic is reserved for the one tagline only.
- **Wordmark lockup**: Pinyon "The" set above Oswald "COLLECTION" (letter-spacing ~0.09em,
  weight 600), centred and tightly stacked (`The` translateX ~-0.13em, negative bottom margin so
  they overlap). Works on light (noir ink) and dark (white). Give it clear space.
- **Voice**: editorial, discreet, confident, understated. Tagline (the single italic):
  *"Acquired, never simply bought."* Prefer "A considered selection" over "browse our stock",
  "Acquired" over "for sale", "By appointment · Islamabad", "Shown to a single owner".
- **Photography**: one car per frame, natural/architectural light, generous negative space,
  quiet backdrops, true colour, no text/price burned in. Everything yields to the car.
- **Status**: coloured dot + faint tint pill, near-black label. Available / Reserved / Sold.
- **UI discipline**: one noir (primary) action per view; champagne marks only what is active.

## Approach

### 1. Foundations — fonts & tokens
- **`src/styles/fonts.css`**: add Google Fonts `@import` at top for Fraunces (opsz/wght),
  Inter, Oswald, and Pinyon Script.
- **`src/styles/theme.css`**: add the brand tokens as CSS variables on `:root` and expose the
  brand colours through the existing `@theme inline` block (e.g. `--color-noir`, `--color-champagne`,
  `--color-alabaster`, `--color-ink-60`, signal colours) so Tailwind utilities (`bg-noir`,
  `text-champagne`, `border-ink-40`, etc.) work throughout. Also map `--background` to alabaster
  and `--foreground` to noir, and set `--font-body`/`--font-display`/`--font-script`/`--font-mark`.
  Do **not** disturb the existing shadcn token contract — only extend it. Keep the site light-themed
  (do not toggle `.dark`).

### 2. Data layer (the swap-ready requirement)
- **`src/app/data/cars.ts`**: export a `Car` TypeScript interface with exactly the required fields:
  `id, make, model, variant, year, mileage, colour, price, currency, status, photos, description`
  (`status: "available" | "reserved" | "sold"`, `currency: "PKR"`, `photos: string[]`,
  `mileage: number` in km). Export `const cars: Car[]` with ~8–10 believable luxury entries
  (e.g. Mercedes-Benz S-Class / G 63, BMW 7 Series, Porsche 911 / Cayenne, Range Rover Autobiography,
  Lexus LX, Audi A8, Bentley-tier where realistic) with **PKR** prices formatted via a
  `formatPKR()` helper (e.g. "PKR 8.95 Cr" / lakh-crore Pakistani convention). Photos sourced from
  Unsplash via the unsplash tool during implementation; each imported as needed by
  `<ImageWithFallback>`. Provide a `getCarById(id)` helper.

### 3. Routing — `src/app/App.tsx`
- Wrap the app in react-router (`createBrowserRouter` / `<RouterProvider>` or `<BrowserRouter>` +
  `<Routes>`), shared layout with fixed/transparent-to-solid `<SiteHeader>` and `<SiteFooter>`.
- Routes: `/` → Landing, `/collection` → Collection grid, `/collection/:id` → Car detail
  (dedicated shareable route, per user's choice). A catch-all redirects to `/`.

### 4. Shared components (`src/app/components/`)
- `wordmark.tsx` — the lockup (props: `size` hero/panel/mini/foot, `tone` light/dark), rebuilt
  faithfully from the brand spec (Pinyon "The" over Oswald "COLLECTION").
- `site-header.tsx` — minimal nav: wordmark + links (The Collection, Enquire) + "By appointment"
  eyebrow; transparent over hero, solid alabaster on scroll; mobile drawer via `ui/sheet`.
- `site-footer.tsx` — noir footer: wordmark (foot), Islamabad address, appointment line, channels
  (Instagram / WhatsApp / Messenger with brand dots), tagline.
- `status-pill.tsx` — dot + tint + near-black label, driven by `status`.
- `car-card.tsx` — editorial card: full-bleed photo, make/model in Fraunces, variant + year,
  formatted PKR price, status pill; links to detail route. Subtle hover (image scale, lift).
- `enquiry-dialog.tsx` — `ui/dialog` form (name, phone, email, message, car context) using
  `react-hook-form`; on submit show a `sonner` toast confirmation (frontend-only mock, no backend).

### 5. Landing page (`src/app/components/pages/landing.tsx`)
Editorial, spacious, photography-led sections:
- **Hero** — full-viewport quiet car photograph, hero wordmark, tagline *"Acquired, never simply
  bought."*, positioning line ("A private, by-appointment dealership… Islamabad"), one noir CTA
  ("Request an appointment") + quiet link ("View the collection"). Subtle fade/scale-in motion.
- **Ethos / how we work** — a few brand principles (Discreet, Editorial, Confident, By appointment)
  in restrained type, drawn from the sheet's voice section.
- **Featured selection** — 3 hand-picked cars from the data array (reuses `car-card`).
- **The appointment** — closing section: Islamabad context, by-appointment note, primary
  "Request an appointment" opening the enquiry dialog.

### 6. Collection page (`src/app/components/pages/collection.tsx`)
- Editorial header ("A considered selection", count), quiet filter/sort affordance (by
  make / status) using `ui/select` or toggle chips — champagne marks the active filter only.
- Responsive grid of `car-card` rendered from `cars`. Graceful empty state.

### 7. Car detail page (`src/app/components/pages/car-detail.tsx`)
- Full-width lead photograph; gallery of the car's `photos` (thumbnail strip or `ui/carousel`,
  with lightbox-style enlarge). Make/model/variant in Fraunces, year, formatted PKR price,
  status pill. Specification list (year, mileage in km, colour, and a few tasteful derived specs
  from `description`). Prose `description`. Primary "Enquire about this car" → `enquiry-dialog`
  pre-filled with the car. Back link to `/collection`. 404-safe if id not found.

### 8. Motion & responsiveness
- `motion/react` for tasteful, subtle motion only: hero fade/scale, on-scroll reveals
  (small translate+fade, respect `prefers-reduced-motion`), image hover. Nothing flashy.
- Fully responsive, mobile-first: single-column stacks, comfortable tap targets, header collapses
  to a sheet, hero and galleries tuned for small screens.

## Files to create / modify
- Modify: `src/styles/fonts.css`, `src/styles/theme.css`, `src/app/App.tsx`
- Create: `src/app/data/cars.ts`; components `wordmark.tsx`, `site-header.tsx`, `site-footer.tsx`,
  `status-pill.tsx`, `car-card.tsx`, `enquiry-dialog.tsx`; pages `pages/landing.tsx`,
  `pages/collection.tsx`, `pages/car-detail.tsx`.
- Reuse: `src/app/components/ui/*` (dialog, sheet, select, carousel, button, input, textarea,
  sonner, separator), `src/app/components/figma/ImageWithFallback.tsx`.

## Assets
- Source luxury car photography from Unsplash (via the unsplash tool) during implementation,
  honouring the photography direction (single subject, quiet backdrop, negative space). Import each
  image as an ES module and pass the binding to `<ImageWithFallback src>` (never a raw path string).

## Verification
- Load `/` — hero, wordmark, tagline, and sections render; header goes transparent→solid on scroll;
  CTAs open the enquiry dialog and a toast confirms submit.
- Navigate to `/collection` — grid renders every car from `cars`; filters mark the active option in
  champagne only; cards link to detail.
- Open `/collection/:id` — gallery, specs (PKR price, km mileage, colour), description, status pill,
  and "Enquire" prefilled dialog all work; unknown id is handled.
- Resize to mobile (~375px): layouts stack cleanly, header collapses to sheet, galleries/CTAs are
  comfortable; verify with reduced-motion that animations are muted.
- Confirm all cars derive from the single `cars` array (grep for the array as the only source).
