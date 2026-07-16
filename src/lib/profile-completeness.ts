export interface CompletenessProfile {
  intended_major: string | null;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  test_scores: unknown;
  sat_score?: number | null;
  act_score?: number | null;
  career_goals?: string | null;
  class_rank?: string | null;
  campus_size_pref?: string | null;
  campus_setting_pref?: string | null;
  legacy_school?: string | null;
  internships_research?: string | null;
  achievements?: string | null;
}

export type CompletenessSurface = "matches" | "timeline" | "general";

// Which fields actually matter for each generation, so the nudge shown before
// a given generation only lists what would improve THAT output — not every
// field missing anywhere on the profile. "general" (dashboard) is the union,
// since nothing specific is being generated there.
const SURFACE_FIELDS: Record<CompletenessSurface, string[]> = {
  matches: [
    "intended_major",
    "extracurriculars",
    "schools_already_considering",
    "test_scores",
    "legacy_school",
    "internships_research",
    "achievements",
    "career_goals",
  ],
  timeline: ["class_rank", "career_goals", "campus_size_pref", "campus_setting_pref", "test_scores"],
  general: [
    "intended_major",
    "extracurriculars",
    "schools_already_considering",
    "test_scores",
    "career_goals",
    "class_rank",
    "campus_size_pref",
    "campus_setting_pref",
    "legacy_school",
    "internships_research",
    "achievements",
  ],
};

function isMissing(profile: CompletenessProfile, field: string): boolean {
  switch (field) {
    case "intended_major":
      return !profile.intended_major;
    case "extracurriculars":
      return !profile.extracurriculars || profile.extracurriculars.length === 0;
    case "schools_already_considering":
      return !profile.schools_already_considering;
    case "test_scores":
      return !profile.test_scores && !profile.sat_score && !profile.act_score;
    case "career_goals":
      return !profile.career_goals;
    case "class_rank":
      return !profile.class_rank;
    case "campus_size_pref":
      return !profile.campus_size_pref;
    case "campus_setting_pref":
      return !profile.campus_setting_pref;
    case "legacy_school":
      return !profile.legacy_school;
    case "internships_research":
      return !profile.internships_research;
    case "achievements":
      return !profile.achievements;
    default:
      return false;
  }
}

export function getMissingFields(
  profile: CompletenessProfile | null | undefined,
  surface: CompletenessSurface = "general"
): string[] {
  if (!profile) return [];
  return SURFACE_FIELDS[surface].filter((field) => isMissing(profile, field));
}
