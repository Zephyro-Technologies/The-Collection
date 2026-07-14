import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { SectionHeader } from "../common/SectionHeader";
import { ChannelBadge, ChannelDot } from "../common/ChannelBadge";
import { StatusPill } from "../common/StatusPill";
import { MessageThread } from "../conversation/MessageThread";
import { Composer } from "../conversation/Composer";
import { CustomerContextPanel } from "../conversation/CustomerContextPanel";
import { Sheet, SheetContent } from "../ui/sheet";
import type { Car } from "@collection/shared";
import type { Channel, Conversation, ConversationStatus, Customer, Appointment } from "../../data/mock";
import { relativeAge } from "../../data/mock";

interface Props {
  conversations: Conversation[];
  customers: Customer[];
  cars: Car[];
  appointments: Appointment[];
  search: string;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  onReply: (conversationId: string, text: string) => void;
  onTakeOver: (conversationId: string) => void;
  onHandBack: (conversationId: string) => void;
  onResolve: (conversationId: string) => void;
  onOpenCustomer: (customerId: string) => void;
}

const channels: (Channel | "all")[] = ["all", "instagram", "whatsapp", "messenger"];
const statuses: (ConversationStatus | "all")[] = ["all", "needs_human", "bot", "resolved"];
const statusLabel: Record<string, string> = { all: "All", needs_human: "Needs human", bot: "Bot handling", resolved: "Resolved" };

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-10 text-center">
      <div className="accent-rule mx-auto mb-4" />
      <p className="text-ink-60">{children}</p>
    </div>
  );
}

export function Conversations({
  conversations, customers, cars, appointments, search,
  openId, onOpenChange, onReply, onTakeOver, onHandBack, onResolve, onOpenCustomer,
}: Props) {
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [status, setStatus] = useState<ConversationStatus | "all">("all");
  const [contextOpen, setContextOpen] = useState(false);

  // If a controlled openId arrives that doesn't pass current filters, relax them so it shows
  useEffect(() => {
    if (!openId) return;
    const c = conversations.find((x) => x.id === openId);
    if (!c) return;
    if (channel !== "all" && c.channel !== channel) setChannel("all");
    if (status !== "all" && c.status !== status) setStatus("all");
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter((c) => (channel === "all" ? true : c.channel === channel))
      .filter((c) => {
        if (status !== "all") return c.status === status;
        return c.status !== "resolved";
      })
      .filter((c) => {
        if (!q) return true;
        const cust = customers.find((x) => x.id === c.customerId);
        return (
          cust?.name.toLowerCase().includes(q) ||
          cust?.handle.toLowerCase().includes(q) ||
          c.messages.some((m) => m.text.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aPri = a.status === "needs_human" ? 0 : 1;
        const bPri = b.status === "needs_human" ? 0 : 1;
        if (aPri !== bPri) return aPri - bPri;
        return +new Date(b.lastAt) - +new Date(a.lastAt);
      });
  }, [conversations, channel, status, search, customers]);

  // Desktop only: on entering the screen with nothing selected, open the most-urgent
  // conversation (filtered is sorted needs-human first) so the reading pane isn't
  // empty. Mobile stays list-first — the list is full-width until you tap a row.
  useEffect(() => {
    if (openId) return;
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches) return;
    if (filtered.length > 0) onOpenChange(filtered[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = openId ? conversations.find((c) => c.id === openId) : null;
  const openCust = open ? customers.find((c) => c.id === open.customerId) : null;
  const openCar = open?.carId ? cars.find((c) => c.id === open.carId) : undefined;
  const openAppt = open ? appointments.find((a) => a.customerId === open.customerId) : undefined;

  return (
    <div className="h-full flex">
      {/* List */}
      <div className={`${open ? "hidden md:flex" : "flex"} flex-col w-full md:w-[380px] lg:w-[420px] border-r border-border shrink-0`}>
        <div className="px-4 md:px-6 pt-8 pb-4 border-b border-border">
          <SectionHeader eyebrow="Inbox" title="Conversations" />
          <div className="flex flex-wrap gap-1.5 -mt-3">
            {channels.map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`px-2.5 py-1 rounded-full border ${channel === c ? "bg-noir text-white border-noir" : "border-border text-ink-60 hover:border-accent/40"}`}
                style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                {c === "all" ? "All channels" : c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-2.5 py-1 rounded-full border ${status === s ? "bg-noir text-white border-noir" : "border-border text-ink-60 hover:border-accent/40"}`}
                style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <Empty>Nothing in this view.</Empty>
          ) : (
            filtered.map((c) => {
              const cust = customers.find((x) => x.id === c.customerId);
              const last = c.messages[c.messages.length - 1];
              const isOpen = openId === c.id;
              return (
                <div
                  key={c.id}
                  className={`flex gap-3 px-4 md:px-6 py-4 border-b border-border/60 hover:bg-platinum-soft/50 transition-colors ${isOpen ? "bg-accent/5" : ""}`}
                >
                  <ChannelDot channel={c.channel} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => cust && onOpenCustomer(cust.id)}
                        className="truncate text-left hover:text-accent transition-colors"
                        style={{ fontSize: "0.95rem", fontWeight: 500 }}
                      >
                        {cust?.name}
                      </button>
                      <div className="text-ink-40 shrink-0" style={{ fontSize: "0.7rem" }}>{relativeAge(c.lastAt)}</div>
                    </div>
                    <button onClick={() => onOpenChange(c.id)} className="block w-full text-left">
                      <div className="truncate text-ink-60 mt-0.5" style={{ fontSize: "0.82rem" }}>{last?.text}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusPill tone={c.status === "needs_human" ? "human" : c.status === "bot" ? "bot" : "resolved"} />
                      </div>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail */}
      {open && openCust ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border bg-white">
            <button onClick={() => onOpenChange(null)} className="md:hidden p-1 -ml-1 text-ink-60" aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onOpenCustomer(openCust.id)}
                className="truncate text-left hover:text-accent transition-colors"
                style={{ fontSize: "1rem", fontWeight: 500 }}
              >
                {openCust.name}
              </button>
              <div className="text-ink-40 truncate" style={{ fontSize: "0.72rem" }}>{openCust.handle}</div>
            </div>
            <ChannelBadge channel={open.channel} showLabel />
            <button
              onClick={() => setContextOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-platinum-soft text-ink-60"
              aria-label="Show context"
            >
              <Info size={16} />
            </button>
          </div>
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto px-4 md:px-6">
                <MessageThread messages={open.messages} />
              </div>
              <Composer
                handler={open.handler}
                onSend={(t) => onReply(open.id, t)}
                onTakeOver={() => onTakeOver(open.id)}
                onHandBack={() => onHandBack(open.id)}
                onResolve={() => { onResolve(open.id); onOpenChange(null); }}
              />
            </div>
            <div className="hidden lg:block w-[320px] shrink-0">
              <CustomerContextPanel
                conversation={open}
                customer={openCust}
                car={openCar}
                appointment={openAppt}
              />
            </div>
          </div>

          {/* Mobile / tablet context sheet */}
          <Sheet open={contextOpen} onOpenChange={setContextOpen}>
            <SheetContent side="right" className="w-full sm:max-w-sm p-0 overflow-y-auto">
              <CustomerContextPanel
                conversation={open}
                customer={openCust}
                car={openCar}
                appointment={openAppt}
              />
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-ink-40">
          Select a conversation to read it.
        </div>
      )}
    </div>
  );
}
