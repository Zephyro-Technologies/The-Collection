// The Collection — authentication + tenant/role resolution (shared).
//
// Real Supabase Auth. Role and showroom are read from the user's app_metadata
// JWT claim — set server-side by The Collection when the account is created.
// SECURITY: this reads app_metadata (server-only, not user-editable), NEVER
// user_metadata (which the user can edit and could use to self-escalate).

import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "partner";

export interface AuthContext {
  userId: string;
  email?: string;
  role?: AppRole;
  showroomId?: string;
  isAdmin: boolean;
}

/** Email + password sign-in. Throws on failure (e.g. invalid credentials). */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** The current session (from persisted storage), or null. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Subscribe to auth changes (sign-in / sign-out / token refresh). Returns an
 *  unsubscribe function. */
export function onAuthStateChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Resolve { role, showroomId, isAdmin } from a session's app_metadata claim.
 * Reads app_metadata — NOT user_metadata.
 */
export function authContextFromSession(session: Session | null): AuthContext | null {
  if (!session) return null;
  const md = (session.user.app_metadata ?? {}) as { role?: AppRole; showroom_id?: string };
  return {
    userId: session.user.id,
    email: session.user.email,
    role: md.role,
    showroomId: md.showroom_id,
    isAdmin: md.role === "admin",
  };
}
