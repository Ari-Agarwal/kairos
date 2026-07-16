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
}

export function getMissingFields(profile: CompletenessProfile | null | undefined): string[] {
  if (!profile) return [];
  const missing: string[] = [];
  if (!profile.intended_major) missing.push("intended_major");
  if (!profile.extracurriculars || profile.extracurriculars.length === 0) missing.push("extracurriculars");
  if (!profile.schools_already_considering) missing.push("schools_already_considering");
  if (!profile.test_scores && !profile.sat_score && !profile.act_score) missing.push("test_scores");
  if (!profile.career_goals) missing.push("career_goals");
  if (!profile.class_rank) missing.push("class_rank");
  if (!profile.campus_size_pref) missing.push("campus_size_pref");
  if (!profile.campus_setting_pref) missing.push("campus_setting_pref");
  return missing;
}
