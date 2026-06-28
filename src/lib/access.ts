import type { SupabaseClient } from "@supabase/supabase-js";

export type FeatureKey =
  | "career_path_explorer"
  | "essay_feedback"
  | "unlimited_regenerations"
  | "strategic_timeline_advice";

export interface AccessUser {
  subscription_tier: "free" | "premium";
}

export function canAccessFeature(user: AccessUser | null | undefined, featureKey: FeatureKey): boolean {
  if (!user) return false;
  return user.subscription_tier === "premium";
}

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

export function canRegenerate(user: AccessUser | null | undefined, currentWeekCount: number): boolean {
  if (canAccessFeature(user, "unlimited_regenerations")) return true;
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
  const { data } = await supabase
    .from("counselors")
    .select("counselor_id, school_id, name, email")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}
