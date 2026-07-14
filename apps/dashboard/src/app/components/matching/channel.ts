// The one place an EnquiryChannel becomes display text.
//
// The column stores snake_case ("walk_in"), which must never reach the screen.
// Everything that renders or offers a channel imports from here, so the label
// can't drift between the deal row, the detail sheet and the form.

import type { EnquiryChannel } from "@collection/shared";

const LABELS: Record<EnquiryChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  messenger: "Messenger",
  phone: "Phone",
  walk_in: "Walk-In",
  other: "Other",
};

/** Display label for a channel. Blank when absent; unknown values pass through. */
export function channelLabel(c: EnquiryChannel | string | null | undefined): string {
  if (!c) return "";
  return LABELS[c as EnquiryChannel] ?? c;
}

/** Every channel, in the order the form offers them. */
export const ENQUIRY_CHANNELS: EnquiryChannel[] = [
  "phone", "whatsapp", "instagram", "messenger", "walk_in", "other",
];
