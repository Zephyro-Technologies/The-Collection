import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { SectionHeader } from "../common/SectionHeader";
import { ChannelBadge, ChannelDot } from "../common/ChannelBadge";
import { StatusPill } from "../common/StatusPill";
import { AgingDot } from "../common/AgingDot";
import { MessageThread } from "../conversation/MessageThread";
import { Composer } from "../conversation/Composer";
import { Button } from "../ui/button";
import type { Car } from "@collection/shared";
import type { Ticket, Conversation, Customer } from "../../data/mock";
import { relativeAge, windowClosingSoon, ticketAgeBucket } from "../../data/mock";

interface Props {
  tickets: Ticket[];
  conversations: Conversation[];
  customers: Customer[];
  cars: Car[];
  onReply: (conversationId: string, text: string) => void;
  onResolveTicket: (ticketId: string) => void;
  onTakeOver: (conversationId: string) => void;
  onHandBack: (conversationId: string) => void;
  onOpenThread: (conversationId: string) => void;
  onOpenCustomer: (customerId: string) => void;
}

export function Tickets({ tickets, conversations, customers, cars, onReply, onResolveTicket, onTakeOver, onHandBack, onOpenThread, onOpenCustomer }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => +new Date(a.openedAt) - +new Date(b.openedAt)),
    [tickets]
  );

  // Desktop only: land on the most-urgent ticket (window closing first, else oldest)
  // so the action pane isn't empty. Mobile stays list-first.
  useEffect(() => {
    if (openId) return;
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches) return;
    const closing = sorted.filter((t) => windowClosingSoon(t.windowClosesAt));
    const first = closing[0] ?? sorted[0];
    if (first) setOpenId(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = openId ? tickets.find((t) => t.id === openId) : null;
  const openConv = open ? conversations.find((c) => c.id === open.conversationId) : null;
  const openCust = open ? customers.find((c) => c.id === open.customerId) : null;
  const openCar = openConv?.carId ? cars.find((c) => c.id === openConv.carId) : undefined;

  return (
    <div className="h-full flex">
      <div className={`${open ? "hidden md:flex" : "flex"} flex-col w-full md:w-[420px] lg:w-[480px] border-r border-border shrink-0`}>
        <div className="px-4 md:px-6 pt-8 pb-4 border-b border-border">
          <SectionHeader
            eyebrow="Escalations"
            title="Tickets"
            subtitle={`${tickets.length} waiting · oldest first.`}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="p-10 text-center">
              <div className="accent-rule mx-auto mb-3" />
              <p className="text-ink-60">All clear.</p>
            </div>
          ) : (
            sorted.map((t) => {
              const cust = customers.find((c) => c.id === t.customerId);
              const closing = windowClosingSoon(t.windowClosesAt);
              const isOpen = openId === t.id;
              const bucket = ticketAgeBucket(t.openedAt);
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenId(t.id)}
                  className={`w-full text-left px-4 md:px-6 py-4 border-b border-border/60 flex gap-3 hover:bg-platinum-soft/50 transition-colors ${
                    isOpen ? "bg-accent/5" : ""
                  } ${bucket === "red" ? "border-l-2 border-l-signal-red" : ""}`}
                >
                  <div className="pt-1.5"><AgingDot openedAt={t.openedAt} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ChannelDot channel={t.channel} />
                      <span style={{ fontSize: "0.92rem", fontWeight: 500 }}>{cust?.name}</span>
                      <span className="ml-auto text-ink-40" style={{ fontSize: "0.7rem" }}>{relativeAge(t.openedAt)}</span>
                    </div>
                    <div className="mt-1.5 text-noir" style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>
                      "{t.question}"
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill tone="open" />
                      {closing && (
                        <span className="inline-flex items-center gap-1 text-signal-red" style={{ fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          <Clock size={11} /> Window closing
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {open && openConv && openCust ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-start gap-3 px-4 md:px-6 py-4 border-b border-border bg-white">
            <button onClick={() => setOpenId(null)} className="md:hidden p-1 text-ink-60" aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <AgingDot openedAt={open.openedAt} />
                <button
                  onClick={() => onOpenCustomer(openCust.id)}
                  className="hover:text-accent transition-colors"
                  style={{ fontSize: "1rem", fontWeight: 500 }}
                >
                  {openCust.name}
                </button>
                <ChannelBadge channel={open.channel} />
                <span className="text-ink-40" style={{ fontSize: "0.72rem" }}>opened {relativeAge(open.openedAt)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => onOpenThread(openConv.id)}
                >
                  <MessageSquare size={13} className="mr-1.5" />Open in Inbox
                </Button>
              </div>
              <div className="text-noir" style={{ fontSize: "1.05rem", lineHeight: 1.4 }}>
                "{open.question}"
              </div>
              {openCar && (
                <div className="mt-2 text-ink-60" style={{ fontSize: "0.78rem" }}>
                  About: {openCar.year} {openCar.make} {openCar.model} {openCar.variant}
                </div>
              )}
              {windowClosingSoon(open.windowClosesAt) && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-signal-red/10 text-signal-red" style={{ fontSize: "0.78rem" }}>
                  <AlertCircle size={14} /> 24-hour reply window is closing — after this a template may be required.
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 bg-platinum-soft/30">
            <MessageThread messages={openConv.messages} />
          </div>

          <Composer
            handler={openConv.handler}
            onSend={(t) => onReply(openConv.id, t)}
            onTakeOver={() => onTakeOver(openConv.id)}
            onHandBack={() => onHandBack(openConv.id)}
            onResolve={() => { onResolveTicket(open.id); setOpenId(null); }}
            windowClosingSoon={windowClosingSoon(open.windowClosesAt)}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-ink-40">
          Select a ticket to act on it.
        </div>
      )}
    </div>
  );
}
