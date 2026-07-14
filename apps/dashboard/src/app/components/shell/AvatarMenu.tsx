import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

interface Props {
  showroomName?: string;
  role?: "admin" | "partner";
  userEmail?: string;
  onSignOut?: () => void;
}

/** Two-letter monogram from a showroom name: first letters of the first two words
 *  ("The Collection" → "TC"), or the first two letters of a single word. */
function monogram(name?: string): string {
  if (!name) return "·";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

/**
 * The single identity + session control: a monogram avatar that opens a popover
 * with the showroom name, role, email and sign-out. Radix DropdownMenu handles
 * click-open, outside-click / Esc close, focus return, keyboard navigation, and
 * viewport-edge collision (so it never overflows on a narrow screen).
 */
export function AvatarMenu({ showroomName, role, userEmail, onSignOut }: Props) {
  const roleLabel = role === "admin" ? "Admin" : role === "partner" ? "Partner" : "";
  const identity = [showroomName, roleLabel].filter(Boolean).join(" · ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label={identity ? `Account — ${identity}` : "Account menu"}
        >
          <span
            className="flex size-8 items-center justify-center rounded-full bg-noir text-accent-on-dark transition-colors group-hover:bg-noir-elevated"
            style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.03em" }}
          >
            {monogram(showroomName)}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        collisionPadding={12}
        className="w-64 rounded-xl border-white/10 bg-noir p-1.5 text-cream shadow-xl shadow-black/40"
      >
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-noir-elevated text-accent-on-dark"
            style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.03em" }}
            aria-hidden
          >
            {monogram(showroomName)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-cream" style={{ fontSize: "0.86rem", fontWeight: 500 }}>
              {showroomName ?? "Account"}
            </div>
            {roleLabel && (
              <div className="text-accent-on-dark" style={{ fontSize: "0.72rem", letterSpacing: "0.01em" }}>{roleLabel}</div>
            )}
            {userEmail && (
              <div className="truncate text-cream/50" style={{ fontSize: "0.72rem" }} title={userEmail}>{userEmail}</div>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          onSelect={() => onSignOut?.()}
          className="gap-2.5 rounded-lg px-2.5 py-2 text-cream/85 focus:bg-white/10 focus:text-cream [&_svg]:!text-cream/70"
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span style={{ fontSize: "0.85rem" }}>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
