"use client";

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
  achievements: "Achievements / Awards",
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
  "achievements",
  "campus_size_pref",
  "campus_setting_pref",
];

const CAMPUS_SIZES = ["Small", "Medium", "Large", "No preference"];
const CAMPUS_SETTINGS = ["Urban", "Suburban", "Rural", "No preference"];

const FIELD_PLACEHOLDERS: Record<string, string> = {
  schools_already_considering: "e.g. University of Michigan, Duke",
  career_goals: "e.g. software engineering, then eventually product management",
  class_rank: "e.g. top 10%, or unranked",
  legacy_school: "e.g. legacy at Duke (parent alum), or none",
  internships_research: "e.g. summer research internship in a campus bio lab",
  achievements: "e.g. regional science fair finalist, Eagle Scout",
};

// Pure inline fields — no card, no title, no buttons. Embedded directly into
// whatever pre-generate panel the parent (Matches/Timeline) already shows,
// rather than a separate pop-up modal that appears after the fact.
export default function MissingFieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: string[];
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const isSelect = field === "campus_size_pref" || field === "campus_setting_pref";
        const options = field === "campus_size_pref" ? CAMPUS_SIZES : CAMPUS_SETTINGS;
        return (
          <div key={field}>
            <label className="block text-xs text-text-gray mb-1">{FIELD_LABELS[field]}</label>
            {isSelect ? (
              <select
                value={values[field] ?? ""}
                onChange={(e) => onChange(field, e.target.value)}
                className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              >
                <option value="" disabled>Select</option>
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={values[field] ?? ""}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={FIELD_PLACEHOLDERS[field]}
                className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
