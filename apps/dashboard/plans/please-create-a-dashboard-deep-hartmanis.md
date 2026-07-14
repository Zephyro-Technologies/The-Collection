# The Collection — Operator Dashboard

## Context
Build a premium, mobile-first operator dashboard for **The Collection** (luxury motorcar dealership in Islamabad). The dashboard surfaces only what needs the owner's attention from a multi-channel AI lead bot (Instagram / WhatsApp / Messenger). Brand is restrained and editorial: Midnight Navy (#0B0A40), Pure White, Champagne (#B89B6A), Platinum (#D7D9E0), Onyx (#121319). Typography: Poppins (display, uppercase + tracking) + Lora (editorial body/italic). Script "The" + condensed caps "COLLECTION" wordmark — render in HTML using Pinyon Script + Oswald as the closest free analogues.

This is a **mocked frontend** (no backend) — all data is realistic sample data wired through React state so interactions feel real (reply, take over, mark resolved, change inventory status, etc.).

## Design direction
- **Light surface** primary canvas (white/platinum) with **Midnight Navy** type and a navy sidebar/topbar so the wordmark sits on the reversed-mark background as per brand. Champagne used only for accents/rules/active states (~5% of surface).
- Generous whitespace, hairline platinum dividers, no shadows beyond subtle elevation on cards.
- Status colour as signal only: champagne = active/today, soft amber = aging, muted red = overdue/closing window, calm slate = handled/bot.
- Editorial photo treatment for inventory (Unsplash luxury car imagery via `ImageWithFallback`).

## Architecture
Single-page React app with client-side view switching (no router needed). Active screen lives in `App.tsx` state; sidebar/bottom-nav switches it. Responsive: ≥`md` shows persistent left sidebar + main + contextual right panel; below `md` collapses to stacked view with bottom nav bar.

## Files

### Theme
- **`src/styles/theme.css`** — replace tokens with brand palette (navy, white, champagne, platinum, onyx), set font tokens.
- **`src/styles/fonts.css`** — import Poppins, Lora, Pinyon Script, Oswald from Google Fonts.

### Mock data (single source)
- **`src/app/data/mock.ts`** — TypeScript interfaces + seed data for: `Car`, `Conversation` (with `Message[]`), `Ticket`, `Appointment`, `ReengagementMatch`, `OpenRequest`, `Customer`. Channels enum: `instagram | whatsapp | messenger`. Includes today's date references so "Today" view is populated. ~6 cars, ~12 conversations, ~5 tickets (various ages), ~4 appointments (some today), ~3 re-engagement matches.

### Shell / cross-cutting
- **`src/app/App.tsx`** — layout shell: `<Sidebar>` (desktop) / `<BottomNav>` (mobile), top bar with wordmark + global search, view switcher.
- **`src/app/components/brand/Wordmark.tsx`** — script "The" + condensed "COLLECTION", reversed/dark variants.
- **`src/app/components/shell/Sidebar.tsx`** — navy background, reversed wordmark, nav items with count badges (champagne dot).
- **`src/app/components/shell/BottomNav.tsx`** — mobile bottom bar, same nav + badges.
- **`src/app/components/shell/TopBar.tsx`** — global search input + notifications icon.
- **`src/app/components/common/ChannelBadge.tsx`** — Instagram/WhatsApp/Messenger icon + colour, used everywhere a channel appears.
- **`src/app/components/common/StatusPill.tsx`** — bot / needs-human / resolved / available / reserved / sold pills.
- **`src/app/components/common/AgingDot.tsx`** — fresh→amber→red dot driven by ticket age.
- **`src/app/components/common/SectionHeader.tsx`** — eyebrow (Poppins uppercase tracked) + Lora headline.

### Screens
- **`src/app/components/screens/Home.tsx`** — landing "Today" view: hero greeting, three large summary cards (Today's Appointments, Open Tickets w/ oldest age, New Re-engagement Matches), quiet footnote "Bot handled 384 conversations today." Empty state "All clear."
- **`src/app/components/screens/Conversations.tsx`** — unified inbox: filter row (channel chips, status chips, search), list of threads (needs-human first), opening a thread shows split: message history + composer on left, customer context panel on right (collapses to overlay on mobile). Actions: reply, take over, hand back, mark resolved.
- **`src/app/components/screens/Tickets.tsx`** — oldest-first queue. Each row: aging dot, customer, channel, question snippet, time opened, reply window indicator. Click to open detail with full context + composer.
- **`src/app/components/screens/Appointments.tsx`** — today highlighted at top, then upcoming. Each card: customer, time, car (with thumbnail), channel, contact, reminder-sent indicator. Actions: reschedule, complete, no-show, open thread.
- **`src/app/components/screens/Reengagement.tsx`** — two stacks: "New matches" (car → N past customers) and "Open requests" (standing wanted list). Per match: customer, what they asked, when, contact button (WhatsApp template auto / Instagram manual hint), mark contacted/fulfilled/dismissed.
- **`src/app/components/screens/Inventory.tsx`** — photo-forward grid of cars (`ImageWithFallback` with Unsplash luxury car imagery), each tile: image, make/model/year, price, status pill, quick status toggle, edit. Header "Add a car" opens dialog with form (make, model, variant, year, mileage, colour, price, status).

### Shared sub-components
- **`src/app/components/conversation/MessageThread.tsx`** — message bubbles (bot vs human vs customer styling).
- **`src/app/components/conversation/Composer.tsx`** — textarea + send, 24h-window indicator, take-over toggle. Shared by Conversations and Tickets.
- **`src/app/components/conversation/CustomerContextPanel.tsx`** — contact, channel, short history, linked car (with thumbnail), booking, open request, handler (bot/human).

## Reuse
- Use existing shadcn/ui primitives already in `src/app/components/ui/*` (Button, Card, Dialog, Input, Tabs, Badge, ScrollArea, Avatar, Separator, Switch, Select). Do not rebuild.
- Use `lucide-react` icons throughout.
- Use existing `src/app/components/figma/ImageWithFallback.tsx` for all car imagery.

## Mock interactivity
All actions update local React state in `App.tsx` (or per-screen state lifted as needed). Examples:
- Reply → appends message to thread, sets status to "resolved" if marked so.
- Take over → sets handler `human`, changes pill.
- Add car → prepends to inventory and synthesises a re-engagement match if any open request matches.
- Status toggle → updates car status; sold/reserved hides from re-engagement.

## Verification
1. Dev server is already running — open the preview.
2. Walk the "Day in the Dashboard" flow from §7 of the brief: Home → tap Tickets → resolve two → back to Home → Appointments → Inventory add car → see new Re-engagement match.
3. Resize browser to phone width (≤640px): sidebar collapses to bottom nav, panels stack, composer remains one-tap reachable.
4. Confirm brand palette: navy sidebar w/ reversed wordmark, champagne only on accents (active nav indicator, rules, key CTAs), generous whitespace, Lora used for editorial copy, Poppins uppercase for labels.
5. Empty states render ("All clear" on Home when arrays cleared).

---

# Increment 2 — Complete the Remaining UI

## Context
The six core screens are in place and the day-in-the-dashboard flow works. This increment closes the gaps that the brief calls for but the first pass deferred: the parts of §4–§5 that are not yet wired, plus the mobile-first parity the brief insists on. Goal: every action the brief lists actually works, and nothing dead-ends.

## Gaps vs. brief (and the fix)

| # | Gap | Source in brief | Fix |
|---|---|---|---|
| 1 | No login screen | §8 "single owner login" | Add a one-screen sign-in (full-bleed Midnight Navy, reversed wordmark, email + passphrase, mock auth gates the app). |
| 2 | Customer profile not openable | §4.2 actions "view the customer profile" | Add a slide-over Sheet reachable from any customer name (Conversations list, Tickets, Appointments, Re-engagement). Shows contact, channels used, full thread history list, linked cars, bookings, requests. |
| 3 | Edit-a-car missing | §4.6 "Add, edit, set status" | Reuse the Add dialog as Edit; "Edit" button on each inventory card pre-fills the form. |
| 4 | Global search is local-only | §5 "Find a customer, a car, or a conversation from anywhere" | Turn TopBar search into a Popover with grouped results (Customers / Cars / Conversations). Selecting an item navigates to the right screen and opens the right thing. |
| 5 | Customer context panel hidden on mobile | §2 mobile-first, §5 customer context panel | Show an "Info" button in the conversation detail header on `<lg`; opens the existing `CustomerContextPanel` inside a `Sheet`. |
| 6 | Notifications bell is decorative | §5 "Notifications & badges" | Wire the bell to a `Sheet` listing recent events (new ticket, today's appointment in 1h, new match). Each item navigates. |
| 7 | "Open thread" buttons dead-end | §4.4 actions, §4.5 actions | Appointment card's "Open thread", Reengagement "Contact" with Instagram, and Tickets all jump to Conversations with the right thread open. Lift `openConversationId` into `App.tsx` and pass an initial selection prop into `Conversations`. |
| 8 | Reschedule silently bumps +1 day | §4.4 "reschedule (which updates the calendar)" | Replace with a small dialog using existing `ui/calendar.tsx` + a time `Select`; on save updates `appointment.at` and clears `reminderSent`. |
| 9 | Appointments has no calendar view | §4.4 "a list or calendar of bookings" | Add a List / Month toggle. Month view uses existing `ui/calendar.tsx` with dots on booked dates; selecting a date filters the list below. |
| 10 | Filtered empty states are bland | §4.1 "All clear" model | Use the same champagne-rule + italic Lora pattern everywhere arrays go empty (Conversations filter, Tickets clear, Re-engagement done, Inventory filter). |

## Files

### New
- **`src/app/components/screens/SignIn.tsx`** — full-bleed navy, reversed wordmark, "By appointment · Islamabad" footer, single email + passphrase (mock — any non-empty values pass). Lora italic tagline "Acquired, never simply bought."
- **`src/app/components/customer/CustomerProfileSheet.tsx`** — wraps `ui/sheet.tsx`. Props: `customerId | null`, `onClose`, plus derived bundles (threads, cars, appointments, requests).
- **`src/app/components/shell/GlobalSearch.tsx`** — owns the search input and a `ui/popover.tsx` panel. Memoised grouped results from `customers`, `cars`, `conversations`. `onSelect` callback bubbles `{ kind, id }` up to `App`.
- **`src/app/components/shell/NotificationsSheet.tsx`** — derived event feed (most recent ticket, today's appointments by upcoming time, new matches). Each row navigates.
- **`src/app/components/appointments/RescheduleDialog.tsx`** — wraps `ui/dialog.tsx` + `ui/calendar.tsx` + a 30-min time `ui/select.tsx`. Returns ISO string.

### Modified
- **`src/app/App.tsx`**
  - Gate render behind `signedIn` state (default `false`); render `<SignIn />` otherwise.
  - Add `openConversationId`, `openCustomerId` state. Pass `openConversationId` + `onOpenConversation` into `Conversations` so cross-links work. Pass `onOpenCustomer` into every screen that lists customers; render `<CustomerProfileSheet />` once at the root.
  - Promote global search results — Top-level handler routes `{kind:'conversation'}` to `setView('conversations') + setOpenConversationId(id)`, etc.
- **`src/app/components/shell/TopBar.tsx`** — replace bare `<input>` with `<GlobalSearch>` and add the notifications trigger.
- **`src/app/components/screens/Conversations.tsx`**
  - Accept controlled `openId` / `onOpenChange` props (fall back to internal state if absent).
  - On `<lg`, the right context panel becomes a `Sheet` opened by an "Info" button in the header (use `ui/sheet.tsx`).
- **`src/app/components/screens/Inventory.tsx`**
  - Add "Edit" button per card; opens the existing form pre-filled. Extract form into `InventoryFormDialog` for clarity, or pass an `editing` prop.
- **`src/app/components/screens/Appointments.tsx`**
  - Wire "Open thread" via new `onOpenThread(conversationId)` prop.
  - Replace silent reschedule with `<RescheduleDialog>`.
  - Add List / Month view toggle (state local to component).
- **`src/app/components/screens/Reengagement.tsx`** — "Contact" callback: if `channel === 'instagram' | 'messenger'`, navigate to the relevant conversation (create a synthetic one if none exists, or open the latest with that customer); for `whatsapp` keep the auto-template marker.
- **`src/app/components/screens/Tickets.tsx`** — ticket header gains an "Open in Inbox" link that uses `onOpenThread`.

### Mock data tweak
- **`src/app/data/mock.ts`** — small helper `findOrCreateConversation(customerId, carId?)`-style util kept in `App.tsx` (don't bloat the data file).

## Reuse (do not rebuild)
- `src/app/components/ui/sheet.tsx` for: customer profile, mobile context panel, notifications.
- `src/app/components/ui/popover.tsx` for: global search results panel.
- `src/app/components/ui/calendar.tsx` for: reschedule date and Appointments month view.
- `src/app/components/ui/dialog.tsx`, `select.tsx`, `input.tsx`, `label.tsx` — already used in Inventory; reuse for Reschedule + Edit Car.
- Existing `CustomerContextPanel` is reused inside the mobile Sheet — do not duplicate its markup.
- `relativeAge`, `formatTime`, `formatDate`, `windowClosingSoon` already in `mock.ts`.

## Out of scope (still)
- Real auth, real backend, real push notifications.
- Saved quick-replies (brief explicitly says "later").
- Analytics, hot-lead scoring, multi-tenant — §9.

## Verification
1. Reload preview → land on Sign-In screen → enter anything → enter the app.
2. Click the search box, type "Range" → see Cars + Conversations groups → pick the conversation → land on Conversations with that thread open.
3. From Appointments, click "Open thread" on a card → land on Conversations with that customer's thread open.
4. From a conversation header at phone width, tap "Info" → context panel slides up.
5. Click any customer name → profile sheet shows their threads, linked cars, bookings.
6. Inventory: click Edit on a card → form pre-filled → save → card updates.
7. Appointments: toggle Month view → see champagne dots on booked days → click a date → list filters. Reschedule a viewing through the new dialog and confirm the calendar updates and reminder pill resets.
8. Bell icon opens notifications sheet; each item navigates.
9. Empty-state pattern (champagne rule + italic Lora) appears identically across Home, Conversations filter, Tickets cleared, Reengagement done, Inventory no-match.
