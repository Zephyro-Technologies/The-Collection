// The Collection — showrooms (tenants) read access (shared).
// Used by the admin dashboard's showroom context switcher. The website does not
// use this (it renders cars unbranded).

import { supabase } from "./supabase";

/**
 * The master showroom — "The Collection" itself. Fixed, seeded id (migration
 * 0004). This is the ONLY showroom whose cars can appear on the public website
 * (migration 0015 scopes the anon read to it), and the showroom a photographer is
 * provisioned against. Both apps and any RLS-mirroring app filter must agree on
 * this value, so it lives here rather than being hardcoded per call site.
 */
export const MASTER_SHOWROOM_ID = "11111111-1111-1111-1111-111111111111";

export interface Showroom {
  id: string;
  slug: string;
  name: string;
  isMaster: boolean;
  isActive: boolean;
}

interface ShowroomRow {
  id: string;
  slug: string;
  name: string;
  is_master: boolean;
  is_active: boolean;
}

function rowToShowroom(r: ShowroomRow): Showroom {
  return { id: r.id, slug: r.slug, name: r.name, isMaster: r.is_master, isActive: r.is_active };
}

/** All showrooms — the master (The Collection) first, then by name. */
export async function listShowrooms(): Promise<Showroom[]> {
  const { data, error } = await supabase
    .from("showrooms")
    .select("*")
    .order("is_master", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as ShowroomRow[]).map(rowToShowroom);
}

/**
 * A single showroom by id, or null. Used to resolve the signed-in user's OWN
 * showroom name (for the identity display) — a partner can read their own row
 * under RLS ("showrooms select scoped"), and an admin can read any.
 */
export async function getShowroomById(id: string): Promise<Showroom | null> {
  const { data, error } = await supabase.from("showrooms").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToShowroom(data as ShowroomRow) : null;
}
