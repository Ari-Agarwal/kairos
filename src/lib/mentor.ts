import type { SupabaseClient } from "@supabase/supabase-js";
import { isBlocked } from "@/lib/safety";

export interface EligibleMentor {
  user_id: string;
  mentor_bio: string | null;
  intended_major: string[] | null;
}

// Eligible mentor = opted in AND has a logged "accept" outcome for this exact
// school. Never returns a candidate blocked in either direction with the
// requester -- checked per-candidate since blocks are rare enough that a
// small per-row lookup here is simpler and safer than a join both directions.
export async function findEligibleMentors(
  supabase: SupabaseClient,
  schoolName: string,
  requesterId: string
): Promise<EligibleMentor[]> {
  const { data, error } = await supabase
    .from("application_outcomes")
    .select(`
      school_matches!inner (
        school_name,
        user_id,
        profiles!inner ( user_id, mentor_opt_in, mentor_bio, intended_major )
      )
    `)
    .eq("decision_type", "accept")
    .eq("school_matches.school_name", schoolName)
    .eq("school_matches.profiles.mentor_opt_in", true);

  if (error) console.error("findEligibleMentors query failed:", error);
  if (error || !data) return [];

  type Row = {
    school_matches: {
      profiles: { user_id: string; mentor_opt_in: boolean; mentor_bio: string | null; intended_major: string[] | null } | null;
    };
  };

  const candidates = (data as unknown as Row[])
    .map((r) => r.school_matches.profiles)
    .filter((p): p is NonNullable<typeof p> => p !== null && p.user_id !== requesterId);

  const eligible: EligibleMentor[] = [];
  for (const c of candidates) {
    if (eligible.some((e) => e.user_id === c.user_id)) continue; // dedupe
    if (await isBlocked(supabase, requesterId, c.user_id)) continue;
    eligible.push({ user_id: c.user_id, mentor_bio: c.mentor_bio, intended_major: c.intended_major });
  }
  return eligible;
}

export async function hasLoggedAcceptOutcome(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("application_outcomes")
    .select("id")
    .eq("user_id", userId)
    .eq("decision_type", "accept")
    .limit(1);
  if (error) console.error("hasLoggedAcceptOutcome query failed:", error);
  return (data?.length ?? 0) > 0;
}
