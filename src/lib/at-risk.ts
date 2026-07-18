// Shared between counselor/at-risk (full flag list) and counselor/aggregate
// (per-grade at-risk counts) so the two pages can't drift on what "at risk"
// means.

export interface FlagInputProfile {
  user_id: string;
  grade_level: string;
  last_login_at: string | null;
  intended_major: string[] | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: unknown;
}

export interface StudentFlags {
  user_id: string;
  grade_level: string;
  reasons: string[];
  severity: number;
}

// Roughly ordered by how cold a lead is: a student who's never engaged at
// all outranks one who's just behind on a single deadline.
export const SEVERITY = {
  neverLoggedIn: 5,
  longInactive: 4,
  noMatches: 3,
  overduePerItem: 1,
  incompleteProfile: 1,
} as const;

function daysSince(dateString: string | null): number {
  if (!dateString) return Infinity;
  return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24);
}

export function computeFlags(
  profiles: FlagInputProfile[],
  matchCountByUser: Map<string, number>,
  overdueByUser: Map<string, number>
): StudentFlags[] {
  const flagged: StudentFlags[] = [];

  for (const p of profiles) {
    const reasons: string[] = [];
    let severity = 0;
    const overdueCount = overdueByUser.get(p.user_id) ?? 0;
    const activeMatchCount = matchCountByUser.get(p.user_id) ?? 0;
    const loginAge = daysSince(p.last_login_at);
    const incompleteProfile = !(
      p.intended_major && p.intended_major.length > 0 &&
      p.extracurriculars && p.extracurriculars.length > 0 &&
      p.schools_already_considering &&
      p.test_scores
    );

    if (overdueCount > 0) {
      reasons.push(`${overdueCount} overdue timeline item${overdueCount > 1 ? "s" : ""}`);
      severity += SEVERITY.overduePerItem * overdueCount;
    }
    if (activeMatchCount === 0) {
      reasons.push("No active school matches");
      severity += SEVERITY.noMatches;
    }
    if (p.last_login_at === null) {
      reasons.push("Never logged in");
      severity += SEVERITY.neverLoggedIn;
    } else if (loginAge >= 30) {
      reasons.push(`No login in ${Math.floor(loginAge)}+ days`);
      severity += SEVERITY.longInactive;
    } else if (incompleteProfile && loginAge >= 14) {
      reasons.push("Profile incomplete for 2+ weeks");
      severity += SEVERITY.incompleteProfile;
    }

    if (reasons.length > 0) {
      flagged.push({ user_id: p.user_id, grade_level: p.grade_level, reasons, severity });
    }
  }

  return flagged.sort((a, b) => b.severity - a.severity || b.reasons.length - a.reasons.length);
}
