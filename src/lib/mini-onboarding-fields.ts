// Plain data shared by MissingFieldInputs.tsx (a "use client" component) and
// by Server Components that need the same field metadata (e.g. matches/prep).
// Kept in a non-client module deliberately -- importing a named export from a
// "use client" file into a Server Component breaks under this project's
// bundler (surfaced as "X.includes is not a function").
export const FIELD_LABELS: Record<string, string> = {
  intended_major: "Intended Major",
  extracurriculars: "Extracurriculars",
  schools_already_considering: "Schools You're Already Considering",
  test_scores: "Test Scores",
  career_goals: "Career Goals",
  class_rank: "Class Rank",
  campus_size_pref: "Campus Size Preference",
  campus_setting_pref: "Campus Setting Preference",
  legacy_school: "Legacy Status",
  internships_research: "Internships / Research",
};

// Fields simple enough to collect inline (plain text or a short select) —
// anything not in this list (major, extracurriculars, test scores) is
// surfaced as a link out to the full profile edit page instead.
export const INLINE_TEXT_FIELDS = [
  "schools_already_considering",
  "career_goals",
  "class_rank",
  "legacy_school",
  "internships_research",
  "campus_size_pref",
  "campus_setting_pref",
];

export const CAMPUS_SIZES = ["Small", "Medium", "Large", "No preference"];
export const CAMPUS_SETTINGS = ["Urban", "Suburban", "Rural", "No preference"];

export const FIELD_PLACEHOLDERS: Record<string, string> = {
  schools_already_considering: "e.g. University of Michigan, Duke",
  career_goals: "e.g. software engineering, then eventually product management",
  class_rank: "e.g. top 10%, or unranked",
  legacy_school: "e.g. legacy at Duke (parent alum), or none",
  internships_research: "e.g. summer research internship in a campus bio lab",
};
