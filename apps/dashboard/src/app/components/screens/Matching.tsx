import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Plus, User, Phone, MoreHorizontal,
  ChevronDown, ChevronRight, RotateCw, X, Archive, Search, Flame, Target,
} from "lucide-react";
import { SectionHeader } from "../common/SectionHeader";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { EnquiryForm } from "../matching/EnquiryForm";
import { EnquiryDetailSheet } from "../matching/EnquiryDetailSheet";
import { CarName, SpecChips, enquirySpecs } from "../matching/CarSpec";
import { channelLabel } from "../matching/channel";
import type { Car } from "@collection/shared";
import {
  isEnquiryActive, matchEnquiry,
  type Enquiry, type EnquiryInput, type EnquiryMatch,
} from "@collection/shared";

interface Props {
  enquiries: Enquiry[];
  cars: Car[];
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  onCreate: (input: EnquiryInput) => void;
  onUpdate: (id: string, input: EnquiryInput) => void;
  onStatus: (id: string, status: "fulfilled" | "dismissed" | "archived", fulfilled?: { source: "inventory"; refId: string }) => void;
  onRenew: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenCar: (carId: string) => void;
  // Injectable for previews/tests; defaults to the real match RPC.
  getBuyingMatches?: (id: string) => Promise<EnquiryMatch[]>;
}

type Filter = "all" | "exact" | "expiring" | "today";
const EXPIRING_DAYS = 3;

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const key = (make: string, model: string) => `${make.trim().toLowerCase()}|${model.trim().toLowerCase()}`;
function contactHref(phone: string, channel: string | null) {
  const d = phone.replace(/[^\d]/g, "");
  return channel === "whatsapp" && d ? `https://wa.me/${d}` : `tel:${phone}`;
}
interface Deal { buyer: Enquiry; matches: EnquiryMatch[]; best: EnquiryMatch; exact: number; possible: number }

export function Matching({
  enquiries, cars, loading, error, onReload, onCreate, onUpdate, onStatus, onRenew, onDelete, onOpenCar,
  getBuyingMatches = matchEnquiry,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [watchOpen, setWatchOpen] = useState(false);
  const [form, setForm] = useState<{ open: boolean; editing: Enquiry | null }>({ open: false, editing: null });
  const [detailId, setDetailId] = useState<string | null>(null);

  const [buyMatches, setBuyMatches] = useState<Record<string, EnquiryMatch[]>>({});

  const active = useMemo(() => enquiries.filter(isEnquiryActive), [enquiries]);

  // Fetch the real matches for every ACTIVE inquiry so the ledger can be built
  // buyer-anchored. Background + merge (no flash) on any inventory/enquiry change.
  useEffect(() => {
    let alive = true;
    const buy = active.map((e) => e.id);
    Promise.all(buy.map((id) => getBuyingMatches(id).then((r) => [id, r] as const).catch(() => [id, null] as const)))
      .then((es) => { if (alive) setBuyMatches((p) => mergeArr(p, es)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiries, cars]);

  // --- derive the ledger -----------------------------------------------------
  // Every active enquiry is a buyer now (sellers became inventory).
  const buyers = active;

  const deals: Deal[] = useMemo(() => {
    const out: Deal[] = [];
    for (const b of buyers) {
      const m = buyMatches[b.id];
      if (!m || m.length === 0) continue;
      out.push({ buyer: b, matches: m, best: m[0], exact: m.filter((x) => x.tier === "exact").length, possible: m.filter((x) => x.tier === "possible").length });
    }
    // exact-first, then soonest-expiring, then newest
    return out.sort((a, b) => {
      const ax = a.exact > 0 ? 0 : 1, bx = b.exact > 0 ? 0 : 1;
      if (ax !== bx) return ax - bx;
      const ad = daysLeft(a.buyer.expiresAt), bd = daysLeft(b.buyer.expiresAt);
      if (ad !== bd) return ad - bd;
      return +new Date(b.buyer.createdAt) - +new Date(a.buyer.createdAt);
    });
  }, [buyers, buyMatches]);

  const watchingBuyers = useMemo(() => buyers.filter((b) => buyMatches[b.id] && buyMatches[b.id].length === 0), [buyers, buyMatches]);

  // --- market strip data -----------------------------------------------------
  const strip = useMemo(() => {
    // Count BUYERS/deals, not cars — a buyer counts once. "exact" = buyers with an
    // actionable exact match; "possible only" = buyers who have possibles but no
    // exact. A buyer with both counts under exact (they have an exact to act on).
    // (The per-row chips separately show that buyer's own CAR counts — see MatchCounts.)
    const exactBuyers = deals.filter((d) => d.exact > 0).length;
    const possibleOnlyBuyers = deals.filter((d) => d.exact === 0).length;
    const watching = watchingBuyers.length;
    const expiring = deals.filter((d) => daysLeft(d.buyer.expiresAt) <= EXPIRING_DAYS).length;
    // hottest model = most active buyers on a make/model
    const demand = new Map<string, { label: string; n: number }>();
    for (const b of buyers) { const k = key(b.make, b.model); const e = demand.get(k) ?? { label: `${b.make} ${b.model}`, n: 0 }; e.n++; demand.set(k, e); }
    const hot = [...demand.values()].filter((x) => x.n >= 2).sort((a, b) => b.n - a.n)[0];
    // sourcing target = demand with no supply (a no-match buyer's model)
    const sourceMap = new Map<string, { label: string; n: number }>();
    for (const b of watchingBuyers) { const k = key(b.make, b.model); const e = sourceMap.get(k) ?? { label: `${b.make} ${b.model}`, n: 0 }; e.n++; sourceMap.set(k, e); }
    const sourcing = [...sourceMap.values()].sort((a, b) => b.n - a.n)[0];
    return { exactBuyers, possibleOnlyBuyers, watching, expiring, hot, sourcing };
  }, [deals, watchingBuyers, buyers]);

  // --- filter + search -------------------------------------------------------
  const s = q.trim().toLowerCase();
  const matchesQ = (e: Enquiry) => !s || `${e.customerName} ${e.make} ${e.model} ${e.variant ?? ""}`.toLowerCase().includes(s);
  const visibleDeals = useMemo(() => deals.filter((d) => {
    if (!matchesQ(d.buyer)) return false;
    if (filter === "exact") return d.exact > 0;
    if (filter === "expiring") return daysLeft(d.buyer.expiresAt) <= EXPIRING_DAYS;
    if (filter === "today") return isToday(d.buyer.createdAt);
    return true;
  }), [deals, filter, s]);

  const detail = detailId ? enquiries.find((e) => e.id === detailId) ?? null : null;
  const openNew = () => setForm({ open: true, editing: null });
  const submitForm = (input: EnquiryInput) => { if (form.editing) onUpdate(form.editing.id, input); else onCreate(input); setForm((f) => ({ ...f, open: false, editing: null })); };
  const stillLoading = buyers.some((b) => buyMatches[b.id] === undefined);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" }, { key: "exact", label: "Exact" }, { key: "expiring", label: "Expiring" },
    { key: "today", label: "Today" },
  ];

  const dealActions = (buyer: Enquiry) => (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-1.5 rounded-md text-ink-40 hover:text-noir hover:bg-platinum-soft transition-colors" aria-label="More"><MoreHorizontal size={16} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setDetailId(buyer.id)}>Full breakdown</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setForm({ open: true, editing: buyer })}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onRenew(buyer.id)}><RotateCw size={13} className="mr-2" />Renew</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onStatus(buyer.id, "dismissed")}><X size={13} className="mr-2" />Dismiss</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onStatus(buyer.id, "archived")}><Archive size={13} className="mr-2" />Archive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <SectionHeader eyebrow="Demand & supply" title="Matching" subtitle="Deals you can make right now — one buyer per row; open a row for their matched cars." />
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="bg-noir text-white hover:bg-noir-700" onClick={openNew}><Plus size={14} className="mr-1" />New inquiry</Button>
        </div>
      </div>

      {/* Market summary strip — slim, subordinate to the ledger */}
      <div className="rounded-lg border border-card-border bg-white shadow-[var(--shadow-card)] px-4 py-3 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap" style={{ fontSize: "0.82rem" }}>
          <span><span className="editorial text-accent" style={{ fontSize: "1.05rem" }}>{strip.exactBuyers}</span> <span className="text-ink-60">{strip.exactBuyers === 1 ? "buyer" : "buyers"} with exact</span></span>
          <span className="text-ink-40">·</span>
          <span><span className="editorial text-noir" style={{ fontSize: "1.05rem" }}>{strip.possibleOnlyBuyers}</span> <span className="text-ink-60">with possible only</span></span>
          <span className="text-ink-40">·</span>
          <span><span className="editorial text-noir" style={{ fontSize: "1.05rem" }}>{strip.watching}</span> <span className="text-ink-60">watching</span></span>
          {strip.expiring > 0 && <><span className="text-ink-40">·</span><span><span className="editorial text-signal-red" style={{ fontSize: "1.05rem" }}>{strip.expiring}</span> <span className="text-ink-60">expiring</span></span></>}
        </div>
        <div className="hidden lg:flex items-center gap-2">
          {strip.hot && <Callout icon={<Flame size={11} />} tone="accent" text={`Hot · ${strip.hot.label} (${strip.hot.n})`} />}
          {strip.sourcing && <Callout icon={<Target size={11} />} tone="amber" text={`Source · ${strip.sourcing.n} want ${strip.sourcing.label}, none available`} />}
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full border transition-colors ${filter === f.key ? "bg-noir text-white border-noir" : "border-border text-ink-60 hover:border-accent/40"}`}
              style={{ fontSize: "0.8rem", fontWeight: 500 }}>{f.label}</button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search buyer or car…"
            className="pl-8 pr-3 py-1.5 rounded-full border border-border bg-white text-noir placeholder:text-ink-40 focus:border-accent/50 outline-none" style={{ fontSize: "0.8rem", width: 200 }} />
        </div>
      </div>

      {loading ? (
        <p className="text-ink-40 py-10 text-center" style={{ fontSize: "0.9rem" }}>Loading inquiries…</p>
      ) : error ? (
        <div className="py-10 text-center"><p className="text-signal-red mb-3" style={{ fontSize: "0.9rem" }}>{error}</p>{onReload && <Button variant="outline" size="sm" onClick={onReload}>Retry</Button>}</div>
      ) : (
        <>
          {visibleDeals.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <div className="accent-rule mx-auto mb-4" />
              <p className="text-ink-60">{stillLoading ? "Finding deals…" : filter === "today" ? "No deals from today's inquiries." : filter === "exact" ? "No exact deals right now." : filter === "expiring" ? "No deals expiring soon." : "No makeable deals yet."}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-card-border bg-white shadow-[var(--shadow-card)] divide-y divide-border/60">
              {visibleDeals.map((d) => (
                <DealRow key={d.buyer.id} deal={d} onOpen={() => setDetailId(d.buyer.id)} actions={dealActions(d.buyer)} />
              ))}
            </div>
          )}

          {/* Watching drawer — buyers with no match yet, out of the actionable flow */}
          {watchingBuyers.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-alabaster/50 overflow-hidden">
              <button onClick={() => setWatchOpen((o) => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-platinum-soft/30 transition-colors">
                {watchOpen ? <ChevronDown size={15} className="text-ink-40" /> : <ChevronRight size={15} className="text-ink-40" />}
                <span className="eyebrow text-ink-60">Watching</span>
                <span className="text-ink-40" style={{ fontSize: "0.78rem" }}>{watchingBuyers.length} waiting on stock we don't have yet</span>
              </button>
              {watchOpen && (
                <div className="divide-y divide-border/60 border-t border-border">
                  {watchingBuyers.map((b) => <WatchRow key={b.id} e={b} onOpen={() => setDetailId(b.id)} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <EnquiryForm open={form.open} editing={form.editing} onClose={() => setForm((f) => ({ ...f, open: false, editing: null }))} onSubmit={submitForm} />
      <EnquiryDetailSheet enquiry={detail} onClose={() => setDetailId(null)}
        onEdit={(e) => { setDetailId(null); setForm({ open: true, editing: e }); }}
        onStatus={onStatus} onRenew={onRenew} onDelete={(id) => { onDelete(id); setDetailId(null); }} onOpenCar={onOpenCar}
        getBuyingMatches={getBuyingMatches} />
    </div>
  );
}

function mergeArr<T>(prev: Record<string, T[]>, entries: (readonly [string, T[] | null])[]): Record<string, T[]> {
  const next = { ...prev };
  for (const [id, v] of entries) if (v) next[id] = v;
  return next;
}

function Callout({ icon, text, tone }: { icon: ReactNode; text: string; tone: "accent" | "amber" | "ink" }) {
  const cls = tone === "accent" ? "bg-accent/15 text-noir" : tone === "amber" ? "bg-signal-amber/15 text-noir" : "bg-platinum-soft text-ink-60";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${cls}`} style={{ fontSize: "0.72rem", fontWeight: 500 }}>{icon}{text}</span>;
}

function ExpiryTag({ e }: { e: Enquiry }) {
  const d = daysLeft(e.expiresAt);
  const soon = d <= EXPIRING_DAYS;
  return <span className={soon ? "text-signal-red" : "text-ink-40"} style={{ fontSize: "0.66rem", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>{d <= 0 ? "expired" : `${d}d left`}</span>;
}

// A buyer SUMMARY row: name, ask, this buyer's match counts, expiry, Contact, ⋯.
// The whole row is a click target that opens the full-breakdown sheet — that's
// where the matched cars and their View car / Mark fulfilled actions live now.
function DealRow({ deal, onOpen, actions }: { deal: Deal; onOpen: () => void; actions: ReactNode }) {
  const { buyer, exact, possible } = deal;
  // Contact + ⋯ are their own actions — don't let their clicks open the sheet.
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="p-4 md:px-5 cursor-pointer hover:bg-platinum-soft/30 transition-colors"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 flex size-6 items-center justify-center rounded-full bg-noir text-cream"><User size={12} /></span>
          <span className="truncate text-noir" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{buyer.customerName}</span>
          {buyer.channel && <span className="text-ink-40 shrink-0 hidden sm:inline" style={{ fontSize: "0.7rem" }}>· {channelLabel(buyer.channel)}</span>}
          {isToday(buyer.createdAt) && <span className="shrink-0 rounded-full bg-accent/20 text-noir px-1.5 py-0.5" style={{ fontSize: "0.58rem", letterSpacing: "0.06em", fontWeight: 700 }}>NEW</span>}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <ExpiryTag e={buyer} />
          <a href={contactHref(buyer.customerPhone, buyer.channel)} onClick={stop} className="inline-flex items-center gap-1 text-accent hover:text-noir transition-colors" style={{ fontSize: "0.78rem" }}><Phone size={12} />Contact</a>
          <span onClick={stop} className="inline-flex">{actions}</span>
        </div>
      </div>
      {/* The car reads as the primary thing; its criteria as quiet outline chips.
          Below sm the match counts drop to their own line — sharing it would squeeze
          the car name into an ellipsis, and the car is the one thing that must stay
          legible. */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-ink-40 shrink-0" style={{ fontSize: "0.72rem" }}>wants</span>
          <CarName make={buyer.make} model={buyer.model} variant={buyer.variant} />
          <SpecChips specs={enquirySpecs(buyer)} />
        </div>
        <MatchCounts exact={exact} possible={possible} />
      </div>
    </div>
  );
}

// This buyer's own match counts (CARS/matches, not buyers — the strip counts
// buyers). A quick at-a-glance signal; the detail is one click away in the sheet.
function MatchCounts({ exact, possible }: { exact: number; possible: number }) {
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      {exact > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 text-noir px-2 py-0.5" style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.03em" }}>
          <span className="size-1.5 rounded-full bg-accent" />{exact} exact
        </span>
      )}
      {possible > 0 && (
        <span className="inline-flex items-center rounded-full bg-platinum-soft text-ink-60 px-2 py-0.5" style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.03em" }}>
          {possible} possible
        </span>
      )}
    </span>
  );
}

function WatchRow({ e, onOpen }: { e: Enquiry; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full text-left px-4 py-2.5 hover:bg-platinum-soft/40 transition-colors flex items-center gap-3">
      <span className="shrink-0 flex size-7 items-center justify-center rounded-full bg-noir/80 text-cream"><User size={13} /></span>
      <span className="flex-1 min-w-0">
        <span className="text-noir truncate block" style={{ fontSize: "0.85rem", fontWeight: 500 }}>{e.make} {e.model}{e.variant ? ` ${e.variant}` : ""}</span>
        <span className="text-ink-40 truncate block" style={{ fontSize: "0.74rem" }}>{e.customerName} · wants — none available</span>
      </span>
      <ExpiryTag e={e} />
    </button>
  );
}
