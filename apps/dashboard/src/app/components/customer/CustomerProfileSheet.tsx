import { Phone, AtSign, MessageSquare, CalendarDays, Car as CarIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { ChannelBadge } from "../common/ChannelBadge";
import { StatusPill } from "../common/StatusPill";
import { Button } from "../ui/button";
import type { Car } from "@collection/shared";
import type { Customer, Conversation, Appointment } from "../../data/mock";
import { formatCurrency, formatDate, formatTime, relativeAge } from "../../data/mock";

interface Props {
  customerId: string | null;
  customers: Customer[];
  conversations: Conversation[];
  cars: Car[];
  appointments: Appointment[];
  onClose: () => void;
  onOpenConversation: (id: string) => void;
}

export function CustomerProfileSheet({
  customerId, customers, conversations, cars, appointments, onClose, onOpenConversation,
}: Props) {
  const cust = customerId ? customers.find((c) => c.id === customerId) : null;
  if (!cust) {
    return (
      <Sheet open={false} onOpenChange={(o) => !o && onClose()}>
        <SheetContent />
      </Sheet>
    );
  }

  const threads = conversations.filter((c) => c.customerId === cust.id);
  const bookings = appointments.filter((a) => a.customerId === cust.id);
  const linkedCars = Array.from(
    new Set(threads.map((t) => t.carId).filter(Boolean))
  ).map((id) => cars.find((c) => c.id === id)!).filter(Boolean);

  return (
    <Sheet open={!!customerId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b border-border">
          <div className="eyebrow mb-2">Client profile</div>
          <SheetTitle className="editorial" style={{ fontSize: "1.5rem" }}>{cust.name}</SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <ChannelBadge channel={cust.channel} showLabel />
          </div>
          <div className="mt-4 space-y-1.5 text-ink-60" style={{ fontSize: "0.85rem" }}>
            <div className="flex items-center gap-2"><AtSign size={14} /> {cust.handle}</div>
            {cust.phone && <div className="flex items-center gap-2"><Phone size={14} /> {cust.phone}</div>}
          </div>
        </SheetHeader>

        <section className="p-6 border-b border-border">
          <div className="eyebrow mb-3 flex items-center gap-2"><MessageSquare size={11} /> Threads ({threads.length})</div>
          {threads.length === 0 ? (
            <p className="text-ink-40" style={{ fontSize: "0.85rem" }}>No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {threads.map((t) => {
                const last = t.messages[t.messages.length - 1];
                return (
                  <button
                    key={t.id}
                    onClick={() => { onOpenConversation(t.id); onClose(); }}
                    className="w-full text-left rounded-md border border-border hover:border-accent/40 p-3 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ChannelBadge channel={t.channel} />
                      <StatusPill tone={t.status === "needs_human" ? "human" : t.status === "bot" ? "bot" : "resolved"} />
                      <span className="ml-auto text-ink-40" style={{ fontSize: "0.7rem" }}>{relativeAge(t.lastAt)}</span>
                    </div>
                    <div className="text-ink-60 truncate" style={{ fontSize: "0.82rem" }}>{last?.text}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {linkedCars.length > 0 && (
          <section className="p-6 border-b border-border">
            <div className="eyebrow mb-3 flex items-center gap-2"><CarIcon size={11} /> Cars discussed</div>
            <div className="space-y-3">
              {linkedCars.map((car) => (
                <div key={car.id} className="flex gap-3">
                  <div className="w-20 h-14 shrink-0 rounded-md overflow-hidden bg-platinum-soft">
                    <ImageWithFallback src={car.image} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{car.year} {car.make} {car.model}</div>
                    <div className="text-ink-60 truncate" style={{ fontSize: "0.78rem" }}>{car.variant} · {formatCurrency(car.price, car.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {bookings.length > 0 && (
          <section className="p-6 border-b border-border">
            <div className="eyebrow mb-3 flex items-center gap-2"><CalendarDays size={11} /> Bookings</div>
            <div className="space-y-2">
              {bookings.map((b) => {
                const car = cars.find((c) => c.id === b.carId);
                return (
                  <div key={b.id} className="flex items-center justify-between gap-3">
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>{formatDate(b.at)} · {formatTime(b.at)}</div>
                      {car && <div className="text-ink-60" style={{ fontSize: "0.78rem" }}>{car.year} {car.make} {car.model}</div>}
                    </div>
                    <span className="eyebrow" style={{ fontSize: "0.65rem" }}>{b.status}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="p-6 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
