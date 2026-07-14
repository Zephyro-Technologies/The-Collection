import { Bell, Car as CarIcon, ArrowLeftRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import type { Notification } from "@collection/shared";
import { relativeAge } from "../../data/mock";
import type { ViewKey } from "./nav-items";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Real "partner added a car" feed, admin-only + live (from App state). */
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (v: ViewKey) => void;
}

export function NotificationsSheet({ open, onClose, notifications, onMarkRead, onMarkAllRead, onNavigate }: Props) {
  const unread = notifications.filter((n) => !n.isRead).length;

  // Clicking a notification marks it read and jumps to where it's actionable:
  // an enquiry-match → the Matching screen; a new car → Inventory.
  const openNotif = (n: Notification) => {
    if (!n.isRead) onMarkRead(n.id);
    onNavigate(n.type === "enquiry_match" ? "matching" : "inventory");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b border-border">
          <div className="eyebrow mb-2 flex items-center gap-1.5"><Bell size={11} /> Notifications</div>
          <div className="flex items-end justify-between gap-3">
            <SheetTitle className="editorial" style={{ fontSize: "1.5rem" }}>
              {unread === 0 ? "All caught up." : `${unread} unread`}
            </SheetTitle>
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-ink-60 hover:text-noir transition-colors shrink-0"
                style={{ fontSize: "0.75rem", letterSpacing: "0.02em" }}
              >
                Mark all read
              </button>
            )}
          </div>
          <SheetDescription className="sr-only">
            New cars added to inventory by partner showrooms.
          </SheetDescription>
        </SheetHeader>

        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="accent-rule mx-auto mb-4" />
            <p className="text-ink-60">No notifications yet.</p>
            <p className="text-ink-40 mt-1" style={{ fontSize: "0.8rem" }}>
              You'll be alerted here when a partner adds a car.
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotif(n)}
                className={`w-full text-left px-6 py-4 border-b border-border transition-colors flex items-start gap-3 ${
                  n.isRead ? "hover:bg-platinum-soft/50" : "bg-accent/5 hover:bg-accent/10"
                }`}
              >
                {/* Unread marker keeps its column even when read, so text stays aligned. */}
                <span className="mt-1.5 shrink-0" style={{ width: "0.5rem" }}>
                  {!n.isRead && <span className="block size-2 rounded-full bg-signal-amber" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-3">
                    <span className="eyebrow flex items-center gap-1.5 text-ink-40">
                      {n.type === "enquiry_match" ? <><ArrowLeftRight size={11} /> Enquiry match</> : <><CarIcon size={11} /> New car</>}
                    </span>
                    <span className="text-ink-40" style={{ fontSize: "0.7rem" }}>{relativeAge(n.createdAt)}</span>
                  </span>
                  <span
                    className="block text-noir mt-1"
                    style={{ fontSize: "0.9rem", lineHeight: 1.45, fontWeight: n.isRead ? 400 : 500 }}
                  >
                    {n.message}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
