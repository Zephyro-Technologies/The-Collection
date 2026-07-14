import { Phone, AtSign, Car as CarIcon, CalendarDays, Bot, UserRound } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { ChannelBadge } from "../common/ChannelBadge";
import type { Car } from "@collection/shared";
import type { Conversation, Customer, Appointment } from "../../data/mock";
import { formatCurrency, formatDate, formatTime, relativeAge } from "../../data/mock";

interface Props {
  conversation: Conversation;
  customer: Customer;
  car?: Car;
  appointment?: Appointment;
}

export function CustomerContextPanel({ conversation, customer, car, appointment }: Props) {
  return (
    <aside className="h-full overflow-y-auto border-l border-border bg-white">
      <div className="p-5 border-b border-border">
        <div className="eyebrow mb-2">Client</div>
        <h3 className="editorial mb-1" style={{ fontSize: "1.1rem" }}>{customer.name}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <ChannelBadge channel={customer.channel} showLabel />
          <span className={`inline-flex items-center gap-1.5 text-ink-60`} style={{ fontSize: "0.78rem" }}>
            {conversation.handler === "bot" ? <Bot size={12} /> : <UserRound size={12} />}
            {conversation.handler === "bot" ? "Bot handling" : "You handling"}
          </span>
        </div>
        <div className="mt-3 space-y-1.5 text-ink-60" style={{ fontSize: "0.82rem" }}>
          <div className="flex items-center gap-2"><AtSign size={13} /> {customer.handle}</div>
          {customer.phone && <div className="flex items-center gap-2"><Phone size={13} /> {customer.phone}</div>}
        </div>
      </div>

      {car && (
        <div className="p-5 border-b border-border">
          <div className="eyebrow mb-3 flex items-center gap-2"><CarIcon size={11} /> Asked about</div>
          <div className="rounded-md overflow-hidden border border-border">
            <div className="aspect-[16/10] bg-platinum-soft">
              <ImageWithFallback src={car.image} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>{car.year} {car.make} {car.model}</div>
              <div className="text-ink-60" style={{ fontSize: "0.78rem" }}>{car.variant} · {car.colour}</div>
              <div className="mt-1.5 text-noir" style={{ fontSize: "0.85rem", fontWeight: 500 }}>{formatCurrency(car.price, car.currency)}</div>
            </div>
          </div>
        </div>
      )}

      {appointment && (
        <div className="p-5 border-b border-border">
          <div className="eyebrow mb-2 flex items-center gap-2"><CalendarDays size={11} /> Booking</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>{formatDate(appointment.at)} · {formatTime(appointment.at)}</div>
        </div>
      )}

      <div className="p-5">
        <div className="eyebrow mb-2">History</div>
        <div className="text-ink-60" style={{ fontSize: "0.82rem", lineHeight: 1.55 }}>
          {conversation.messages.length} messages over this thread. Last activity {relativeAge(conversation.lastAt)}.
        </div>
      </div>
    </aside>
  );
}
