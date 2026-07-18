"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import { track } from "@/lib/analytics";
import AidAppealModal from "./AidAppealModal";

const EASE = [0.16, 1, 0.3, 1] as const;

type Category = "reach" | "target" | "safety";

interface Match {
  id: string;
  school_name: string;
  category: Category;
  percentage: number;
  why_text: string;
  is_manual: boolean;
}

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

const CATEGORY_ORDER: Record<Category, number> = { reach: 0, target: 1, safety: 2 };
const CATEGORIES: Category[] = ["reach", "target", "safety"];

const MANUAL_NOTE = "This school was added manually, so an AI assessment isn't available.";
const REGENERATE_SNAPSHOT_KEY = "kairos_matches_regenerate_snapshot";

export default function MatchListClient({
  initialMatches,
  remaining,
  isPremium,
}: {
  initialMatches: Match[];
  remaining: number | null;
  isPremium: boolean;
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
  // Computed as a lazy initial state (not an effect) so there's no
  // setState-in-effect cascade -- this only ever needs to run once, on the
  // very first render after the snapshot was written.
  const [regenerateDiff] = useState<{ added: string[]; removed: string[] } | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(REGENERATE_SNAPSHOT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(REGENERATE_SNAPSHOT_KEY);
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
  const [dismissedDiff, setDismissedDiff] = useState(false);

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
        </div>
        <span className="text-text-gray text-xs">
          {isPremium ? "Unlimited regenerations" : `${remaining} regeneration${remaining === 1 ? "" : "s"} left this week`}
        </span>
      </div>

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
                <p className="text-text-gray">
                  <span className="text-red">Removed:</span> {regenerateDiff.removed.join(", ")}
                </p>
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
        if (counts.safety === 0) {
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
        if (counts.reach === 0) {
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
        if (counts.safety / total < 0.15 && total >= 6) {
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
                    onClick={() => handleRemove(m.id)}
                    className="text-text-gray hover:text-red text-xs px-2.5 py-2 rounded-lg transition-colors"
                    aria-label="Remove school"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
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
                    <div>
                      <span
                        className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2 capitalize ${CATEGORY_STYLES[m.category]}`}
                      >
                        {m.category}
                      </span>
                      <p className="font-serif text-lg text-text">{m.school_name}</p>
                    </div>
                    <CountUp value={m.percentage} suffix="%" className="font-serif text-2xl text-primary shrink-0" />
                  </div>

                  <p className="text-text-gray text-sm">{m.why_text}</p>
                  {!m.is_manual && (
                    <p className="text-text-gray/70 text-xs mt-2">
                      Based on your GPA, course rigor, ECs, major &amp; social fit —{" "}
                      <Link href="/methodology" className="underline underline-offset-2 hover:text-text-gray pointer-events-auto">
                        how this is calculated
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {matches.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12">
            <span className="h-1.5 w-1.5 rounded-full bg-text-gray/70 ambient-star" style={{ ["--twinkle-max" as string]: "0.9" }} />
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
