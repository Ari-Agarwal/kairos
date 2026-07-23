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

// Shared between onboarding and profile edit so both offer the exact same
// major list. "Other" is handled specially by both callers (reveals a free
// text input rather than being a selectable value on its own).
export const MAJORS = [
  "Undecided", "Biology", "Business", "Chemistry", "Computer Science", "Economics",
  "Education", "Engineering (general)", "English", "Environmental Science", "Finance",
  "History", "International Relations", "Journalism", "Mathematics", "Medicine / Pre-Med",
  "Nursing", "Philosophy", "Physics", "Political Science", "Psychology", "Public Health",
  "Sociology", "Visual/Performing Arts", "Other",
];

// Fields collected as text[] rather than a single string -- rendered as a
// multi-select checkbox group everywhere they appear (profile edit, mini
// onboarding) rather than a single select/toggle.
export const MULTI_SELECT_FIELDS = ["campus_size_pref", "campus_setting_pref"];

export const FIELD_PLACEHOLDERS: Record<string, string> = {
  schools_already_considering: "e.g. University of Michigan, Duke",
  career_goals: "e.g. software engineering, then eventually product management",
  class_rank: "e.g. top 10%, or unranked",
  legacy_school: "e.g. legacy at Duke (parent alum), or none",
  internships_research: "e.g. summer research internship in a campus bio lab",
};

// Shown under a field to explain why it's worth answering even though it's
// skippable — class_rank specifically flagged (Jul 21 focus-group follow-up)
// since most US high schools no longer report rank, so the field would
// otherwise read as a blocking ask for data many students simply don't have.
export const FIELD_HINTS: Record<string, string> = {
  class_rank: "Most high schools no longer report class rank — leave blank if yours doesn't.",
};
