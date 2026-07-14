import { useMemo, useState } from "react";
import { Clock, CheckCircle2, XCircle, RefreshCw, MessageSquare, Bell, BellOff, LayoutList, CalendarDays, MoreHorizontal } from "lucide-react";
import { SectionHeader } from "../common/SectionHeader";
import { ChannelBadge } from "../common/ChannelBadge";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Calendar } from "../ui/calendar";
import { RescheduleDialog } from "../appointments/RescheduleDialog";
import type { Car } from "@collection/shared";
import type { Appointment, Customer, Conversation } from "../../data/mock";
import { formatDate, formatTime } from "../../data/mock";

interface Props {
  appointments: Appointment[];
  customers: Customer[];
  cars: Car[];
  conversations: Conversation[];
  onComplete: (id: string) => void;
  onNoShow: (id: string) => void;
  onReschedule: (id: string, newIso: string) => void;
  onOpenThread: (customerId: string) => void;
  onOpenCustomer: (customerId: string) => void;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isToday = (iso: string) => isSameDay(new Date(iso), new Date());

export function Appointments({ appointments, customers, cars, conversations, onComplete, onNoShow, onReschedule, onOpenThread, onOpenCustomer }: Props) {
  const [mode, setMode] = useState<"list" | "month">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const sorted = useMemo(() => [...appointments].sort((a, b) => +new Date(a.at) - +new Date(b.at)), [appointments]);
  const today = useMemo(() => sorted.filter((a) => isToday(a.at) && a.status === "scheduled"), [sorted]);
  const upcoming = useMemo(() => sorted.filter((a) => !isToday(a.at) && new Date(a.at) > new Date()), [sorted]);

  const dayList = useMemo(() => {
    if (!selectedDate) return [];
    return sorted.filter((a) => isSameDay(new Date(a.at), selectedDate));
  }, [sorted, selectedDate]);

  const bookedDays = useMemo(
    () => appointments
      .filter((a) => a.status === "scheduled")
      .map((a) => new Date(new Date(a.at).toDateString())),
    [appointments]
  );

  const rescheduling = rescheduleId ? appointments.find((a) => a.id === rescheduleId) : null;

  const Card = ({ a, highlighted }: { a: Appointment; highlighted?: boolean }) => {
    const cust = customers.find((c) => c.id === a.customerId);
    const car = cars.find((c) => c.id === a.carId);
    const thread = conversations.find((c) => c.customerId === a.customerId);
    return (
      <div className={`rounded-lg border bg-white overflow-hidden shadow-[var(--shadow-card)] ${highlighted ? "border-accent/40" : "border-card-border"}`}>
        <div className="flex flex-col sm:flex-row">
          {car && (
            <div className="sm:w-48 shrink-0 aspect-[16/10] sm:aspect-auto bg-platinum-soft">
              <ImageWithFallback src={car.image} alt={`${car.make} ${car.model}`} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="eyebrow mb-1">{isToday(a.at) ? "Today" : formatDate(a.at)}</div>
                <div className="editorial text-noir" style={{ fontSize: "1.5rem", lineHeight: 1.1 }}>
                  {formatTime(a.at)}
                </div>
              </div>
            </div>
            <button
              onClick={() => cust && onOpenCustomer(cust.id)}
              className="mt-3 text-left hover:text-accent transition-colors block"
              style={{ fontSize: "1rem", fontWeight: 500 }}
            >
              {cust?.name}
            </button>
            {car && (
              <div className="text-ink-60" style={{ fontSize: "0.85rem" }}>
                {car.year} {car.make} {car.model} {car.variant}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <ChannelBadge channel={a.channel} showLabel />
              {cust?.phone && (
                <span className="text-ink-60" style={{ fontSize: "0.78rem" }}>{cust.phone}</span>
              )}
              <span className={`inline-flex items-center gap-1 ${a.reminderSent ? "text-signal-good" : "text-ink-40"}`} style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {a.reminderSent ? <Bell size={11} /> : <BellOff size={11} />}
                {a.reminderSent ? "Reminder sent" : "Reminder pending"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setRescheduleId(a.id)}>
                <RefreshCw size={13} className="mr-1.5" />Reschedule
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="More actions">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={!thread} onClick={() => thread && onOpenThread(thread.id)}>
                      <MessageSquare size={14} className="mr-2" />Open thread
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onNoShow(a.id)}>
                      <XCircle size={14} className="mr-2" />Mark no-show
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" className="bg-noir text-white hover:bg-noir-700" onClick={() => onComplete(a.id)}>
                  <CheckCircle2 size={13} className="mr-1.5" />Complete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
      <SectionHeader
        eyebrow="Calendar"
        title="Appointments"
        subtitle="Upcoming private viewings."
        action={
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setMode("list")}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${mode === "list" ? "bg-noir text-white" : "text-ink-60 hover:bg-platinum-soft"}`}
              style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              <LayoutList size={13} />List
            </button>
            <button
              onClick={() => setMode("month")}
              className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${mode === "month" ? "bg-noir text-white" : "text-ink-60 hover:bg-platinum-soft"}`}
              style={{ fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              <CalendarDays size={13} />Month
            </button>
          </div>
        }
      />

      {mode === "list" ? (
        <>
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4 text-ink-60">
              <Clock size={14} />
              <span className="eyebrow" style={{ color: "var(--ink-60)" }}>Today</span>
            </div>
            {today.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-ink-40">
                No viewings today.
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {today.map((a) => <Card key={a.id} a={a} highlighted />)}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4 text-ink-60">
              <span className="eyebrow" style={{ color: "var(--ink-60)" }}>Upcoming</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-ink-40">
                No upcoming viewings.
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {upcoming.map((a) => <Card key={a.id} a={a} />)}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="rounded-lg border border-card-border bg-white p-3 shadow-[var(--shadow-card)]">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ booked: bookedDays }}
              modifiersClassNames={{ booked: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-accent" }}
            />
          </div>
          <div>
            <div className="eyebrow mb-3">
              {selectedDate ? formatDate(selectedDate.toISOString()) : "Select a date"}
            </div>
            {selectedDate && dayList.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-ink-40">
                No viewings on this day.
              </div>
            )}
            <div className="grid gap-4">
              {dayList.map((a) => <Card key={a.id} a={a} highlighted={isToday(a.at)} />)}
            </div>
          </div>
        </div>
      )}

      <RescheduleDialog
        open={!!rescheduling}
        currentAt={rescheduling?.at}
        onCancel={() => setRescheduleId(null)}
        onConfirm={(iso) => {
          if (rescheduleId) onReschedule(rescheduleId, iso);
          setRescheduleId(null);
        }}
      />
    </div>
  );
}
