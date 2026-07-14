import { ticketAgeBucket } from "../../data/mock";

const map = {
  fresh: { cls: "bg-signal-calm", ring: "ring-signal-calm/30" },
  amber: { cls: "bg-signal-amber", ring: "ring-signal-amber/30" },
  red: { cls: "bg-signal-red", ring: "ring-signal-red/30" },
};

export function AgingDot({ openedAt }: { openedAt: string }) {
  const bucket = ticketAgeBucket(openedAt);
  const m = map[bucket];
  return <span className={`inline-block w-2 h-2 rounded-full ${m.cls} ring-4 ${m.ring}`} aria-label={`${bucket} ticket`} />;
}
