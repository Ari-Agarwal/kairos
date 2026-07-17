import { createServiceClient } from "@/lib/supabase/server";
import { MIN_COHORT_SIZE, type CohortStats } from "@/lib/cohort-types";

export { MIN_COHORT_SIZE, type CohortStats } from "@/lib/cohort-types";

/**
 * Aggregate outcome counts for a given school from students with similar profiles.
 * Never returns individual rows — only aggregate counts to preserve anonymity.
 *
 * Similarity is defined as:
 *   - Same school_name (case-insensitive exact match on what we store)
 *   - GPA within ±0.5 of the requesting student's GPA (if gpa provided)
 *   - Same intended_major (if major provided)
 *
 * Falls back to school-only aggregation if the narrower filter produces < MIN_COHORT_SIZE.
 * This is intentional: broader = more data, but caller should label it appropriately.
 *
 * Uses the service-role client deliberately: application_outcomes' own RLS
 * policy (`auth.uid() = user_id`) only lets a student read their own row, so
 * a normal session-scoped client can never see enough rows to cross the
 * MIN_COHORT_SIZE threshold and this always silently returns "not enough
 * data" instead. Safe to bypass RLS here specifically because this function
 * only ever returns aggregate counts (never a row, never a user_id) back to
 * the caller.
 */
export async function getCohortStats(
  schoolName: string,
  userGpa: number | null,
  userMajors: string[] | null,
): Promise<CohortStats | null> {
  const supabase = createServiceClient();

  // school_matches and profiles both reference auth.users independently --
  // there is no direct foreign key between them, so PostgREST can't do a
  // single-query nested embed (school_matches!inner(profiles!inner(...)))
  // the way this used to be written; that query always errored and this
  // function always silently returned null as a result. Two flat queries,
  // joined in JS on user_id, side-steps that -- still set-based, still only
  // pulls (decision_type, gpa, intended_major), never a row a caller could
  // trace back to an individual.
  const { data: outcomeRows, error: outcomeError } = await supabase
    .from("application_outcomes")
    .select("decision_type, school_matches!inner(school_name, user_id)")
    .eq("school_matches.school_name", schoolName);

  if (outcomeError || !outcomeRows || outcomeRows.length === 0) return null;

  type OutcomeRow = {
    decision_type: string;
    school_matches: { school_name: string; user_id: string };
  };
  const outcomes = outcomeRows as unknown as OutcomeRow[];

  const userIds = [...new Set(outcomes.map((r) => r.school_matches.user_id))];
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, unweighted_gpa, intended_major")
    .in("user_id", userIds);
  if (profileError) return null;

  const profileByUserId = new Map(
    (profileRows ?? []).map((p) => [p.user_id, { unweighted_gpa: p.unweighted_gpa, intended_major: p.intended_major }])
  );

  type Row = { decision_type: string; profile: { unweighted_gpa: number | null; intended_major: string[] | null } | undefined };
  const rows: Row[] = outcomes.map((r) => ({
    decision_type: r.decision_type,
    profile: profileByUserId.get(r.school_matches.user_id),
  }));

  function aggregate(subset: Row[]): CohortStats {
    const counts = { accept: 0, reject: 0, waitlist: 0, defer: 0 };
    for (const r of subset) {
      const d = r.decision_type as keyof typeof counts;
      if (d in counts) counts[d]++;
    }
    return {
      total: subset.length,
      ...counts,
      gpaBand: null,
      majorMatch: false,
    };
  }

  // Try narrowest filter first: GPA band + major. "Same major" now means any
  // overlap between the two students' major lists, not an exact single-value
  // match -- a student who selected multiple majors should still cohort-match
  // another student who shares just one of them.
  const userMajorSet = new Set((userMajors ?? []).map((m) => m.toLowerCase().trim()));
  if (userGpa !== null && userMajorSet.size > 0) {
    const narrow = rows.filter((r) => {
      const p = r.profile;
      if (!p || p.unweighted_gpa == null || !p.intended_major?.length) return false;
      const inBand = Math.abs(p.unweighted_gpa - userGpa) <= 0.5;
      const sameMajor = p.intended_major.some((m) => userMajorSet.has(m.toLowerCase().trim()));
      return inBand && sameMajor;
    });
    if (narrow.length >= MIN_COHORT_SIZE) {
      const s = aggregate(narrow);
      s.gpaBand = [Math.max(0, userGpa - 0.5), Math.min(4.0, userGpa + 0.5)];
      s.majorMatch = true;
      return s;
    }
  }

  // Fall back: GPA band only
  if (userGpa !== null) {
    const band = rows.filter((r) => (r.profile?.unweighted_gpa != null ? Math.abs(r.profile.unweighted_gpa - userGpa) <= 0.5 : false));
    if (band.length >= MIN_COHORT_SIZE) {
      const s = aggregate(band);
      s.gpaBand = [Math.max(0, userGpa - 0.5), Math.min(4.0, userGpa + 0.5)];
      return s;
    }
  }

  // Fall back: all outcomes for this school
  if (rows.length >= MIN_COHORT_SIZE) {
    return aggregate(rows);
  }

  // Not enough data in any filter width
  return null;
}
