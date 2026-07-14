import { CalendarDays, Ticket as TicketIcon, ArrowLeftRight, Bot, AlarmClock, ChevronRight } from "lucide-react";
import { SectionHeader } from "../common/SectionHeader";
import type { ViewKey } from "../shell/nav-items";
import type { Car } from "@collection/shared";
import type { Appointment, Ticket, Customer } from "../../data/mock";
import { formatTime, relativeAge, windowClosingSoon } from "../../data/mock";

interface Props {
  today: Appointment[];
  openTickets: Ticket[];
  newEnquiriesToday: number;
  activeEnquiries: number;
  botHandledToday: number;
  customers: Customer[];
  cars: Car[];
  onNavigate: (v: ViewKey) => void;
  onOpenThread: (conversationId: string) => void;
  onOpenCustomer: (customerId: string) => void;
  ticketsUrgent?: boolean;
}

// A worklist panel: labelled header + a divided list of tappable rows, with an
// optional "view all" footer. Shares the standard lifted-card treatment.
function Panel({
  label, Icon, count, urgent, empty, onViewAll, children,
}: {
  label: string; Icon: typeof CalendarDays; count: number; urgent?: boolean;
  empty: string; onViewAll?: () => void; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border border-card-border bg-white shadow-[var(--shadow-card)] overflow-hidden flex flex-col ${urgent ? "border-l-2 border-l-signal-red" : ""}`}>
      <header className="px-5 py-4 border-b border-border flex items-center gap-2.5">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${urgent ? "bg-signal-red/12 text-signal-red" : "bg-platinum-soft text-noir"}`}>
          <Icon size={15} strokeWidth={1.75} />
        </span>
        <span className="eyebrow">{label}</span>
        {count > 0 && (
          <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-platinum-soft text-noir" style={{ fontSize: "0.65rem", fontWeight: 600 }}>
            {count}
          </span>
        )}
      </header>
      <div className="divide-y divide-border/60 flex-1">
        {count === 0 ? (
          <p className="px-5 py-8 text-center text-ink-40" style={{ fontSize: "0.85rem" }}>{empty}</p>
        ) : children}
      </div>
      {onViewAll && count > 0 && (
        <button onClick={onViewAll} className="px-5 py-3 border-t border-border text-left text-ink-60 hover:text-noir transition-colors flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
          View all <ChevronRight size={13} />
        </button>
      )}
    </section>
  );
}

const rowClass = "w-full text-left px-5 py-3.5 hover:bg-platinum-soft/40 transition-colors block";

export function Home({ today, openTickets, newEnquiriesToday, activeEnquiries, botHandledToday, customers, cars, onNavigate, onOpenThread, onOpenCustomer, ticketsUrgent }: Props) {
  const custName = (id: string) => customers.find((c) => c.id === id)?.name ?? "Unknown";
  const carLabel = (id?: string) => {
    const c = id ? cars.find((x) => x.id === id) : undefined;
    return c ? `${c.year} ${c.make} ${c.model}` : undefined;
  };

  const apptsSorted = [...today].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  // Urgent (window closing) tickets first, then oldest; cap the panel to keep it calm.
  const ticketsSorted = [...openTickets].sort((a, b) => {
    const ua = windowClosingSoon(a.windowClosesAt) ? 0 : 1;
    const ub = windowClosingSoon(b.windowClosesAt) ? 0 : 1;
    return ua - ub || +new Date(a.openedAt) - +new Date(b.openedAt);
  });
  const ticketsShown = ticketsSorted.slice(0, 5);

  const totalNeeds = today.length + openTickets.length + newEnquiriesToday;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
      <SectionHeader
        eyebrow={new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting}.`}
        subtitle={totalNeeds === 0 ? "All clear. The bot has the rest." : "Here is what needs you today."}
      />

      {totalNeeds === 0 ? (
        <div className="rounded-lg border border-card-border bg-white shadow-[var(--shadow-card)] p-12 text-center">
          <div className="accent-rule mx-auto mb-4" />
          <h2 className="mb-2">All clear.</h2>
          <p className="text-ink-60" style={{ fontSize: "0.95rem" }}>
            The bot is handling everything quietly. We'll surface anything that needs you.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
          {/* Today's viewings */}
          <Panel label="Today's viewings" Icon={CalendarDays} count={today.length} empty="No viewings scheduled today." onViewAll={() => onNavigate("appointments")}>
            {apptsSorted.map((a) => (
              <button key={a.id} onClick={() => onOpenCustomer(a.customerId)} className={rowClass}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="editorial text-noir" style={{ fontSize: "1rem" }}>{formatTime(a.at)}</span>
                  <span className="font-medium truncate" style={{ fontSize: "0.9rem" }}>{custName(a.customerId)}</span>
                </div>
                {carLabel(a.carId) && (
                  <div className="text-ink-40 truncate mt-0.5" style={{ fontSize: "0.78rem" }}>{carLabel(a.carId)}</div>
                )}
              </button>
            ))}
          </Panel>

          {/* Awaiting a reply */}
          <Panel label="Awaiting a reply" Icon={TicketIcon} count={openTickets.length} urgent={ticketsUrgent} empty="No tickets waiting." onViewAll={() => onNavigate("tickets")}>
            {ticketsShown.map((t) => {
              const closing = windowClosingSoon(t.windowClosesAt);
              return (
                <button key={t.id} onClick={() => onOpenThread(t.conversationId)} className={rowClass}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${closing ? "bg-signal-red" : "bg-signal-calm"}`} />
                    <span className="font-medium truncate" style={{ fontSize: "0.9rem" }}>{custName(t.customerId)}</span>
                    <span className="ml-auto text-ink-40 shrink-0" style={{ fontSize: "0.7rem" }}>{relativeAge(t.openedAt)}</span>
                  </div>
                  <div className="mt-1 text-ink-60 line-clamp-1" style={{ fontSize: "0.82rem" }}>{t.question}</div>
                  {closing && (
                    <span className="mt-1 inline-flex items-center gap-1 text-signal-red" style={{ fontSize: "0.66rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
                      <AlarmClock size={11} /> Window closing
                    </span>
                  )}
                </button>
              );
            })}
          </Panel>

          {/* Inquiries */}
          <section className="rounded-lg border border-card-border bg-white shadow-[var(--shadow-card)] overflow-hidden flex flex-col">
            <header className="px-5 py-4 border-b border-border flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-platinum-soft text-noir">
                <ArrowLeftRight size={15} strokeWidth={1.75} />
              </span>
              <span className="eyebrow">Inquiries</span>
            </header>
            <button onClick={() => onNavigate("matching")} className="flex-1 px-5 py-6 text-left hover:bg-platinum-soft/40 transition-colors">
              <div className="flex items-baseline gap-6">
                <div>
                  <div className="editorial text-noir" style={{ fontSize: "1.9rem", lineHeight: 1 }}>{newEnquiriesToday}</div>
                  <div className="text-ink-60 mt-1" style={{ fontSize: "0.78rem" }}>new today</div>
                </div>
                <div>
                  <div className="editorial text-noir" style={{ fontSize: "1.9rem", lineHeight: 1 }}>{activeEnquiries}</div>
                  <div className="text-ink-60 mt-1" style={{ fontSize: "0.78rem" }}>active</div>
                </div>
              </div>
            </button>
            <button onClick={() => onNavigate("matching")} className="px-5 py-3 border-t border-border text-left text-ink-60 hover:text-noir transition-colors flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
              Open Matching <ChevronRight size={13} />
            </button>
          </section>
        </div>
      )}

      <div className="flex items-center gap-2 mt-8 text-ink-40" style={{ fontSize: "0.78rem" }}>
        <Bot size={13} />
        <span>The bot quietly handled {botHandledToday} conversations today.</span>
      </div>
    </div>
  );
}
