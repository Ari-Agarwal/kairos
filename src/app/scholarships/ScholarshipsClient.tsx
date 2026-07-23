"use client";

import { useState } from "react";
import type { Scholarship, ScholarshipCategory, FitAssessment } from "@/lib/scholarships";
import { SCHOLARSHIP_CATEGORIES, deadlineSortKey } from "@/lib/scholarships";
import { createClient } from "@/lib/supabase/client";
import { ScholarshipsEmptyArt } from "@/components/EmptyStateIllustration";
import ReportDataIssueButton from "@/components/ReportDataIssueButton";
import InfoTooltip from "@/components/InfoTooltip";

const FIT_TIER_EXPLAINER =
  "Rule-based, not AI-generated: it checks your profile (first-gen status, financial need, major, ROTC-style ECs) against this scholarship's stated eligibility text. Strong Fit means 2+ factors line up, Possible means 1, and Reach means none confirmed yet — that's a gap in known info, not a claim you're ineligible.";

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface ScholarshipWithMatch extends Scholarship {
  likelyMatch: boolean;
  matchReason: string | null;
  fit: FitAssessment;
  category: ScholarshipCategory;
  trackerStatus: "saved" | "applied" | null;
  checklist: ChecklistItem[];
  syncedToTimeline: boolean;
  logo: { imageUrl: string } | null;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: "Essay", done: false },
  { label: "Recommendation letter", done: false },
  { label: "Application form", done: false },
];

const FIT_TIER_STYLES: Record<FitAssessment["tier"], string> = {
  "Strong Fit": "bg-green-tint text-green",
  Possible: "bg-amber-tint text-amber-text-on-tint",
  Reach: "bg-secondary-tint text-secondary",
};

type SortKey = "default" | "deadline";
type TrackerStatus = "saved" | "applied" | null;

export default function ScholarshipsClient({
  scholarships,
  dataVerifiedDate,
}: {
  scholarships: ScholarshipWithMatch[];
  dataVerifiedDate: string | null;
}) {
  const supabase = createClient();
  const [showMatchesOnly, setShowMatchesOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ScholarshipCategory | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [trackerByName, setTrackerByName] = useState<Record<string, TrackerStatus>>(() =>
    Object.fromEntries(scholarships.map((s) => [s.name, s.trackerStatus]))
  );
  const [syncedByName, setSyncedByName] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(scholarships.map((s) => [s.name, s.syncedToTimeline]))
  );
  const [syncingName, setSyncingName] = useState<string | null>(null);
  const [checklistByName, setChecklistByName] = useState<Record<string, ChecklistItem[]>>(() =>
    Object.fromEntries(scholarships.map((s) => [s.name, s.checklist]))
  );
  const hasMatches = scholarships.some((s) => s.likelyMatch);

  async function toggleChecklistItem(name: string, itemIndex: number) {
    const current = checklistByName[name] && checklistByName[name].length > 0 ? checklistByName[name] : DEFAULT_CHECKLIST;
    const next = current.map((item, i) => (i === itemIndex ? { ...item, done: !item.done } : item));
    setChecklistByName((p) => ({ ...p, [name]: next }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("scholarship_tracker")
      .upsert(
        { user_id: user.id, scholarship_name: name, status: trackerByName[name] ?? "saved", checklist: next },
        { onConflict: "user_id,scholarship_name" }
      );
    if (error) setChecklistByName((p) => ({ ...p, [name]: current }));
  }

  async function addToTimeline(s: ScholarshipWithMatch) {
    setSyncingName(s.name);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSyncingName(null);
      return;
    }
    const { error } = await supabase.from("timeline_items").insert({
      user_id: user.id,
      title: `Scholarship: ${s.name}`,
      due_date: null,
      school_tags: [],
      tier: "free",
      is_strategic: false,
      completed: false,
      why_text: `Deadline window: ${s.deadline_window} (confirm the exact date on the official site before you rely on it).`,
      what_to_do: [
        "Review the eligibility requirements",
        "Gather any required materials (essay, recommendation, transcript)",
        "Submit before the deadline",
      ],
    });
    setSyncingName(null);
    if (error) return;
    setSyncedByName((p) => ({ ...p, [s.name]: true }));
  }

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
        {dataVerifiedDate && (
          <span className="text-text-gray/70">
            {" "}Data last verified {new Date(dataVerifiedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
          </span>
        )}
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
              <div className="flex items-center gap-2.5 min-w-0">
                {s.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logo.imageUrl}
                    alt=""
                    className="size-8 rounded-lg object-contain border border-border bg-bg shrink-0"
                    loading="lazy"
                  />
                )}
                <h2 className="font-serif text-lg text-text truncate">{s.name}</h2>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${FIT_TIER_STYLES[s.fit.tier]}`}>
                  {s.fit.tier}
                </span>
                <InfoTooltip text={FIT_TIER_EXPLAINER} label="What does this fit tier mean?" />
              </span>
            </div>
            <p className="text-text-gray text-xs mb-2">{s.organization} · {s.category}</p>
            <p className="text-text-gray text-sm mb-3 leading-relaxed">{s.eligibility_summary}</p>
            <p className="text-text-gray text-xs mb-3 italic">{s.fit.reason}</p>
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
                <button
                  onClick={() => addToTimeline(s)}
                  disabled={syncedByName[s.name] || syncingName === s.name}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-gray hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {syncedByName[s.name] ? "In timeline ✓" : syncingName === s.name ? "Adding…" : "Add to timeline"}
                </button>
              </div>
            </div>
            {trackerByName[s.name] && (
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
                {(checklistByName[s.name] && checklistByName[s.name].length > 0 ? checklistByName[s.name] : DEFAULT_CHECKLIST).map(
                  (item, idx) => (
                    <label key={item.label} className="flex items-center gap-1.5 text-xs text-text-gray cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklistItem(s.name, idx)}
                        className="rounded border-border"
                      />
                      <span className={item.done ? "line-through" : ""}>{item.label}</span>
                    </label>
                  )
                )}
              </div>
            )}
            <div className="mt-2">
              <ReportDataIssueButton contentType="scholarship_data" label={`Report an issue with "${s.name}"`} />
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 max-w-xs mx-auto">
            <ScholarshipsEmptyArt />
            <p className="text-text-gray text-sm text-center">No scholarships in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
