import { useEffect, useState } from "react";
import { Phone, Car as CarIcon, User, Check, X, RotateCw, Pencil, Trash2, Archive, Store, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import { Button } from "../ui/button";
import { StatusPill } from "../common/StatusPill";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import {
  matchEnquiry, matchSellingEnquiry,
  type Enquiry, type EnquiryMatch, type SellingMatch, type MatchTier,
} from "@collection/shared";
import { formatCurrency, relativeAge } from "../../data/mock";
import { CarName, SpecChips, SpecGrid, enquirySpecs, buyerSpecs } from "./CarSpec";
import { channelLabel } from "./channel";

interface Props {
  enquiry: Enquiry | null;
  onClose: () => void;
  onEdit: (e: Enquiry) => void;
  onStatus: (id: string, status: "fulfilled" | "dismissed" | "archived", fulfilled?: { source: "inventory" | "selling"; refId: string }) => void;
  onRenew: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenCar: (carId: string) => void;
  // Injectable for previews/tests; default to the real match RPCs.
  getBuyingMatches?: (id: string) => Promise<EnquiryMatch[]>;
  getSellingMatches?: (id: string) => Promise<SellingMatch[]>;
}

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

function ExpiryChip({ e }: { e: Enquiry }) {
  const d = daysLeft(e.expiresAt);
  const expired = d <= 0 || e.status !== "active";
  const soon = !expired && d <= 3;
  const label = e.status !== "active" ? e.status : expired ? "expired" : `expires in ${d}d`;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 ${expired ? "bg-signal-red/10 text-signal-red" : soon ? "bg-signal-amber/15 text-noir" : "text-ink-40"}`}
      style={{ fontSize: "0.68rem", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 500 }}
    >
      {label}
    </span>
  );
}

function contactHref(phone: string, channel: string | null) {
  const digits = phone.replace(/[^\d]/g, "");
  if (channel === "whatsapp" && digits) return `https://wa.me/${digits}`;
  return `tel:${phone}`;
}

export function EnquiryDetailSheet({ enquiry, onClose, onEdit, onStatus, onRenew, onDelete, onOpenCar, getBuyingMatches = matchEnquiry, getSellingMatches = matchSellingEnquiry }: Props) {
  const [matches, setMatches] = useState<EnquiryMatch[] | null>(null);
  const [reverse, setReverse] = useState<SellingMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = enquiry?.id;
  const type = enquiry?.type;
  // Re-run matching when the enquiry's CRITERIA change too (updatedAt bumps on any
  // edit) — so if another admin edits this open enquiry live, the match list is
  // refetched to stay consistent with the header, not just [id, type].
  const updatedAt = enquiry?.updatedAt;

  useEffect(() => {
    if (!id || !type) { setMatches(null); setReverse(null); return; }
    let alive = true;
    setLoading(true); setError(null); setMatches(null); setReverse(null);
    const run = type === "buying" ? getBuyingMatches(id) : getSellingMatches(id);
    run
      .then((res) => { if (!alive) return; if (type === "buying") setMatches(res as EnquiryMatch[]); else setReverse(res as SellingMatch[]); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Failed to load matches."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, type, updatedAt]);

  // Close this sheet before opening the car sheet (avoid stacked modal overlays).
  const openCar = (carId: string) => { onClose(); onOpenCar(carId); };

  if (!enquiry) return null;
  const e = enquiry;
  const money = (n: number | null, cur?: string | null) => (n != null ? formatCurrency(n, cur ?? "PKR") : "—");

  const specs = enquirySpecs(e);

  return (
    <Sheet open={!!enquiry} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b border-border">
          <div className="eyebrow mb-2 flex items-center gap-1.5">
            {e.type === "buying" ? <User size={11} /> : <CarIcon size={11} />}
            {e.type} inquiry
            <span className="ml-1"><ExpiryChip e={e} /></span>
          </div>
          {/* The car is the headline; the variant its second tier. */}
          <SheetTitle className="editorial" style={{ fontSize: "1.6rem", lineHeight: 1.15 }}>{e.make} {e.model}</SheetTitle>
          {e.variant && <div className="text-ink-60 mt-0.5" style={{ fontSize: "0.9rem" }}>{e.variant}</div>}
          <SheetDescription className="sr-only">
            {e.type === "buying" ? "Buying" : "Selling"} inquiry for {e.make} {e.model}
            {specs.length ? `. ${specs.map((s) => `${s.label}: ${s.long}`).join(". ")}.` : "."}
          </SheetDescription>

          {/* The criteria, laid out so every value can be read on its own. */}
          {specs.length > 0 ? (
            <div className="mt-4 rounded-lg border border-border bg-alabaster/60 px-4 py-3.5">
              <SpecGrid specs={specs} />
            </div>
          ) : (
            <p className="mt-2 text-ink-40" style={{ fontSize: "0.82rem" }}>No further criteria.</p>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-noir" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{e.customerName}</span>
            {e.channel && <span className="text-ink-40" style={{ fontSize: "0.72rem" }}>· {channelLabel(e.channel)}</span>}
            <a href={contactHref(e.customerPhone, e.channel)} className="inline-flex items-center gap-1 text-accent hover:text-noir transition-colors" style={{ fontSize: "0.8rem" }}>
              <Phone size={12} /> {e.customerPhone}
            </a>
          </div>
          {e.notes && <p className="mt-2 text-ink-60" style={{ fontSize: "0.82rem" }}>"{e.notes}"</p>}

          {/* Lifecycle actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(e)}><Pencil size={13} className="mr-1" />Edit</Button>
            <Button variant="outline" size="sm" onClick={() => onRenew(e.id)}><RotateCw size={13} className="mr-1" />Renew</Button>
            {e.status === "active" && (
              <>
                <Button variant="outline" size="sm" onClick={() => onStatus(e.id, "fulfilled")}><Check size={13} className="mr-1" />Fulfilled</Button>
                <Button variant="ghost" size="sm" onClick={() => onStatus(e.id, "dismissed")}><X size={13} className="mr-1" />Dismiss</Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => onStatus(e.id, "archived")}><Archive size={13} className="mr-1" />Archive</Button>
            <Button variant="ghost" size="sm" className="text-signal-red hover:text-signal-red hover:bg-signal-red/5" onClick={() => onDelete(e.id)}><Trash2 size={13} className="mr-1" />Delete</Button>
          </div>
        </SheetHeader>

        <div className="p-6">
          <div className="eyebrow mb-3 text-ink-60">{e.type === "buying" ? "Matches" : "Buyers waiting"}</div>
          {loading && <p className="text-ink-40" style={{ fontSize: "0.85rem" }}>Finding matches…</p>}
          {error && <p className="text-signal-red" style={{ fontSize: "0.85rem" }}>{error}</p>}

          {/* BUYING → inventory + selling matches, grouped by tier */}
          {e.type === "buying" && matches && (
            matches.length === 0 ? <EmptyMatches /> : (
              <div className="space-y-6">
                <MatchGroup tier="exact" items={matches.filter((m) => m.tier === "exact")} onOpenCar={openCar} onFulfill={(m) => onStatus(e.id, "fulfilled", { source: m.source, refId: m.refId })} money={money} />
                <MatchGroup tier="possible" items={matches.filter((m) => m.tier === "possible")} onOpenCar={openCar} onFulfill={(m) => onStatus(e.id, "fulfilled", { source: m.source, refId: m.refId })} money={money} />
              </div>
            )
          )}

          {/* SELLING → reverse "buyers waiting" */}
          {e.type === "selling" && reverse && (
            reverse.length === 0 ? <EmptyMatches label="No active buyers waiting for this car." /> : (
              <div className="space-y-4">
                {(["exact", "possible"] as MatchTier[]).map((tier) => {
                  const rows = reverse.filter((r) => r.tier === tier);
                  if (rows.length === 0) return null;
                  return (
                    <section key={tier}>
                      <div className="mb-2" style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: tier === "exact" ? "var(--noir)" : "var(--ink-40)" }}>
                        {tier} · {rows.length}
                      </div>
                      <div className="space-y-2">
                        {rows.map((r) => (
                          <div key={r.refId} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-noir truncate" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{r.customerName}</div>
                                <div className="text-ink-40" style={{ fontSize: "0.72rem" }}>asked {relativeAge(r.createdAt)}</div>
                              </div>
                              <a href={contactHref(r.customerPhone, r.channel)} className="shrink-0 inline-flex items-center gap-1 text-accent hover:text-noir transition-colors" style={{ fontSize: "0.8rem" }}>
                                <Phone size={12} /> Contact
                              </a>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-ink-40 shrink-0" style={{ fontSize: "0.72rem" }}>wants</span>
                              <CarName make={r.make} model={r.model} variant={r.variant} />
                              <SpecChips specs={buyerSpecs(r)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Documents only earn a chip when they say something. The dealership's own stock
// is docs-complete by default, so "Full docs" on every inventory card would be
// noise — flag the EXCEPTION instead, and keep the seller's positive claim.
function DocsFlag({ m }: { m: EnquiryMatch }) {
  if (m.docsComplete === false) {
    return (
      <span className="inline-flex items-center rounded-full bg-signal-amber/15 text-noir px-2 py-0.5"
        style={{ fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
        No full docs
      </span>
    );
  }
  if (m.source === "selling" && m.docsComplete === true) {
    return (
      <span className="inline-flex items-center rounded-full border border-border text-ink-60 px-2 py-0.5"
        style={{ fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
        Full docs
      </span>
    );
  }
  return null;
}

function EmptyMatches({ label = "No matches yet." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <div className="accent-rule mx-auto mb-3" />
      <p className="text-ink-60" style={{ fontSize: "0.85rem" }}>{label}</p>
    </div>
  );
}

function MatchGroup({
  tier, items, onOpenCar, onFulfill, money,
}: {
  tier: MatchTier;
  items: EnquiryMatch[];
  onOpenCar: (carId: string) => void;
  onFulfill: (m: EnquiryMatch) => void;
  money: (n: number | null, cur?: string | null) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2" style={{ fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: tier === "exact" ? "var(--noir)" : "var(--ink-40)" }}>
        {tier} · {items.length}
      </div>
      <div className="space-y-2">
        {items.map((m) => (
          <div key={`${m.source}-${m.refId}`} className="rounded-lg border border-border overflow-hidden flex">
            {m.source === "inventory" ? (
              <div className="w-24 shrink-0 bg-platinum-soft">
                <ImageWithFallback src={m.photo ?? ""} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-24 shrink-0 bg-platinum-soft flex items-center justify-center text-ink-40"><User size={20} /></div>
            )}
            <div className="flex-1 min-w-0 p-3">
              {/* Provenance — where it sits, and whether it's actually gettable. */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-ink-40" style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
                  {m.source === "inventory"
                    ? <><Store size={10} /> {m.showroomName ?? "Inventory"}</>
                    : <><User size={10} /> {m.customerName ?? "Seller"}</>}
                </span>
                {m.source === "inventory" && m.status && <StatusPill tone={m.status as "available" | "reserved" | "sold"} />}
                <DocsFlag m={m} />
              </div>

              {/* The car. */}
              <div className="mt-1.5">
                <CarName make={m.make} model={m.model} variant={m.variant} year={m.year} stack />
              </div>

              {/* The numbers — price leads, mileage supports (as on the Inventory cards). */}
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <span className="text-noir" style={{ fontSize: "0.95rem", fontWeight: 500 }}>{money(m.price, m.currency)}</span>
                {m.mileageKm != null && (
                  <span className="text-ink-40 shrink-0" style={{ fontSize: "0.75rem" }}>{m.mileageKm.toLocaleString()} km</span>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                {m.source === "inventory" ? (
                  <Button variant="outline" size="sm" onClick={() => onOpenCar(m.refId)}><ExternalLink size={12} className="mr-1" />View car</Button>
                ) : m.customerPhone ? (
                  <a href={contactHref(m.customerPhone, m.channel)} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-noir hover:border-accent/40 transition-colors" style={{ fontSize: "0.78rem" }}>
                    <Phone size={12} /> Contact seller
                  </a>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => onFulfill(m)}><Check size={12} className="mr-1" />Mark fulfilled</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
