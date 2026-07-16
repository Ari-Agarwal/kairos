"use client";

import {
  FIELD_LABELS,
  CAMPUS_SIZES,
  CAMPUS_SETTINGS,
  FIELD_PLACEHOLDERS,
} from "@/lib/mini-onboarding-fields";

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
