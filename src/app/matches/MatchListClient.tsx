"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import { track } from "@/lib/analytics";
import AidAppealModal from "./AidAppealModal";
import { MatchesEmptyArt } from "@/components/EmptyStateIllustration";
import { downloadCollegeListPdf } from "@/lib/college-list-pdf";

const EASE = [0.16, 1, 0.3, 1] as const;

type Category = "reach" | "target" | "safety";

interface Match {
  id: string;
  school_name: string;
  category: Category;
  percentage: number;
  why_text: string;
  is_manual: boolean;
  locked: boolean;
  confidence: "low" | "moderate" | "high" | null;
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence — less data to go on",
};

// Merit aid (distinct from need-based aid) is awarded by schools largely to
// attract students whose stats sit above their typical admitted range --
// which is exactly what "target" and "safety" mean in this app's own tier
// reasoning (Section 1). This reuses that existing reach/target/safety
// classification rather than adding any new AI call or data source (Software
// Timeline.md Section 10). Deliberately hedged ("if offered," "worth asking
// about") since Kairos has no actual per-school merit-aid data.
const MERIT_AID_NOTE: Record<Category, string> = {
  reach: "Merit aid, if offered here, is less likely — your profile is closer to or below this school's typical admitted range, which is what merit scholarships usually reward.",
  target: "Merit aid, if offered, is worth asking about — your profile is in line with this school's admitted range, which is the range merit scholarships are usually drawn from.",
  safety: "Merit aid is often strongest here — your profile is above this school's typical admitted range, which is exactly the group most merit scholarships are designed to attract.",
};

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

const CATEGORY_ORDER: Record<Category, number> = { reach: 0, target: 1, safety: 2 };
const CATEGORIES: Category[] = ["reach", "target", "safety"];

const MANUAL_NOTE = "This school was added manually, so an AI assessment isn't available.";
const REGENERATE_SNAPSHOT_KEY = "kairos_matches_regenerate_snapshot";

interface Photo {
  imageUrl: string;
  attributionText: string;
  attributionUrl: string;
}

export default function MatchListClient({
  initialMatches,
  remaining,
  isPremium,
  photos = {},
  studentName = null,
}: {
  initialMatches: Match[];
  remaining: number | null;
  isPremium: boolean;
  photos?: Record<string, Photo | null>;
  studentName?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const reduceMotion = useReducedMotion();
  const [matches, setMatches] = useState(initialMatches);
  const [prevInitialMatches, setPrevInitialMatches] = useState(initialMatches);
  if (initialMatches !== prevInitialMatches) {
    setPrevInitialMatches(initialMatches);
    setMatches(initialMatches);
  }
  const [editing, setEditing] = useState(false);

  // Side-by-side compare (Section 5f) -- reuses Career Path's compare-mode
  // pattern (pick 2-3, cap at 3), but no fetch is needed here since every
  // match's data is already loaded client-side.
  const MAX_COMPARE = 3;
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  function toggleCompareSchool(id: string) {
    setCompareSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_COMPARE ? [...prev, id] : prev
    );
  }
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCategory, setNewSchoolCategory] = useState<Category>("target");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Inline editing for a manually-added school's name/category -- the only
  // fields it makes sense to edit, since a manual entry has no AI-generated
  // why_text/factors to revise.
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editSchoolCategory, setEditSchoolCategory] = useState<Category>("target");
  const [savingEdit, setSavingEdit] = useState(false);

  function startEditSchool(m: Match) {
    setEditingSchoolId(m.id);
    setEditSchoolName(m.school_name);
    setEditSchoolCategory(m.category);
  }

  async function handleSaveEditSchool() {
    if (!editingSchoolId || !editSchoolName.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("school_matches")
      .update({ school_name: editSchoolName.trim(), category: editSchoolCategory })
      .eq("id", editingSchoolId);
    setSavingEdit(false);
    if (error) return;
    setMatches((prev) =>
      prev
        .map((m) =>
          m.id === editingSchoolId ? { ...m, school_name: editSchoolName.trim(), category: editSchoolCategory } : m
        )
        .sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category])
    );
    setEditingSchoolId(null);
  }


  // Aid offers loaded from DB (matchId → amount) — used to gate appeal button
  const [aidOffers, setAidOffers] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadAidOffers() {
      const ids = matches.map((m) => m.id);
      if (ids.length === 0) return;
      const { data, error } = await supabase
        .from("application_outcomes")
        .select("school_match_id, aid_offer_amount")
        .in("school_match_id", ids)
        .not("aid_offer_amount", "is", null);
      if (error) console.error("loadAidOffers query failed:", error);
      if (data) {
        const map: Record<string, number> = {};
        for (const row of data as { school_match_id: string; aid_offer_amount: number }[]) {
          map[row.school_match_id] = row.aid_offer_amount;
        }
        setAidOffers(map);
      }
    }
    loadAidOffers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Family reactions left on the shared read-only view (Section 9b) --
  // matchId -> most recent reaction/comment. RLS on shared_list_reactions
  // (migration_060) scopes this read to matches this student actually owns,
  // so no extra filtering is needed client-side.
  const [familyReactions, setFamilyReactions] = useState<Record<string, { reaction: "up" | "down" | null; comment: string | null }>>({});

  useEffect(() => {
    async function loadFamilyReactions() {
      const ids = matches.map((m) => m.id);
      if (ids.length === 0) return;
      const { data, error } = await supabase
        .from("shared_list_reactions")
        .select("school_match_id, reaction, comment, created_at")
        .in("school_match_id", ids)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("loadFamilyReactions query failed:", error);
        return;
      }
      const map: Record<string, { reaction: "up" | "down" | null; comment: string | null }> = {};
      for (const row of data ?? []) {
        if (!map[row.school_match_id]) {
          map[row.school_match_id] = { reaction: row.reaction, comment: row.comment };
        }
      }
      setFamilyReactions(map);
    }
    loadFamilyReactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  // Appeal modal open/closed
  const [appealMatchId, setAppealMatchId] = useState<string | null>(null);

  // Two-step generate flow: a confirm prompt first ("are you ready?"); "yes"
  // navigates to the dedicated /matches/prep flow (mini-onboarding fields +
  // optional feedback, full-screen like the primary onboarding) rather than
  // dropping the questions inline on this page.
  const [showConfirm, setShowConfirm] = useState(false);

  // Regenerate replaces the whole list server-side with no visibility into
  // what changed. Snapshot the pre-regenerate list to sessionStorage before
  // navigating to /matches/prep, then diff against it once on the way back.
  // The lazy initializer only reads/parses (no mutation), so it's harmless if
  // React invokes it twice (Strict Mode does, in dev) -- reading the same key
  // twice returns the same value. The sessionStorage cleanup is a separate
  // effect with no setState call, so it can't trigger a render cascade and
  // double-invoking it is a no-op (removing an already-removed key).
  const [regenerateDiff] = useState<{ added: string[]; removed: string[] } | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(REGENERATE_SNAPSHOT_KEY);
    if (!raw) return null;
    try {
      const before: string[] = JSON.parse(raw);
      const afterNames = new Set(initialMatches.map((m) => m.school_name));
      const beforeNames = new Set(before);
      const added = initialMatches.map((m) => m.school_name).filter((name) => !beforeNames.has(name));
      const removed = before.filter((name) => !afterNames.has(name));
      return added.length || removed.length ? { added, removed } : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    sessionStorage.removeItem(REGENERATE_SNAPSHOT_KEY);
  }, []);
  const [dismissedDiff, setDismissedDiff] = useState(false);
  const [syncingTimeline, setSyncingTimeline] = useState(false);
  const [timelineSynced, setTimelineSynced] = useState(false);
  const [restoringSchool, setRestoringSchool] = useState<string | null>(null);
  const [restoredSchools, setRestoredSchools] = useState<Record<string, boolean>>({});

  // Regenerate never deletes a school's row -- api/matches/generate/route.ts
  // sets is_active: false on every prior row before inserting new active
  // ones, so the removed school's real category/percentage/why_text/factors
  // are still sitting in the table. Undo just reactivates the most recent
  // one instead of re-inserting a fresh row that would lose that reasoning.
  async function restoreRemovedSchool(name: string) {
    setRestoringSchool(name);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRestoringSchool(null);
      return;
    }
    const { data: priorRow } = await supabase
      .from("school_matches")
      .select("id")
      .eq("user_id", user.id)
      .eq("school_name", name)
      .eq("is_active", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (priorRow) {
      const { error } = await supabase.from("school_matches").update({ is_active: true }).eq("id", priorRow.id);
      if (!error) {
        setRestoredSchools((p) => ({ ...p, [name]: true }));
        router.refresh();
      }
    }
    setRestoringSchool(null);
  }

  // "Sync timeline" for the removed side of the diff: an item tagged only to
  // removed schools no longer applies, so delete it; an item tagged to a mix
  // of removed and still-current schools just has the removed names dropped
  // from school_tags rather than losing the whole item. Added schools aren't
  // handled here -- generating real deadlines for them needs the AI route,
  // so that side just links to /timeline/prep to regenerate.
  async function syncTimelineToRemovedSchools() {
    if (!regenerateDiff || regenerateDiff.removed.length === 0) return;
    setSyncingTimeline(true);
    const removedSet = new Set(regenerateDiff.removed);
    const { data: items } = await supabase
      .from("timeline_items")
      .select("id, school_tags")
      .eq("completed", false)
      .not("school_tags", "is", null);
    for (const item of items ?? []) {
      const tags: string[] = item.school_tags ?? [];
      if (tags.length === 0 || !tags.some((t) => removedSet.has(t))) continue;
      const remaining = tags.filter((t) => !removedSet.has(t));
      if (remaining.length === 0) {
        await supabase.from("timeline_items").delete().eq("id", item.id);
      } else {
        await supabase.from("timeline_items").update({ school_tags: remaining }).eq("id", item.id);
      }
    }
    setSyncingTimeline(false);
    setTimelineSynced(true);
  }

  // Set by MatchesPrepClient when the generate API reports a category that
  // never produced a usable list after retries -- distinct from the
  // heuristic "no safety schools" banner below, which can't tell "the model
  // judged you don't need one" apart from "generation actually failed." Same
  // read-only-lazy-initializer / cleanup-in-effect split as regenerateDiff
  // above, for the same reason.
  const [failedCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem("kairos_matches_failed_categories");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    sessionStorage.removeItem("kairos_matches_failed_categories");
  }, []);
  const [dismissedFailedCategories, setDismissedFailedCategories] = useState(false);

  // Onboarding kicks off generation itself, but that call can take up to ~50s
  // and is abandoned if the user closes the tab before it finishes — leaving
  // a saved profile with zero matches. Rather than making the user notice
  // that and hunt for "Generate List", auto-open the confirm step the moment
  // they land here with an empty list (rather than silently auto-firing
  // generation, which skipped the mini-onboarding step entirely).
  const autoTriggered = useRef(false);
  const wasEmptyOnFirstLoad = useRef(matches.length === 0);
  useEffect(() => {
    if (matches.length === 0 && !autoTriggered.current && (isPremium || remaining !== 0)) {
      autoTriggered.current = true;
      setShowConfirm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Funnel instrumentation (Phase 3 Section 1): fires once, the first time a
  // previously-empty match list becomes non-empty -- i.e. "reached a first
  // real match," the metric the onboarding-restructure acceptance criteria
  // depend on being measurable.
  const firstMatchTracked = useRef(false);
  useEffect(() => {
    if (wasEmptyOnFirstLoad.current && matches.length > 0 && !firstMatchTracked.current) {
      firstMatchTracked.current = true;
      track("first_match_generated", { match_count: matches.length });
    }
  }, [matches.length]);

  async function handleRemove(id: string) {
    await supabase.from("school_matches").update({ is_active: false }).eq("id", id);
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }

  async function toggleLock(id: string, currentlyLocked: boolean) {
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, locked: !currentlyLocked } : m)));
    const { error } = await supabase.from("school_matches").update({ locked: !currentlyLocked }).eq("id", id);
    if (error) setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, locked: currentlyLocked } : m)));
  }

  async function handleAddSchool() {
    if (!newSchoolName.trim()) return;
    setAdding(true);
    setAddError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAdding(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("school_matches")
      .insert({
        user_id: user.id,
        school_name: newSchoolName.trim(),
        category: newSchoolCategory,
        percentage: 50,
        why_text: "Added manually by you.",
        factors: {
          gpa_comparison: MANUAL_NOTE,
          course_rigor: MANUAL_NOTE,
          ec_strength: MANUAL_NOTE,
          major_fit: MANUAL_NOTE,
          social_fit: MANUAL_NOTE,
        },
        is_active: true,
        is_manual: true,
      })
      .select()
      .single();

    if (insertError || !data) {
      setAddError("Failed to add school. Please try again.");
      setAdding(false);
      return;
    }

    setMatches((prev) => [...prev, data as Match].sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]));
    setNewSchoolName("");
    setNewSchoolCategory("target");
    setAdding(false);
  }

  function handleExportPdf() {
    downloadCollegeListPdf(
      matches.map((m) => ({
        school_name: m.school_name,
        category: m.category,
        percentage: m.percentage,
        why_text: m.why_text,
        is_manual: m.is_manual,
      })),
      studentName
    );
    track("college_list_pdf_exported", { match_count: matches.length });
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <p className="text-text-gray text-xs mb-3">
        Tap any card to see the school&apos;s info, percentage breakdown, and career path.
      </p>

      <div className="flex items-center justify-between mb-3 mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirm((v) => !v)}
            disabled={!isPremium && remaining === 0}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {matches.length === 0 ? "Generate List" : "Regenerate List"}
          </button>
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-4 py-2 transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
          {matches.length > 0 && (
            <button
              onClick={handleExportPdf}
              className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-4 py-2 transition-colors"
            >
              Export as PDF
            </button>
          )}
          {matches.length > 1 && (
            <button
              onClick={() => {
                setCompareMode((c) => !c);
                setCompareSelection([]);
              }}
              className={`rounded-xl border text-sm font-medium px-4 py-2 transition-colors ${
                compareMode ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
              }`}
            >
              {compareMode ? "Done comparing" : "Compare"}
            </button>
          )}
        </div>
        <span className="text-text-gray text-xs">
          {isPremium ? "Unlimited regenerations" : `${remaining} regeneration${remaining === 1 ? "" : "s"} left this week`}
        </span>
      </div>

      {compareMode && (
        <div className="mb-6">
          <div className="bg-card border border-border rounded-2xl p-4 mb-4">
            <p className="text-text text-sm font-medium mb-3">Pick 2–3 schools to compare</p>
            <div className="flex flex-wrap gap-2">
              {matches.map((m) => {
                const isSelected = compareSelection.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleCompareSchool(m.id)}
                    disabled={!isSelected && compareSelection.length >= MAX_COMPARE}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isSelected ? "bg-primary text-bg" : "bg-bg border border-border text-text-gray hover:text-text"
                    }`}
                  >
                    {m.school_name}
                  </button>
                );
              })}
            </div>
          </div>

          {compareSelection.length >= 2 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {compareSelection.map((id) => {
                const m = matches.find((x) => x.id === id);
                if (!m) return null;
                return (
                  <div key={id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <div>
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2 capitalize ${CATEGORY_STYLES[m.category]}`}
                      >
                        {m.category}
                      </span>
                      <p className="font-serif text-text">{m.school_name}</p>
                    </div>
                    <p className="font-serif text-2xl text-primary">{m.percentage}%</p>
                    <p className="text-text-gray text-sm leading-relaxed">
                      {m.is_manual ? "Added manually — no AI assessment available." : m.why_text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-text text-sm mb-3">Are you ready to generate accurate college matches?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-xl border border-border text-text-gray hover:text-text text-sm px-3 py-1.5 transition-colors"
            >
              Not yet
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem(REGENERATE_SNAPSHOT_KEY, JSON.stringify(matches.map((m) => m.school_name)));
                router.push("/matches/prep");
              }}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-1.5"
            >
              Yes, let&apos;s go
            </button>
          </div>
        </div>
      )}

      {failedCategories.length > 0 && !dismissedFailedCategories && (
        <div className="mb-6 rounded-xl border border-red/30 bg-red-tint px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-text">
              <span className="font-medium">
                We couldn&apos;t generate {failedCategories.join(" or ")}-tier matches this time.
              </span>{" "}
              This isn&apos;t the same as not needing one — tap Regenerate to try again.
            </p>
            <button
              onClick={() => setDismissedFailedCategories(true)}
              className="text-text-gray hover:text-text text-xs px-2 shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {regenerateDiff && !dismissedDiff && (
        <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm space-y-1">
              <p className="text-text font-medium">Your list changed</p>
              {regenerateDiff.added.length > 0 && (
                <p className="text-text-gray">
                  <span className="text-green">Added:</span> {regenerateDiff.added.join(", ")}
                </p>
              )}
              {regenerateDiff.removed.length > 0 && (
                <div className="text-text-gray">
                  <span className="text-red">Removed:</span>{" "}
                  {regenerateDiff.removed.map((name, i) => (
                    <span key={name}>
                      {i > 0 && ", "}
                      {name}
                      {restoredSchools[name] ? (
                        <span className="text-green text-xs"> (restored ✓)</span>
                      ) : (
                        <button
                          onClick={() => restoreRemovedSchool(name)}
                          disabled={restoringSchool === name}
                          className="text-primary hover:text-primary-hover text-xs ml-1 disabled:opacity-40"
                        >
                          {restoringSchool === name ? "Restoring…" : "(restore)"}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {regenerateDiff.added.length > 0 && (
                <p className="text-text-gray text-xs">
                  Want deadlines for the new school{regenerateDiff.added.length > 1 ? "s" : ""}?{" "}
                  <Link href="/timeline/prep" className="text-primary hover:text-primary-hover">
                    Regenerate your timeline →
                  </Link>
                </p>
              )}
              {regenerateDiff.removed.length > 0 && (
                <div>
                  {timelineSynced ? (
                    <p className="text-text-gray text-xs">Timeline synced to your new list ✓</p>
                  ) : (
                    <button
                      onClick={syncTimelineToRemovedSchools}
                      disabled={syncingTimeline}
                      className="text-primary hover:text-primary-hover text-xs disabled:opacity-40"
                    >
                      {syncingTimeline ? "Syncing…" : "Sync timeline to remove dropped schools' deadlines"}
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setDismissedDiff(true)}
              className="text-text-gray hover:text-text text-xs px-2 shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {appealMatchId && (
        <AidAppealModal
          matchId={appealMatchId}
          matches={matches}
          aidOffers={aidOffers}
          onClose={() => setAppealMatchId(null)}
        />
      )}

      {matches.length > 0 && (() => {
        const counts = { reach: 0, target: 0, safety: 0 };
        for (const m of matches) counts[m.category] = (counts[m.category] ?? 0) + 1;
        // A category already flagged above as a known generation failure gets
        // its own more accurate banner -- don't also show the heuristic
        // "no schools in this tier" advisory, which reads as if nothing was
        // wrong with generation.
        if (counts.safety === 0 && !failedCategories.includes("safety")) {
          return (
            <div className="bg-amber-tint border border-amber/30 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
              <span className="text-amber text-lg leading-none mt-0.5">!</span>
              <p className="text-text-gray text-sm">
                <span className="text-text font-medium">Your list has no safety schools.</span>{" "}
                Add 1–2 schools where your GPA and test scores are comfortably above the typical admitted range to balance your list.
              </p>
            </div>
          );
        }
        if (counts.reach === 0 && !failedCategories.includes("reach")) {
          return (
            <div className="bg-card border border-border rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
              <span className="text-text-gray text-lg leading-none mt-0.5">!</span>
              <p className="text-text-gray text-sm">
                <span className="text-text font-medium">Your list has no reach schools.</span>{" "}
                Consider adding 1-2 selective schools: a strong application deserves at least a few ambitious choices.
              </p>
            </div>
          );
        }
        const total = matches.length;
        if (counts.safety / total < 0.15 && total >= 6 && !failedCategories.includes("safety")) {
          return (
            <div className="bg-amber-tint border border-amber/30 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
              <span className="text-amber text-lg leading-none mt-0.5">!</span>
              <p className="text-text-gray text-sm">
                <span className="text-text font-medium">Your list is light on safety schools.</span>{" "}
                Aim for at least 2 safety schools ({counts.safety} of {total} currently) so you have a strong fallback option.
              </p>
            </div>
          );
        }
        return null;
      })()}

      {editing && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
          <p className="text-text text-sm font-medium">Add a school</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="School name"
              placeholder="School name"
              value={newSchoolName}
              onChange={(e) => setNewSchoolName(e.target.value)}
              className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
            <select
              aria-label="School category"
              value={newSchoolCategory}
              onChange={(e) => setNewSchoolCategory(e.target.value as Category)}
              className="rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddSchool}
              disabled={adding || !newSchoolName.trim()}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2.5 disabled:opacity-40"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {addError && <p role="alert" className="text-red text-sm">{addError}</p>}
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {matches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE } }}
              transition={{ duration: 0.4, ease: EASE, delay: reduceMotion ? 0 : i * 0.06 }}
              className="bg-card border border-border rounded-2xl p-5 relative hover:border-text-gray/40 hover:-translate-y-0.5 transition-all"
            >
              {editingSchoolId !== m.id && (
                <Link href={`/schools/${m.id}`} className="absolute inset-0 rounded-2xl" aria-label={`View ${m.school_name} details`} />
              )}

              {editing ? (
                <div className="absolute top-3 right-3 z-10 flex gap-1">
                  {m.is_manual && (
                    <button
                      onClick={() => startEditSchool(m)}
                      className="text-text-gray hover:text-primary text-xs px-2.5 py-2 rounded-lg transition-colors"
                      aria-label={`Edit ${m.school_name}`}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => toggleLock(m.id, m.locked)}
                    className={`text-xs px-2.5 py-2 rounded-lg transition-colors ${m.locked ? "text-primary hover:text-primary-hover" : "text-text-gray hover:text-primary"}`}
                    aria-label={m.locked ? `Unlock ${m.school_name}` : `Lock ${m.school_name}`}
                  >
                    {m.locked ? "Locked 🔒" : "Lock"}
                  </button>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-text-gray hover:text-red text-xs px-2.5 py-2 rounded-lg transition-colors"
                    aria-label="Remove school"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                  {m.locked && (
                    <span className="text-primary text-xs px-2 py-1" aria-label={`${m.school_name} is locked`}>
                      🔒
                    </span>
                  )}
                  {aidOffers[m.id] !== undefined && Object.keys(aidOffers).length >= 2 && (
                    <button
                      onClick={() => setAppealMatchId(m.id)}
                      className="text-primary hover:text-primary-hover text-xs px-2.5 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60 transition-colors whitespace-nowrap"
                      aria-label={`Draft aid appeal letter for ${m.school_name}`}
                    >
                      Appeal aid
                    </button>
                  )}
                </div>
              )}

              {editingSchoolId === m.id ? (
                <div className="pr-24">
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      type="text"
                      aria-label="School name"
                      value={editSchoolName}
                      onChange={(e) => setEditSchoolName(e.target.value)}
                      className="flex-1 rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary"
                    />
                    <select
                      aria-label="School category"
                      value={editSchoolCategory}
                      onChange={(e) => setEditSchoolCategory(e.target.value as Category)}
                      className="rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary capitalize"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="capitalize">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEditSchool}
                      disabled={savingEdit || !editSchoolName.trim()}
                      className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-xs font-medium px-3 py-2 disabled:opacity-40"
                    >
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingSchoolId(null)}
                      className="text-text-gray hover:text-text text-xs px-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pointer-events-none">
                  <div className="flex items-start justify-between mb-2 pr-24">
                    <div className="flex items-start gap-3">
                      {photos[m.id] ? (
                        <img
                          src={photos[m.id]!.imageUrl}
                          alt=""
                          className="size-11 rounded-xl object-cover border border-border shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        // Deliberately distinct from the real-photo treatment above (dashed border,
                        // dimmer secondary-tint fill) so a school with no photo reads as "no photo
                        // available for this school" rather than looking like a broken image load
                        // next to schools that do have one.
                        <div className="size-11 rounded-xl bg-secondary-tint border border-dashed border-border flex items-center justify-center shrink-0">
                          <span className="font-serif text-sm text-secondary">{m.school_name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <span
                          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2 capitalize ${CATEGORY_STYLES[m.category]}`}
                        >
                          {m.category}
                        </span>
                        <p className="font-serif text-lg text-text">{m.school_name}</p>
                      </div>
                    </div>
                    <CountUp value={m.percentage} suffix="%" className="font-serif text-2xl text-primary shrink-0" />
                  </div>

                  <p className="text-text-gray text-sm">{m.why_text}</p>
                  {familyReactions[m.id] && (familyReactions[m.id].reaction || familyReactions[m.id].comment) && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs">
                      {familyReactions[m.id].reaction && (
                        <span aria-hidden="true">{familyReactions[m.id].reaction === "up" ? "👍" : "👎"}</span>
                      )}
                      <span className="text-text-gray">
                        <span className="font-medium">Family note:</span>{" "}
                        {familyReactions[m.id].comment ?? (familyReactions[m.id].reaction === "up" ? "They like this one." : "They're not sure about this one.")}
                      </span>
                    </div>
                  )}
                  {!m.is_manual && (
                    <p className="text-text-gray/70 text-xs mt-2">
                      Based on your GPA, course rigor, ECs, major &amp; social fit —{" "}
                      <Link href="/methodology" className="underline underline-offset-2 hover:text-text-gray pointer-events-auto">
                        how this is calculated
                      </Link>
                      {m.confidence && ` · ${CONFIDENCE_LABEL[m.confidence]}`}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {matches.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 max-w-xs mx-auto">
            <MatchesEmptyArt />
            <p className="text-text-gray text-sm text-center">No active matches. Tap &quot;Regenerate List&quot; to build one.</p>
          </div>
        )}
      </div>

      <p className="text-text-gray text-xs mt-6">
        AI-generated estimates based on your profile and general acceptance data, not a
        guarantee of admission.{" "}
        <Link href="/methodology" className="underline underline-offset-2 hover:text-text transition-colors">
          How is this calculated?
        </Link>
      </p>
    </div>
  );
}
