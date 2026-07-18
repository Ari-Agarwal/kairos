"use client";

import { useState } from "react";
import type { Scholarship, ScholarshipCategory } from "@/lib/scholarships";
import { SCHOLARSHIP_CATEGORIES, deadlineSortKey } from "@/lib/scholarships";
import { createClient } from "@/lib/supabase/client";

interface ScholarshipWithMatch extends Scholarship {
  likelyMatch: boolean;
  matchReason: string | null;
  category: ScholarshipCategory;
  trackerStatus: "saved" | "applied" | null;
}

type SortKey = "default" | "deadline";
type TrackerStatus = "saved" | "applied" | null;

export default function ScholarshipsClient({ scholarships }: { scholarships: ScholarshipWithMatch[] }) {
  const supabase = createClient();
  const [showMatchesOnly, setShowMatchesOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ScholarshipCategory | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [trackerByName, setTrackerByName] = useState<Record<string, TrackerStatus>>(() =>
    Object.fromEntries(scholarships.map((s) => [s.name, s.trackerStatus]))
  );
  const hasMatches = scholarships.some((s) => s.likelyMatch);

  async function setTrackerStatus(name: string, status: TrackerStatus) {
    const prev = trackerByName[name] ?? null;
    setTrackerByName((p) => ({ ...p, [name]: status }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTrackerByName((p) => ({ ...p, [name]: prev }));
      return;
    }
    const { error } = status
      ? await supabase
          .from("scholarship_tracker")
          .upsert({ user_id: user.id, scholarship_name: name, status }, { onConflict: "user_id,scholarship_name" })
      : await supabase.from("scholarship_tracker").delete().eq("user_id", user.id).eq("scholarship_name", name);
    if (error) setTrackerByName((p) => ({ ...p, [name]: prev }));
  }

  const categoryCounts = SCHOLARSHIP_CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c] = scholarships.filter((s) => s.category === c).length;
    return acc;
  }, {});

  let visible = showMatchesOnly ? scholarships.filter((s) => s.likelyMatch) : scholarships;
  if (activeCategory !== "all") visible = visible.filter((s) => s.category === activeCategory);
  if (sortKey === "deadline") {
    visible = [...visible].sort((a, b) => deadlineSortKey(a.deadline_window) - deadlineSortKey(b.deadline_window));
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-2">Scholarships</h1>
      <p className="text-text-gray text-sm mb-4 leading-relaxed">
        National scholarships worth applying to, grouped by type since there are too many to scroll
        through one by one. Deadline windows are approximate — exact dates shift a little every
        cycle, so confirm the current date on the official site before you rely on it.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        {hasMatches && (
          <button
            onClick={() => setShowMatchesOnly((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              showMatchesOnly ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
            }`}
          >
            {showMatchesOnly ? "Showing likely matches" : "Show likely matches only"}
          </button>
        )}
        <select
          aria-label="Sort scholarships"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-sm rounded-full border border-border bg-bg px-3 py-1.5 text-text-gray outline-none focus:border-primary"
        >
          <option value="default">Sort: Default</option>
          <option value="deadline">Sort: Nearest deadline</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setActiveCategory("all")}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            activeCategory === "all" ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
          }`}
        >
          All ({scholarships.length})
        </button>
        {SCHOLARSHIP_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === c ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
            }`}
          >
            {c} ({categoryCounts[c]})
          </button>
        ))}
      </div>

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
            <p className="text-text-gray text-xs mb-2">{s.organization} · {s.category}</p>
            <p className="text-text-gray text-sm mb-3 leading-relaxed">{s.eligibility_summary}</p>
            {s.likelyMatch && s.matchReason && (
              <p className="text-amber-text-on-tint text-xs mb-3 italic">{s.matchReason}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-text-gray mb-3">
              {s.award_amount && <span>Award: {s.award_amount}</span>}
              <span>Typical deadline: {s.deadline_window} (confirm current-cycle date)</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <a
                href={s.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary-hover text-sm underline underline-offset-2"
              >
                Official site →
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => setTrackerStatus(s.name, trackerByName[s.name] === "saved" ? null : "saved")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    trackerByName[s.name] === "saved"
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {trackerByName[s.name] === "saved" ? "Saved" : "Save"}
                </button>
                <button
                  onClick={() => setTrackerStatus(s.name, trackerByName[s.name] === "applied" ? null : "applied")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    trackerByName[s.name] === "applied"
                      ? "bg-green text-bg border-green"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {trackerByName[s.name] === "applied" ? "Applied ✓" : "Mark applied"}
                </button>
              </div>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-text-gray text-sm text-center py-8">No scholarships in this category yet.</p>
        )}
      </div>
    </div>
  );
}
