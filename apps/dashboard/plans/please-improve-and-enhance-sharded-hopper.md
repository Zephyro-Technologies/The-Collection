# Dashboard UI/UX Enhancement Plan

## Context

The Home (dashboard) screen at `src/app/components/screens/Home.tsx` currently relies on low-opacity text (`rgba(255,255,255,0.55)`, `text-white/70`, `text-ink-40`) and thin font weights for small caps and KPI numbers. Several pieces of text fail basic legibility — the eyebrow on the navy accent card, the bot-activity footer, and the KPI subtitles all sit at or below WCAG AA. The overall vibe is clean but flat: no depth, no champagne accent payoff, and the hero number doesn't earn its size.

Goal: tighten contrast and font weights so every label is readable, then layer in a small amount of craft (subtle ambient depth, a champagne hairline, better hierarchy, an inviting hero band) to make the dashboard feel intentional rather than placeholder.

## Approach

### 1. Token & base style tweaks — `src/styles/theme.css`
- Darken `--ink-40` from `#7a7c8c` → `#5b5d6f` so muted text passes AA on white.
- Add `--ink-on-navy: rgba(255,255,255,0.82)` and `--ink-on-navy-soft: rgba(255,255,255,0.68)` tokens, and switch `--sidebar-foreground` to the 0.82 variant.
- Bump `.eyebrow` to `font-weight: 600`, `font-size: 0.72rem`, and let it inherit color (so dark/light variants are explicit at call sites, not stuck on `--ink-40`).
- Add an `.eyebrow-on-dark` helper using `--ink-on-navy-soft` for use on the navy card / sidebar.
- Add `.kpi-number` utility: `font-family: var(--font-editorial); font-weight: 600; font-size: 2.75rem; line-height: 1; letter-spacing: -0.02em;` — replaces inline styles in Home.tsx.
- Add a soft elevation token: `--shadow-card: 0 1px 2px rgba(11,10,64,0.04), 0 8px 24px -12px rgba(11,10,64,0.10);` and a hover variant. Apply via a `.card-elevated` utility.

### 2. Home screen polish — `src/app/components/screens/Home.tsx`
- Replace inline `style={{ color: "rgba(255,255,255,0.55)" }}` with the new `eyebrow-on-dark` class; same for `text-white/70` subtitles → use `--ink-on-navy` token via a class.
- Replace the inline KPI number style with `.kpi-number`. Increase weight so the figure reads as the focal point.
- Wrap the KPI grid in a hero band: a subtle `bg-platinum-soft/40` panel with a champagne hairline (`champagne-rule`) above the greeting, giving the dashboard a clear "above the fold" frame.
- Add `.card-elevated` to both card variants and tighten hover (`hover:-translate-y-0.5` + shadow lift). On the accent (navy) card, add a faint champagne top-border (`border-top: 1px solid var(--champagne)`) so the accent earns its prominence.
- Promote the bot footer: move from 0.78rem ink-40 to 0.85rem ink-60, put it inside a thin bordered pill with the Bot icon in champagne — small but intentional.
- Add a fourth quick-stat strip below the cards (read-only): "Bot handled · Avg response · Conversations today" using `eyebrow` + small `editorial` figures, sourced from existing props (no new data needed; derive from `botHandledToday` and counts already passed in). Keeps the page from feeling sparse when `totalNeeds === 0`.
- For the empty state, swap the generic centered card for a two-column layout: editorial italic headline + the same quick-stat strip on the right, so "all clear" still feels like a dashboard, not a placeholder.

### 3. Sidebar legibility — `src/app/components/shell/Sidebar.tsx`
- Inactive nav items: replace `text-white/70` with the new `--ink-on-navy-soft` token (0.68) — visually similar but applied via token for consistency.
- Active item: add a 2px left champagne bar (instead of/in addition to current treatment) to make the active state unambiguous.

### Reused existing pieces
- `SectionHeader` (already handles eyebrow/title/subtitle pairing) — keep as-is.
- `champagne-rule` utility — reuse for the new hero band divider.
- All icons already imported from `lucide-react` — no new deps.

## Files to modify
- `src/styles/theme.css` (tokens, `.eyebrow`, new `.kpi-number`, `.card-elevated`, `.eyebrow-on-dark`)
- `src/app/components/screens/Home.tsx` (card refactor, hero band, quick-stat strip, footer pill)
- `src/app/components/shell/Sidebar.tsx` (token swap, active indicator)

No new packages. No data/model changes. No new files.

## Verification
1. Dev server is already running — open the preview and confirm the dashboard renders without console errors.
2. Visually check the Home screen at desktop and mobile widths: KPI numbers are clearly the focal point, the navy accent card's eyebrow and subtitle are legible, the bot footer reads cleanly, the empty state no longer looks placeholder-like.
3. Open the sidebar and confirm inactive items are readable and the active item has a visible champagne marker.
4. Spot-check other screens (Conversations, Tickets) to confirm the token/eyebrow changes did not regress text that was already legible.
