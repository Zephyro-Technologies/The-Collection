type Tone = "bot" | "human" | "resolved" | "available" | "reserved" | "sold" | "open" | "answered" | "today";

// Label text is always near-black for contrast; the tone colour reads from a
// leading dot + a faint tinted background (keeps amber/green semantic without
// low-contrast coloured text on a tint).
const tones: Record<Tone, { label: string; bg: string; dot: string }> = {
  bot: { label: "Bot handling", bg: "bg-platinum-soft", dot: "bg-ink-40" },
  human: { label: "Needs human", bg: "bg-signal-amber/15", dot: "bg-signal-amber" },
  resolved: { label: "Resolved", bg: "bg-signal-good/12", dot: "bg-signal-good" },
  available: { label: "Available", bg: "bg-signal-good/12", dot: "bg-signal-good" },
  reserved: { label: "Reserved", bg: "bg-signal-amber/15", dot: "bg-signal-amber" },
  sold: { label: "Sold", bg: "bg-platinum-soft", dot: "bg-ink-40" },
  open: { label: "Open", bg: "bg-signal-amber/15", dot: "bg-signal-amber" },
  answered: { label: "Answered", bg: "bg-signal-good/12", dot: "bg-signal-good" },
  today: { label: "Today", bg: "bg-accent/20", dot: "bg-accent" },
};

export function StatusPill({ tone, label }: { tone: Tone; label?: string }) {
  const t = tones[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-noir ${t.bg}`}
      style={{ fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {label ?? t.label}
    </span>
  );
}
