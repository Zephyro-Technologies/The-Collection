import { Bell } from "lucide-react";
import { Wordmark } from "../brand/Wordmark";
import { GlobalSearch, type GlobalSearchHit } from "./GlobalSearch";
import { AvatarMenu } from "./AvatarMenu";
import type { Car } from "@collection/shared";
import type { Customer, Conversation } from "../../data/mock";

interface Props {
  /** Admin gets global search + notifications; partners get neither (their only
   *  data is inventory). */
  isAdmin?: boolean;
  /** The signed-in user's own showroom name + role + email — the avatar menu. */
  showroomName?: string;
  role?: "admin" | "partner";
  userEmail?: string;
  onSignOut?: () => void;
  customers: Customer[];
  cars: Car[];
  conversations: Conversation[];
  notifCount: number;
  notifUrgent?: boolean;
  onSearchSelect: (hit: GlobalSearchHit) => void;
  onOpenNotifications: () => void;
}

export function TopBar({ isAdmin = false, showroomName, role, userEmail, onSignOut, customers, cars, conversations, notifCount, notifUrgent, onSearchSelect, onOpenNotifications }: Props) {
  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-border">
      <div className="flex items-center gap-3 px-4 md:px-8 h-16">
        <div className="md:hidden">
          <Wordmark variant="dark" size="sm" />
        </div>

        {isAdmin ? (
          <div className="flex-1 max-w-xl mx-auto md:mx-0">
            <GlobalSearch
              customers={customers}
              cars={cars}
              conversations={conversations}
              onSelect={onSearchSelect}
            />
          </div>
        ) : (
          <div className="flex-1 hidden md:block text-ink-40" style={{ fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Inventory
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {isAdmin && (
            <button
              onClick={onOpenNotifications}
              className="flex size-11 items-center justify-center rounded-full hover:bg-platinum-soft text-ink-60 transition-colors"
              aria-label="Notifications"
            >
              <span className="relative flex items-center justify-center">
                <Bell size={19} strokeWidth={1.75} />
                {notifCount > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full ${notifUrgent ? "bg-signal-red text-cream" : "bg-noir text-cream"}`}
                    style={{ fontSize: "0.6rem", fontWeight: 600 }}
                  >
                    {notifCount}
                  </span>
                )}
              </span>
            </button>
          )}

          {/* The single identity + session control — same on desktop and mobile. */}
          <AvatarMenu showroomName={showroomName} role={role} userEmail={userEmail} onSignOut={onSignOut} />
        </div>
      </div>
    </div>
  );
}
