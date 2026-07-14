import type { Car } from "@collection/shared";

export type Channel = "instagram" | "whatsapp" | "messenger";
export type Handler = "bot" | "human";
export type ConversationStatus = "bot" | "needs_human" | "resolved";
export type TicketStatus = "open" | "answered" | "closed";
export type AppointmentStatus = "scheduled" | "completed" | "no_show" | "cancelled";

export interface Customer {
  id: string;
  name: string;
  handle: string;
  channel: Channel;
  phone?: string;
}

export interface Message {
  id: string;
  from: "customer" | "bot" | "human";
  text: string;
  at: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  channel: Channel;
  status: ConversationStatus;
  handler: Handler;
  lastAt: string;
  carId?: string;
  messages: Message[];
}

export interface Ticket {
  id: string;
  conversationId: string;
  customerId: string;
  channel: Channel;
  question: string;
  openedAt: string;
  status: TicketStatus;
  windowClosesAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  carId: string;
  channel: Channel;
  at: string;
  status: AppointmentStatus;
  reminderSent: boolean;
}

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();
const todayAt = (h: number, m = 0) => {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const inDays = (d: number, h = 11) => {
  const t = new Date(now);
  t.setDate(t.getDate() + d);
  t.setHours(h, 0, 0, 0);
  return t.toISOString();
};

export const customers: Customer[] = [
  { id: "c1", name: "Hassan Raza", handle: "@hraza", channel: "instagram", phone: "+92 300 1234567" },
  { id: "c2", name: "Ayesha Khan", handle: "ayesha.k", channel: "whatsapp", phone: "+92 321 7654321" },
  { id: "c3", name: "Bilal Ahmed", handle: "bilal_a", channel: "messenger" },
  { id: "c4", name: "Faisal Mahmood", handle: "@fmahmood", channel: "instagram" },
  { id: "c5", name: "Sana Tariq", handle: "sana.t", channel: "whatsapp", phone: "+92 333 9988776" },
  { id: "c6", name: "Omar Sheikh", handle: "@osheikh", channel: "instagram" },
  { id: "c7", name: "Zara Iqbal", handle: "zara_iqbal", channel: "messenger" },
  { id: "c8", name: "Imran Yousuf", handle: "imran.y", channel: "whatsapp", phone: "+92 345 2233445" },
  { id: "c9", name: "Daniyal Khan", handle: "@dkhan", channel: "instagram" },
];

// NOTE: live inventory now comes from Supabase (@collection/shared); this array is
// kept only as a type/shape reference and fallback example. `price` is in the
// row's `currency` (PKR here), not a fixed currency.
export const cars: Car[] = [
  {
    id: "car1",
    make: "Porsche",
    model: "911",
    variant: "GT3 Touring",
    year: 2023,
    mileageKm: 8400,
    colour: "GT Silver",
    price: 165000000,
    currency: "PKR",
    status: "available",
    image: "https://images.unsplash.com/photo-1611821064430-0d40291922d2?auto=format&fit=crop&w=1600&q=80",
    description: "Naturally aspirated 4.0L flat-six, Touring package, full Porsche service history.",
    addedAt: ago(60 * 24 * 5),
  },
  {
    id: "car2",
    make: "Mercedes-Benz",
    model: "G-Class",
    variant: "G63 AMG",
    year: 2024,
    mileageKm: 3200,
    colour: "Obsidian Black",
    price: 145000000,
    currency: "PKR",
    status: "available",
    image: "https://images.unsplash.com/photo-1669215511800-c5c6c4f6c554?auto=format&fit=crop&w=1600&q=80",
    addedAt: ago(60 * 24 * 12),
  },
  {
    id: "car3",
    make: "Range Rover",
    model: "Autobiography",
    variant: "LWB",
    year: 2023,
    mileageKm: 14500,
    colour: "Santorini Black",
    price: 115000000,
    currency: "PKR",
    status: "reserved",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=80",
    addedAt: ago(60 * 24 * 21),
  },
  {
    id: "car4",
    make: "Bentley",
    model: "Continental GT",
    variant: "Speed",
    year: 2022,
    mileageKm: 11200,
    colour: "Glacier White",
    price: 135000000,
    currency: "PKR",
    status: "available",
    image: "https://images.unsplash.com/photo-1622022003290-c5b5e5e5b80b?auto=format&fit=crop&w=1600&q=80",
    addedAt: ago(60 * 24 * 30),
  },
  {
    id: "car5",
    make: "Ferrari",
    model: "Roma",
    variant: "Coupé",
    year: 2023,
    mileageKm: 4900,
    colour: "Rosso Corsa",
    price: 175000000,
    currency: "PKR",
    status: "available",
    image: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=1600&q=80",
    description: "Front-engined 3.9L V8 grand tourer, low mileage, immaculate throughout.",
    addedAt: ago(60 * 24 * 2),
  },
  {
    id: "car6",
    make: "Lamborghini",
    model: "Urus",
    variant: "Performante",
    year: 2024,
    mileageKm: 2100,
    colour: "Giallo Auge",
    price: 210000000,
    currency: "PKR",
    status: "sold",
    image: "https://images.unsplash.com/photo-1633509817627-ed3535e88a2f?auto=format&fit=crop&w=1600&q=80",
    addedAt: ago(60 * 24 * 45),
  },
];

export const conversations: Conversation[] = [
  {
    id: "cv1", customerId: "c1", channel: "instagram", status: "needs_human", handler: "bot",
    lastAt: ago(22), carId: "car1",
    messages: [
      { id: "m1", from: "customer", text: "Salaam, is the GT3 Touring still available?", at: ago(180) },
      { id: "m2", from: "bot", text: "Walaikum salaam — yes, the 2023 GT3 Touring in GT Silver is available. Would you like to arrange a private viewing?", at: ago(179) },
      { id: "m3", from: "customer", text: "Yes. Also can you confirm if it's the manual gearbox version and PCCB brakes?", at: ago(24) },
      { id: "m4", from: "customer", text: "And full service history with Porsche?", at: ago(22) },
    ],
  },
  {
    id: "cv2", customerId: "c2", channel: "whatsapp", status: "needs_human", handler: "bot",
    lastAt: ago(95), carId: "car3",
    messages: [
      { id: "m1", from: "customer", text: "Hi, interested in the Range Rover Autobiography. Is it negotiable?", at: ago(120) },
      { id: "m2", from: "bot", text: "Thank you for your interest. Pricing on this example is firm — I can arrange for the owner to discuss directly.", at: ago(119) },
      { id: "m3", from: "customer", text: "Please. Also need export documentation for Dubai.", at: ago(95) },
    ],
  },
  {
    id: "cv3", customerId: "c3", channel: "messenger", status: "bot", handler: "bot",
    lastAt: ago(45),
    messages: [
      { id: "m1", from: "customer", text: "Do you have any AMG GT in stock?", at: ago(50) },
      { id: "m2", from: "bot", text: "Not at this moment. May I take your details and notify you when one matching your criteria arrives?", at: ago(49) },
      { id: "m3", from: "customer", text: "Sure — 2021 or newer, black or grey, under 20,000 km.", at: ago(45) },
    ],
  },
  {
    id: "cv4", customerId: "c4", channel: "instagram", status: "resolved", handler: "human",
    lastAt: ago(60 * 6), carId: "car2",
    messages: [
      { id: "m1", from: "customer", text: "G63 — viewing this Friday at 3?", at: ago(60 * 7) },
      { id: "m2", from: "human", text: "Confirmed for Friday 3pm. Address sent. Looking forward.", at: ago(60 * 6) },
    ],
  },
  {
    id: "cv5", customerId: "c5", channel: "whatsapp", status: "bot", handler: "bot",
    lastAt: ago(60 * 2), carId: "car4",
    messages: [
      { id: "m1", from: "customer", text: "Bentley GT Speed — service records?", at: ago(60 * 2 + 5) },
      { id: "m2", from: "bot", text: "Full Bentley main-dealer history, last service April 2026, all documents available on viewing.", at: ago(60 * 2) },
    ],
  },
  {
    id: "cv6", customerId: "c7", channel: "messenger", status: "needs_human", handler: "bot",
    lastAt: ago(15),
    messages: [
      { id: "m1", from: "customer", text: "Looking for a classic Mercedes 280SL Pagoda. Any leads even outside your inventory?", at: ago(20) },
      { id: "m2", from: "bot", text: "Outside our current inventory I'm unable to confirm — let me pass this to the owner.", at: ago(15) },
    ],
  },
];

export const tickets: Ticket[] = [
  {
    id: "t1", conversationId: "cv1", customerId: "c1", channel: "instagram",
    question: "Confirm GT3 Touring is manual gearbox + PCCB + full Porsche service history",
    openedAt: ago(22), status: "open", windowClosesAt: ago(22 - 60 * 24),
  },
  {
    id: "t2", conversationId: "cv2", customerId: "c2", channel: "whatsapp",
    question: "Pricing negotiation + Dubai export documentation for Range Rover",
    openedAt: ago(95), status: "open", windowClosesAt: ago(95 - 60 * 24),
  },
  {
    id: "t3", conversationId: "cv6", customerId: "c7", channel: "messenger",
    question: "Sourcing a classic Mercedes 280SL Pagoda outside current inventory",
    openedAt: ago(15), status: "open", windowClosesAt: ago(15 - 60 * 24),
  },
  {
    id: "t4", conversationId: "cv1", customerId: "c8", channel: "whatsapp",
    question: "Trade-in valuation for a 2019 Audi RS6 Avant against the Bentley",
    openedAt: ago(60 * 18), status: "open", windowClosesAt: ago(60 * 18 - 60 * 24),
  },
  {
    id: "t5", conversationId: "cv3", customerId: "c9", channel: "instagram",
    question: "Can the Ferrari Roma be financed via local leasing partners?",
    openedAt: ago(60 * 26), status: "open", windowClosesAt: ago(60 * 26 - 60 * 24),
  },
];

export const appointments: Appointment[] = [
  { id: "a1", customerId: "c4", carId: "car2", channel: "instagram", at: todayAt(11, 0), status: "scheduled", reminderSent: true },
  { id: "a2", customerId: "c5", carId: "car4", channel: "whatsapp", at: todayAt(15, 30), status: "scheduled", reminderSent: true },
  { id: "a3", customerId: "c6", carId: "car1", channel: "instagram", at: todayAt(17, 0), status: "scheduled", reminderSent: false },
  { id: "a4", customerId: "c2", carId: "car3", channel: "whatsapp", at: inDays(2, 14), status: "scheduled", reminderSent: false },
  { id: "a5", customerId: "c8", carId: "car5", channel: "whatsapp", at: inDays(4, 16), status: "scheduled", reminderSent: false },
];

// Prices are stored per-car with a `currency` code (defaults to PKR — see the
// inventory table). `narrowSymbol` keeps PKR as "Rs" and USD as "$", and we
// drop decimals so large rupee figures read cleanly (e.g. "Rs 165,000,000").
export const formatCurrency = (n: number, currency = "PKR") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(n);

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

export const relativeAge = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

export const ticketAgeBucket = (iso: string): "fresh" | "amber" | "red" => {
  const hrs = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (hrs < 4) return "fresh";
  if (hrs < 18) return "amber";
  return "red";
};

export const windowClosingSoon = (iso: string) => {
  const hrs = (new Date(iso).getTime() - Date.now()) / 3600_000;
  return hrs < 4 && hrs > -48;
};
