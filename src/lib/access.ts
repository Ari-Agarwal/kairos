import type { SupabaseClient } from "@supabase/supabase-js";

export interface CounselorUser {
  role: "counselor" | "student";
}

export function isCounselor(user: CounselorUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === "counselor";
}

export const FREE_REGENERATION_WEEKLY_LIMIT = 3;

export function weekStart(now: Date): string {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function canRegenerate(currentWeekCount: number): boolean {
  return currentWeekCount < FREE_REGENERATION_WEEKLY_LIMIT;
}

export interface CounselorRecord {
  counselor_id: string;
  school_id: string;
  name: string;
  email: string;
}

export async function getCounselorRecord(
  supabase: SupabaseClient,
  userId: string
): Promise<CounselorRecord | null> {
  const { data, error } = await supabase
    .from("counselors")
    .select("counselor_id, school_id, name, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("getCounselorRecord query failed:", error);
  return data;
}

// Gates /admin/* routes -- replaces the old shared-secret-in-URL pattern
// (?key=...) with a real per-user flag on an authenticated session, so
// access is tied to a specific account rather than an unrevocable key
// anyone could hold indefinitely. Takes a service-role client (the admin
// pages already use one for every other query) so this works regardless of
// RLS.
export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("isAdmin query failed:", error);
    return false;
  }
  return data?.is_admin === true;
}
