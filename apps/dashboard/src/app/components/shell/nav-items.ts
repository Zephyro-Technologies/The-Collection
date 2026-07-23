import { Home, MessagesSquare, Ticket, CalendarDays, ArrowLeftRight, Car, Store } from "lucide-react";

export type ViewKey = "home" | "conversations" | "tickets" | "appointments" | "matching" | "inventory" | "partners";

// `label` is the full name (sidebar + screen titles); `short` is a concise,
// single-line label for the mobile bottom nav so six tabs fit at phone width.
// `desktopOnly` keeps an item OUT of the bottom nav entirely — the bar is sized
// for six, and Partners is occasional admin setup rather than daily floor work,
// so it lives in the sidebar only instead of squeezing every other tab.
export const navItems: { key: ViewKey; label: string; short?: string; desktopOnly?: boolean; Icon: typeof Home }[] = [
  { key: "home", label: "Today", Icon: Home },
  { key: "conversations", label: "Conversations", short: "Inbox", Icon: MessagesSquare },
  { key: "tickets", label: "Tickets", Icon: Ticket },
  { key: "appointments", label: "Appointments", short: "Appts", Icon: CalendarDays },
  { key: "matching", label: "Matching", Icon: ArrowLeftRight },
  { key: "inventory", label: "Inventory", Icon: Car },
  { key: "partners", label: "Partners", desktopOnly: true, Icon: Store },
];
