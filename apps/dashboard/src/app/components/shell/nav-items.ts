import { Home, MessagesSquare, Ticket, CalendarDays, ArrowLeftRight, Car } from "lucide-react";

export type ViewKey = "home" | "conversations" | "tickets" | "appointments" | "matching" | "inventory";

// `label` is the full name (sidebar + screen titles); `short` is a concise,
// single-line label for the mobile bottom nav so six tabs fit at phone width.
export const navItems: { key: ViewKey; label: string; short?: string; Icon: typeof Home }[] = [
  { key: "home", label: "Today", Icon: Home },
  { key: "conversations", label: "Conversations", short: "Inbox", Icon: MessagesSquare },
  { key: "tickets", label: "Tickets", Icon: Ticket },
  { key: "appointments", label: "Appointments", short: "Appts", Icon: CalendarDays },
  { key: "matching", label: "Matching", Icon: ArrowLeftRight },
  { key: "inventory", label: "Inventory", Icon: Car },
];
