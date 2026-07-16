"use client";

import { useState } from "react";
import type { Scholarship } from "@/lib/scholarships";

interface ScholarshipWithMatch extends Scholarship {
  likelyMatch: boolean;
}

export default function ScholarshipsClient({ scholarships }: { scholarships: ScholarshipWithMatch[] }) {
  const [showMatchesOnly, setShowMatchesOnly] = useState(false);
  const hasMatches = scholarships.some((s) => s.likelyMatch);
  const visible = showMatchesOnly ? scholarships.filter((s) => s.likelyMatch) : scholarships;

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-2">Scholarships</h1>
      <p className="text-text-gray text-sm mb-4 leading-relaxed">
        National scholarships worth applying to. Deadline windows are approximate — exact dates
        shift a little every cycle, so confirm the current date on the official site before you rely
        on it.
      </p>

      {hasMatches && (
        <button
          onClick={() => setShowMatchesOnly((v) => !v)}
          className={`mb-5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
            showMatchesOnly ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
          }`}
        >
          {showMatchesOnly ? "Showing likely matches" : "Show likely matches only"}
        </button>
      )}

      <div className="space-y-3">
        {visible.map((s) => (
          <div key={s.name} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="font-serif text-lg text-text">{s.name}</h2>
              {s.likelyMatch && (
                <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-tint text-amber-text-on-tint">
                  Likely match
                </span>
              )}
            </div>
            <p className="text-text-gray text-xs mb-2">{s.organization}</p>
            <p className="text-text-gray text-sm mb-3 leading-relaxed">{s.eligibility_summary}</p>
            <div className="flex flex-wrap gap-4 text-xs text-text-gray mb-3">
              {s.award_amount && <span>Award: {s.award_amount}</span>}
              <span>Typical deadline: {s.deadline_window} (confirm current-cycle date)</span>
            </div>
            <a
              href={s.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:text-primary-hover text-sm underline underline-offset-2"
            >
              Official site →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
