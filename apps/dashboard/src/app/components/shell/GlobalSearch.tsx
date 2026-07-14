import { useMemo, useState } from "react";
import { Search, User, Car as CarIcon, MessageSquare } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { ChannelBadge } from "../common/ChannelBadge";
import type { Car } from "@collection/shared";
import type { Customer, Conversation } from "../../data/mock";

export type GlobalSearchHit =
  | { kind: "customer"; id: string }
  | { kind: "car"; id: string }
  | { kind: "conversation"; id: string };

interface Props {
  customers: Customer[];
  cars: Car[];
  conversations: Conversation[];
  onSelect: (hit: GlobalSearchHit) => void;
}

export function GlobalSearch({ customers, cars, conversations, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return { customers: [], cars: [], conversations: [] };
    return {
      customers: customers.filter((c) =>
        c.name.toLowerCase().includes(s) || c.handle.toLowerCase().includes(s)
      ).slice(0, 5),
      cars: cars.filter((c) =>
        `${c.make} ${c.model} ${c.variant} ${c.colour}`.toLowerCase().includes(s)
      ).slice(0, 5),
      conversations: conversations.filter((c) => {
        const cust = customers.find((x) => x.id === c.customerId);
        return cust?.name.toLowerCase().includes(s) ||
          c.messages.some((m) => m.text.toLowerCase().includes(s));
      }).slice(0, 5),
    };
  }, [q, customers, cars, conversations]);

  const totalHits = results.customers.length + results.cars.length + results.conversations.length;

  const pick = (hit: GlobalSearchHit) => {
    onSelect(hit);
    setOpen(false);
    setQ("");
  };

  return (
    <Popover open={open && q.trim().length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-40 pointer-events-none" size={16} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search customers, cars, conversations…"
            className="w-full bg-input-background border border-transparent focus:border-accent/40 focus:bg-white rounded-md pl-9 pr-4 py-2 outline-none transition-colors"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-2rem))] p-0 max-h-[70vh] overflow-y-auto">
        {totalHits === 0 ? (
          <div className="p-6 text-center text-ink-40" style={{ fontSize: "0.88rem" }}>
            Nothing matches "{q}".
          </div>
        ) : (
          <>
            {results.customers.length > 0 && (
              <Group title="Clients" Icon={User}>
                {results.customers.map((c) => (
                  <Row key={c.id} onClick={() => pick({ kind: "customer", id: c.id })}>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: "0.88rem", fontWeight: 500 }}>{c.name}</div>
                      <div className="text-ink-40 truncate" style={{ fontSize: "0.72rem" }}>{c.handle}</div>
                    </div>
                    <ChannelBadge channel={c.channel} />
                  </Row>
                ))}
              </Group>
            )}
            {results.cars.length > 0 && (
              <Group title="Cars" Icon={CarIcon}>
                {results.cars.map((c) => (
                  <Row key={c.id} onClick={() => pick({ kind: "car", id: c.id })}>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{c.year} {c.make} {c.model}</div>
                      <div className="text-ink-40 truncate" style={{ fontSize: "0.72rem" }}>{c.variant} · {c.colour}</div>
                    </div>
                    <span className="eyebrow" style={{ fontSize: "0.65rem" }}>{c.status}</span>
                  </Row>
                ))}
              </Group>
            )}
            {results.conversations.length > 0 && (
              <Group title="Conversations" Icon={MessageSquare}>
                {results.conversations.map((c) => {
                  const cust = customers.find((x) => x.id === c.customerId);
                  const last = c.messages[c.messages.length - 1];
                  return (
                    <Row key={c.id} onClick={() => pick({ kind: "conversation", id: c.id })}>
                      <div className="flex-1 min-w-0">
                        <div className="truncate" style={{ fontSize: "0.88rem", fontWeight: 500 }}>{cust?.name}</div>
                        <div className="text-ink-60 truncate" style={{ fontSize: "0.78rem" }}>{last?.text}</div>
                      </div>
                      <ChannelBadge channel={c.channel} />
                    </Row>
                  );
                })}
              </Group>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Group({ title, Icon, children }: { title: string; Icon: typeof Search; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="px-3 pt-3 pb-1.5 eyebrow flex items-center gap-1.5"><Icon size={11} /> {title}</div>
      <div>{children}</div>
    </div>
  );
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-platinum-soft/60 transition-colors"
    >
      {children}
    </button>
  );
}
