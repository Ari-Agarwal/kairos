"use client";

import {
  FIELD_LABELS,
  CAMPUS_SIZES,
  CAMPUS_SETTINGS,
  FIELD_PLACEHOLDERS,
  FIELD_HINTS,
  MULTI_SELECT_FIELDS,
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
  values: Record<string, string | string[]>;
  onChange: (field: string, value: string | string[]) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="space-y-3">
      {fields.map((field) => {
        const isMultiSelect = MULTI_SELECT_FIELDS.includes(field);
        const options = field === "campus_size_pref" ? CAMPUS_SIZES : CAMPUS_SETTINGS;
        const selected = isMultiSelect ? ((values[field] as string[] | undefined) ?? []) : [];
        return (
          <div key={field}>
            <label className="block text-xs text-text-gray mb-1">{FIELD_LABELS[field]}</label>
            {FIELD_HINTS[field] && (
              <p className="text-xs text-text-gray/70 mb-1">{FIELD_HINTS[field]}</p>
            )}
            {isMultiSelect ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label={FIELD_LABELS[field]}>
                {options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={selected.includes(o)}
                    onClick={() =>
                      onChange(
                        field,
                        selected.includes(o) ? selected.filter((v) => v !== o) : [...selected, o]
                      )
                    }
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      selected.includes(o)
                        ? "bg-primary text-bg border-primary"
                        : "border-border text-text-gray hover:text-text"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={(values[field] as string | undefined) ?? ""}
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
