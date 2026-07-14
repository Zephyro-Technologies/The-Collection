import { Instagram, MessageCircle, Send } from "lucide-react";
import type { Channel } from "../../data/mock";

const meta: Record<Channel, { label: string; color: string; bg: string; Icon: typeof Instagram }> = {
  instagram: { label: "Instagram", color: "text-ch-instagram", bg: "bg-ch-instagram/10", Icon: Instagram },
  whatsapp: { label: "WhatsApp", color: "text-ch-whatsapp", bg: "bg-ch-whatsapp/10", Icon: MessageCircle },
  messenger: { label: "Messenger", color: "text-ch-messenger", bg: "bg-ch-messenger/10", Icon: Send },
};

interface Props {
  channel: Channel;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function ChannelBadge({ channel, showLabel = false, size = "sm" }: Props) {
  const m = meta[channel];
  const iconSize = size === "sm" ? 12 : 14;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full text-noir ${m.bg} ${
        size === "sm" ? "px-2.5 py-0.5" : "px-3 py-1"
      }`}
      style={{ fontSize: size === "sm" ? "0.68rem" : "0.72rem", letterSpacing: "0.06em", fontWeight: 500 }}
    >
      <m.Icon size={iconSize} strokeWidth={2} className={m.color} />
      {showLabel && <span>{m.label}</span>}
    </span>
  );
}

export function ChannelDot({ channel }: { channel: Channel }) {
  const m = meta[channel];
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${m.bg} ${m.color}`}>
      <Icon size={12} strokeWidth={2} />
    </span>
  );
}
