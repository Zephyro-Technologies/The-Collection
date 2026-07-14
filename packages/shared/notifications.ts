// The Collection — notifications (admin-only "partner added a car" feed).
//
// Backed by the `notifications` table + trigger (migration 0007). RLS restricts
// all of this to the admin (app_role()='admin'); a partner's queries return
// nothing and their realtime subscription receives nothing.

import { supabase } from "./supabase";

export interface Notification {
  id: string;
  type: string;
  showroomId: string | null;
  carId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  type: string;
  showroom_id: string | null;
  car_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

function rowToNotification(r: NotificationRow): Notification {
  return {
    id: r.id,
    type: r.type,
    showroomId: r.showroom_id,
    carId: r.car_id,
    message: r.message,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

/** Recent notifications, unread first then newest. Admin-only by RLS. */
export async function listNotifications(limit = 50): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NotificationRow[]).map(rowToNotification);
}

/** Number of unread notifications. Admin-only by RLS. */
export async function unreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

/** Mark a single notification read. */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) throw error;
}

/** Mark every unread notification read. */
export async function markAllRead(): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (error) throw error;
}

/**
 * Subscribe to live notification changes (insert = new car added; update =
 * marked read). Calls `onChange` on any change so the caller can re-fetch.
 * Returns an unsubscribe function — call it on unmount. Admin-only in practice:
 * RLS filters the realtime stream, so a partner receives nothing.
 */
export function subscribeNotifications(onChange: () => void): () => void {
  const channel = supabase
    .channel("notifications-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
