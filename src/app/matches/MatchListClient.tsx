"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import GenerationProgress from "@/components/GenerationProgress";
import CountUp from "@/components/CountUp";
import { track } from "@/lib/analytics";
import ShareChancesCard from "@/components/ShareChancesCard";
import OutcomeLogModal from "./OutcomeLogModal";
import LociModal from "./LociModal";
import AidAppealModal from "./AidAppealModal";
import { getMissingFields, type CompletenessProfile } from "@/lib/profile-completeness";
import MissingFieldInputs, { FIELD_LABELS, INLINE_TEXT_FIELDS } from "@/components/MissingFieldInputs";

const EASE = [0.16, 1, 0.3, 1] as const;

type Category = "reach" | "target" | "safety";

interface Match {
  id: string;
  school_name: string;
  category: Category;
  percentage: number;
  why_text: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

const CATEGORY_ORDER: Record<Category, number> = { reach: 0, target: 1, safety: 2 };
const CATEGORIES: Category[] = ["reach", "target", "safety"];

const MANUAL_NOTE = "This school was added manually, so an AI assessment isn't available.";

export default function MatchListClient({
  initialMatches,
  remaining,
  isPremium,
  profile,
}: {
  initialMatches: Match[];
  remaining: number | null;
  isPremium: boolean;
  profile: CompletenessProfile;
}) {
  const router = useRouter();
  const supabase = createClient();
  const reduceMotion = useReducedMotion();
  const [matches, setMatches] = useState(initialMatches);
  const [regenerating, setRegenerating] = useState(false);
  const [prevInitialMatches, setPrevInitialMatches] = useState(initialMatches);
  if (initialMatches !== prevInitialMatches) {
    setPrevInitialMatches(initialMatches);
    setMatches(initialMatches);
    setRegenerating(false);
  }
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCategory, setNewSchoolCategory] = useState<Category>("target");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Share card state
  const [shareMatch, setShareMatch] = useState<Match | null>(null);

  // Outcome modal open/closed — decision is tracked here because card labels read it
  const [outcomeMatchId, setOutcomeMatchId] = useState<string | null>(null);
  const [outcomeSaved, setOutcomeSaved] = useState<Record<string, string>>({});

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

  // Appeal and LOCI modal open/closed
  const [appealMatchId, setAppealMatchId] = useState<string | null>(null);
  const [lociMatchId, setLociMatchId] = useState<string | null>(null);

  // Optional freeform steer for regeneration ("what are you looking for") —
  // deliberately optional, never required to regenerate.
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Mini-onboarding fields relevant to matches specifically, woven into this
  // same pre-generate panel rather than a separate pop-up modal.
  const missingFields = getMissingFields(profile, "matches");
  const inlineMissing = missingFields.filter((f) => INLINE_TEXT_FIELDS.includes(f));
  const linkOutMissing = missingFields.filter((f) => !INLINE_TEXT_FIELDS.includes(f));
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  async function saveMissingFields() {
    const patch: Record<string, string> = {};
    for (const field of inlineMissing) {
      if (fieldValues[field]?.trim()) patch[field] = fieldValues[field].trim();
    }
    if (Object.keys(patch).length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update(patch).eq("user_id", user.id);
  }

  async function handleRegenerate(feedbackText?: string) {
    setRegenerating(true);
    setError(null);
    // The server route is capped at maxDuration=60s, but that cap isn't
    // enforced locally and an abrupt platform kill doesn't always reach the
    // client as a clean rejection -- without a client-side bound, a hang
    // leaves the spinner running forever with no way to recover. 65s gives
    // the server's own cap a moment to win first under normal conditions.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      const res = await fetch("/api/matches/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText?.trim() || undefined }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to regenerate. Please try again.");
        setRegenerating(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "This is taking longer than expected. Please try again."
          : "Failed to regenerate. Please try again."
      );
      setRegenerating(false);
    } finally {
      clearTimeout(timeout);
    }
  }

  // Onboarding kicks off generation itself, but that call can take up to ~50s
  // and is abandoned if the user closes the tab before it finishes — leaving
  // a saved profile with zero matches. Rather than making the user notice
  // that and hunt for "Regenerate List", auto-open the pre-generate panel the
  // moment they land here with an empty list (rather than silently auto-firing
  // generation, which skipped the mini-onboarding step entirely).
  const autoTriggered = useRef(false);
  const wasEmptyOnFirstLoad = useRef(matches.length === 0);
  useEffect(() => {
    if (matches.length === 0 && !autoTriggered.current && (isPremium || remaining !== 0)) {
      autoTriggered.current = true;
      setShowFeedback(true);
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

  if (regenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        <p role="status" className="font-serif text-2xl text-text mb-2 animate-pulse">Building your personalized list...</p>
        <p className="text-text-gray text-sm">Hang tight while we re-match you against real schools.</p>
        <GenerationProgress />
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <p className="text-text-gray text-xs mb-3">
        Tap any card to see the school&apos;s info, percentage breakdown, and career path.
      </p>

      <div className="flex items-center justify-between mb-3 mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFeedback((v) => !v)}
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

      {showFeedback && (
        <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3 space-y-3">
          {inlineMissing.length > 0 && (
            <div>
              <p className="text-xs text-text-gray mb-2">
                A few more details help your matches be more accurate — optional.
              </p>
              <MissingFieldInputs
                fields={inlineMissing}
                values={fieldValues}
                onChange={(field, value) => setFieldValues((v) => ({ ...v, [field]: value }))}
              />
            </div>
          )}
          {linkOutMissing.length > 0 && (
            <p className="text-xs text-text-gray">
              Also missing:{" "}
              <Link href="/profile?edit=true" className="text-primary hover:underline">
                {linkOutMissing.map((f) => FIELD_LABELS[f]).join(", ")}
              </Link>
            </p>
          )}
          <div>
            <label className="block text-xs text-text-gray mb-1.5">
              What are you looking for? <span className="text-text-gray/70">— optional</span>
            </label>
            <textarea
              className="w-full rounded-xl bg-bg border border-border text-text text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-gray"
              rows={2}
              maxLength={1000}
              placeholder="e.g. more schools on the West Coast, or a bigger reach list"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowFeedback(false); setFeedback(""); handleRegenerate(); }}
              className="rounded-xl border border-border text-text-gray hover:text-text text-sm px-3 py-1.5 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={async () => { setShowFeedback(false); await saveMissingFields(); handleRegenerate(feedback); }}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-1.5"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-red text-sm mb-4">{error}</p>}

      {shareMatch && (
        <ShareChancesCard
          data={{ schoolName: shareMatch.school_name, percentage: shareMatch.percentage, category: shareMatch.category }}
          onClose={() => setShareMatch(null)}
        />
      )}

      {outcomeMatchId && (
        <OutcomeLogModal
          matchId={outcomeMatchId}
          onClose={() => setOutcomeMatchId(null)}
          onSaved={(id, decision, aidAmount) => {
            setOutcomeSaved((prev) => ({ ...prev, [id]: decision }));
            if (aidAmount !== "") {
              setAidOffers((prev) => ({ ...prev, [id]: parseFloat(aidAmount) }));
            }
            setOutcomeMatchId(null);
          }}
        />
      )}

      {appealMatchId && (
        <AidAppealModal
          matchId={appealMatchId}
          matches={matches}
          aidOffers={aidOffers}
          onClose={() => setAppealMatchId(null)}
        />
      )}

      {lociMatchId && (
        <LociModal
          matchId={lociMatchId}
          onClose={() => setLociMatchId(null)}
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
                Consider adding 1–2 selective schools — a strong application deserves at least a few ambitious choices.
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
              <Link href={`/schools/${m.id}`} className="absolute inset-0 rounded-2xl" aria-label={`View ${m.school_name} details`} />

              {editing ? (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="absolute top-3 right-3 z-10 text-text-gray hover:text-red text-xs px-2.5 py-2 rounded-lg transition-colors"
                  aria-label="Remove school"
                >
                  Remove
                </button>
              ) : (
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                  <button
                    onClick={() => setOutcomeMatchId(m.id)}
                    className="text-text-gray hover:text-text text-xs px-2.5 py-2 rounded-lg border border-transparent hover:border-border transition-colors"
                    aria-label={`Log decision for ${m.school_name}`}
                  >
                    {outcomeSaved[m.id] ? `✓ ${outcomeSaved[m.id]}` : "Log decision"}
                  </button>
                  {(outcomeSaved[m.id] === "waitlist" || outcomeSaved[m.id] === "defer") && (
                    <button
                      onClick={() => setLociMatchId(m.id)}
                      className="text-primary hover:text-primary-hover text-xs px-2.5 py-1.5 rounded-lg border border-primary/30 hover:border-primary/60 transition-colors whitespace-nowrap"
                      aria-label={`Draft letter of continued interest for ${m.school_name}`}
                    >
                      Draft LOCI
                    </button>
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
                  {(m.category === "target" || m.category === "safety") && (
                    <button
                      onClick={() => setShareMatch(m)}
                      className="text-text-gray hover:text-text text-xs px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border transition-colors whitespace-nowrap"
                      aria-label={`Share chances card for ${m.school_name}`}
                    >
                      Share
                    </button>
                  )}
                </div>
              )}

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
              </div>
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
