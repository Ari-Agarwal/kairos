"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { crossFeatureWhyText } from "@/lib/cross-feature-why";
import CrossFeatureToast from "@/components/CrossFeatureToast";
import { CrisisResourceBanner, type CrisisResource } from "@/components/CrisisResourceBanner";

const EASE = [0.16, 1, 0.3, 1] as const;

const QUESTIONS = [
  {
    key: "moment",
    label: "Describe one specific moment when an interest or value became real for you.",
    placeholder: "Not \"I've always loved robotics\" — a specific scene: where you were, what happened, what you noticed.",
  },
  {
    key: "revealed",
    label: "What did that moment reveal about what you actually care about?",
    placeholder: "In your own words — not a trait like \"hardworking,\" but the reason behind what you did.",
  },
  {
    key: "pattern",
    label: "Where does that same value or way of thinking show up again, somewhere different?",
    placeholder: "A different activity, class, or part of your life where the same pattern repeats.",
  },
  {
    key: "struggle",
    label: "Describe a real struggle or setback, and what changed afterward.",
    placeholder: "Doesn't need to be dramatic — an intellectual or interpersonal struggle counts.",
  },
  {
    key: "differentiator",
    label: "What do you do differently from others who share this interest?",
    placeholder: "What's your specific angle on it that another applicant with the same interest wouldn't have?",
  },
  {
    key: "direction",
    label: "Where do you want to take this? How does it connect to your intended major or future direction?",
    placeholder: "Tie it forward, not just backward — what you want to do with it next.",
  },
] as const;

type QuestionKey = (typeof QUESTIONS)[number]["key"];
type Answers = Record<QuestionKey, string>;

interface EssayAngle {
  title: string;
  framing: string;
}

interface NarrativeSynthesis {
  throughline: string;
  core_values: string[];
  growth_arc: string;
  differentiator: string;
  essay_angles: EssayAngle[];
  gaps: string[];
  suggested_activities: string[];
  crisis_resource?: CrisisResource | null;
}

const EMPTY_ANSWERS: Answers = {
  moment: "",
  revealed: "",
  pattern: "",
  struggle: "",
  differentiator: "",
  direction: "",
};

export default function NarrativeBuilderClient({
  initial,
  flaggedActivity,
  seed,
}: {
  initial: (NarrativeSynthesis & { answers: Answers }) | null;
  flaggedActivity: { activity: string; note: string } | null;
  seed: { key: string; text: string } | null;
}) {
  const validSeed =
    seed && !initial && (QUESTIONS as readonly { key: string }[]).some((q) => q.key === seed.key) ? seed : null;
  const supabase = createClient();
  const reduceMotion = useReducedMotion();
  const [addedAngles, setAddedAngles] = useState<Record<number, boolean>>({});
  const [showTimelineToast, setShowTimelineToast] = useState(false);
  const [addingAngle, setAddingAngle] = useState<number | null>(null);
  const [addedActivities, setAddedActivities] = useState<Record<number, boolean>>({});
  const [dismissedActivities, setDismissedActivities] = useState<Record<number, boolean>>({});
  const [addingActivity, setAddingActivity] = useState<number | null>(null);

  async function addSuggestedActivity(index: number, activity: string) {
    setAddingActivity(index);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAddingActivity(null);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("extracurriculars")
      .eq("user_id", user.id)
      .maybeSingle();
    const existing: string[] = profile?.extracurriculars ?? [];
    const { error } = await supabase
      .from("profiles")
      .update({ extracurriculars: [...existing, activity] })
      .eq("user_id", user.id);
    setAddingActivity(null);
    if (error) return;
    setAddedActivities((p) => ({ ...p, [index]: true }));
  }

  // Plain-text download, same Blob-URL pattern lib/ics.ts uses for calendar
  // exports -- no PDF library needed for a one-pager a student hands to a
  // real counselor or recommender to read/print themselves.
  function exportOnePager(synthesis: NarrativeSynthesis) {
    const lines = [
      "MY NARRATIVE — Kairos",
      "",
      "THROUGHLINE",
      synthesis.throughline,
      "",
      "CORE VALUES",
      ...synthesis.core_values.map((v) => `- ${v}`),
      "",
      "GROWTH ARC",
      synthesis.growth_arc,
      "",
      "WHAT SETS ME APART",
      synthesis.differentiator,
      "",
      "POSSIBLE ESSAY ANGLES",
      ...synthesis.essay_angles.flatMap((a) => [`- ${a.title}`, `  ${a.framing}`]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kairos-narrative-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function addAngleToTimeline(index: number, angle: EssayAngle) {
    setAddingAngle(index);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAddingAngle(null);
      return;
    }
    const { error } = await supabase.from("timeline_items").insert({
      user_id: user.id,
      title: `Draft essay angle: ${angle.title}`,
      due_date: null,
      school_tags: [],
      tier: "free",
      is_strategic: true,
      completed: false,
      why_text: crossFeatureWhyText("Narrative Builder throughline", angle.framing),
      what_to_do: ["Start a draft in Essay Feedback using this angle", "Get AI feedback and revise"],
    });
    setAddingAngle(null);
    if (error) return;
    setAddedAngles((p) => ({ ...p, [index]: true }));
    setShowTimelineToast(true);
  }
  const differentiatorIndex = QUESTIONS.findIndex((q) => q.key === "differentiator");
  const seedIndex = validSeed ? QUESTIONS.findIndex((q) => q.key === validSeed.key) : -1;
  const [step, setStep] = useState(
    validSeed ? seedIndex : !initial && flaggedActivity ? differentiatorIndex : 0
  );
  const [flaggedDismissed, setFlaggedDismissed] = useState(false);
  const [seedDismissed, setSeedDismissed] = useState(false);
  const [answers, setAnswers] = useState<Answers>(() => {
    const base = initial?.answers ?? EMPTY_ANSWERS;
    if (validSeed && !base[validSeed.key as QuestionKey]?.trim()) {
      return { ...base, [validSeed.key]: validSeed.text };
    }
    return base;
  });
  const [result, setResult] = useState<NarrativeSynthesis | null>(
    initial
      ? {
          throughline: initial.throughline,
          core_values: initial.core_values,
          growth_arc: initial.growth_arc,
          differentiator: initial.differentiator,
          essay_angles: initial.essay_angles,
          gaps: initial.gaps,
          suggested_activities: initial.suggested_activities,
        }
      : null
  );
  const [editing, setEditing] = useState(!initial);
  // Editing an existing result reopens a flat form of all 6 answers (not the
  // step-by-step wizard) so changing one answer doesn't mean re-walking the
  // whole flow -- the backend still has to re-run the full synthesis either
  // way, but the UX no longer forces a restart to get there.
  const [quickEdit, setQuickEdit] = useState(false);
  // Optional meta-feedback on the quick-edit regenerate path -- captures
  // "what was wrong with the last synthesis" even when the student hasn't
  // changed any of the six answers themselves (e.g. "too generic" or "lean
  // more into the leadership angle"), rather than only being able to steer a
  // new result by editing the raw inputs.
  const [regenFeedback, setRegenFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Celebratory moment (Software_Timeline.md sec. 15): fires once, the first
  // time a student ever completes the full synthesis -- not on regenerates,
  // and not again on later visits, so it stays a genuine one-time beat
  // rather than a repeated notification.
  const [justCelebrated, setJustCelebrated] = useState(false);

  const totalSteps = QUESTIONS.length;
  const current = QUESTIONS[step];
  const currentValue = answers[current.key];
  const hasAnyAnswer = Object.values(answers).some((v) => v.trim());

  async function handleSubmit(feedbackForRegen?: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/narrative/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, regenFeedback: feedbackForRegen?.trim() || undefined }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "We hit a snag putting your narrative together — try again in a moment.");
      setLoading(false);
      return;
    }

    const data: NarrativeSynthesis = await res.json();
    const isFirstEverSynthesis = !result;
    if (isFirstEverSynthesis) {
      let alreadyCelebrated = false;
      try {
        alreadyCelebrated = localStorage.getItem("kairos_narrative_celebrated") === "1";
        if (!alreadyCelebrated) localStorage.setItem("kairos_narrative_celebrated", "1");
      } catch {
        // localStorage unavailable -- skip celebration, not critical
      }
      if (!alreadyCelebrated) {
        setJustCelebrated(true);
        setTimeout(() => setJustCelebrated(false), 2400);
      }
    }
    setResult(data);
    setEditing(false);
    setQuickEdit(false);
    setRegenFeedback("");
    setLoading(false);
  }

  if (!editing && result && quickEdit) {
    return (
      <div>
        <p className="text-text-gray text-xs bg-secondary-tint border border-border rounded-xl px-4 py-2.5 mb-5">
          Change any answer below, then regenerate — no need to walk through each question again.
        </p>
        <div className="space-y-4 mb-4">
          {QUESTIONS.map((q) => (
            <div key={q.key} className="bg-card border border-border rounded-2xl p-5">
              <label htmlFor={`quick-${q.key}`} className="block text-text font-medium text-sm mb-2">
                {q.label}
              </label>
              <textarea
                id={`quick-${q.key}`}
                value={answers[q.key]}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                placeholder={q.placeholder}
                rows={3}
                maxLength={3000}
                className="w-full rounded-xl bg-bg border border-border text-text text-sm px-3 py-2.5 focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <label htmlFor="regen-feedback" className="block text-text font-medium text-sm mb-2">
            What should change about the synthesis? <span className="text-text-gray font-normal">(optional)</span>
          </label>
          <textarea
            id="regen-feedback"
            value={regenFeedback}
            onChange={(e) => setRegenFeedback(e.target.value)}
            placeholder="e.g. too generic, lean more into the leadership angle, the growth arc doesn't feel right"
            rows={2}
            maxLength={1000}
            className="w-full rounded-xl bg-bg border border-border text-text text-sm px-3 py-2.5 focus:ring-1 focus:ring-primary outline-none resize-none"
          />
        </div>
        {error && <p role="alert" className="text-red text-sm mb-4">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuickEdit(false)}
            disabled={loading}
            className="text-text-gray text-sm hover:text-text disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(regenFeedback)}
            disabled={loading || !hasAnyAnswer}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-2.5 disabled:opacity-50"
          >
            {loading ? <span role="status" aria-live="polite">Regenerating...</span> : "Regenerate"}
          </button>
        </div>
      </div>
    );
  }

  if (!editing && result) {
    return (
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <CrisisResourceBanner resource={result.crisis_resource} />
        {justCelebrated && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl border border-primary/30 bg-secondary-tint px-4 py-2.5 text-primary text-sm font-medium"
          >
            You did it — your narrative is complete.
          </motion.div>
        )}
        <div className="bg-card border border-border rounded-2xl p-6 mb-4">
          <p className="text-primary text-xs font-medium uppercase tracking-wide mb-2">Your throughline</p>
          <p className="font-serif text-xl text-text leading-snug">{result.throughline}</p>
        </div>

        {/* A single legible glance at how the pieces connect -- today throughline,
            core values, differentiator, and essay angles only exist as separate
            fields/cards a student has to mentally stitch together themselves. */}
        <div className="bg-secondary-tint border border-border rounded-2xl p-5 mb-4">
          <p className="text-text-gray text-xs font-medium uppercase tracking-wide mb-3">Your narrative map</p>
          <div className="flex flex-col items-stretch gap-0">
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-center">
              <p className="text-text-gray text-[10px] uppercase tracking-wide mb-0.5">Throughline</p>
              <p className="text-text text-sm font-serif leading-snug">{result.throughline}</p>
            </div>
            <div className="w-px h-4 bg-border self-center" />
            <div className="flex flex-wrap justify-center gap-2">
              {result.core_values.map((v, i) => (
                <span key={i} className="bg-card border border-border rounded-full px-3 py-1 text-text-gray text-xs">
                  {v}
                </span>
              ))}
            </div>
            <div className="w-px h-4 bg-border self-center" />
            <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-center">
              <p className="text-text-gray text-[10px] uppercase tracking-wide mb-0.5">Differentiator</p>
              <p className="text-text-gray text-sm leading-snug">{result.differentiator}</p>
            </div>
            {result.essay_angles.length > 0 && (
              <>
                <div className="w-px h-4 bg-border self-center" />
                <div className="flex flex-wrap justify-center gap-2">
                  {result.essay_angles.map((a, i) => (
                    <span key={i} className="bg-card border border-primary/30 rounded-full px-3 py-1 text-primary text-xs">
                      {a.title}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-text font-medium mb-2">Core values</p>
          <div className="flex flex-wrap gap-2">
            {result.core_values.map((v, i) => (
              <span key={i} className="text-sm text-text-gray bg-secondary-tint rounded-full px-3 py-1">
                {v}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-text font-medium mb-2">Growth arc</p>
          <p className="text-text-gray text-sm leading-relaxed">{result.growth_arc}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-text font-medium mb-2">What sets you apart</p>
          <p className="text-text-gray text-sm leading-relaxed">{result.differentiator}</p>
        </div>

        <div className="space-y-3 mb-4">
          <p className="text-text font-medium">Possible essay angles</p>
          {result.essay_angles.map((a, i) => (
            <motion.div
              key={i}
              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: reduceMotion ? 0 : i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <p className="text-primary text-sm font-medium mb-1">{a.title}</p>
              <p className="text-text-gray text-sm leading-relaxed mb-3">{a.framing}</p>
              <button
                onClick={() => addAngleToTimeline(i, a)}
                disabled={addedAngles[i] || addingAngle === i}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-gray hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addedAngles[i] ? "Added to timeline ✓" : addingAngle === i ? "Adding…" : "Add to timeline"}
              </button>
            </motion.div>
          ))}
        </div>

        {result.suggested_activities.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-text font-medium">Sounds like an activity worth tracking</p>
            {result.suggested_activities.map((activity, i) =>
              dismissedActivities[i] ? null : (
                <div key={i} className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-text-gray text-sm leading-relaxed mb-3">{activity}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => addSuggestedActivity(i, activity)}
                      disabled={addedActivities[i] || addingActivity === i}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border text-text-gray hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {addedActivities[i] ? "Added to activities ✓" : addingActivity === i ? "Adding…" : "Add to your activities?"}
                    </button>
                    {!addedActivities[i] && (
                      <button
                        onClick={() => setDismissedActivities((p) => ({ ...p, [i]: true }))}
                        className="text-xs text-text-gray hover:text-text"
                      >
                        No thanks
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {result.gaps.length > 0 && (
          <div className="bg-secondary-tint border border-border rounded-2xl p-4 mb-4">
            <p className="text-text-gray text-xs font-medium mb-1">Worth revisiting</p>
            <ul className="text-text-gray text-xs space-y-0.5">
              {result.gaps.map((g, i) => (
                <li key={i}>• {g}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button onClick={() => exportOnePager(result)} className="text-primary text-sm hover:text-primary-hover">
            Export one-pager
          </button>
          <button onClick={() => setQuickEdit(true)} className="text-primary text-sm hover:text-primary-hover">
            Edit an answer
          </button>
          <button
            onClick={() => {
              setEditing(true);
              setStep(0);
            }}
            className="text-text-gray text-sm hover:text-text"
          >
            Start over
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <CrossFeatureToast
        message="Added to your Timeline."
        show={showTimelineToast}
        onDone={() => setShowTimelineToast(false)}
      />
      <p className="text-text-gray text-xs bg-secondary-tint border border-border rounded-xl px-4 py-2.5 mb-5">
        Kairos helps you brainstorm and critique — you write the essay.
      </p>

      {validSeed && !seedDismissed && (
        <div className="bg-secondary-tint border border-border rounded-xl px-4 py-3 mb-5 flex items-start justify-between gap-3">
          <p className="text-text-gray text-xs leading-relaxed">
            Pulled in your mock interview answer for this question — edit it however you like.
          </p>
          <button onClick={() => setSeedDismissed(true)} className="text-text-gray hover:text-text text-xs shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {flaggedActivity && !flaggedDismissed && (
        <div className="bg-secondary-tint border border-border rounded-xl px-4 py-3 mb-5 flex items-start justify-between gap-3">
          <p className="text-text-gray text-xs leading-relaxed">
            You flagged <span className="text-text font-medium">{flaggedActivity.activity}</span> in Activity
            Evaluation ({flaggedActivity.note}). This question is a good place to work out what makes your take on
            it different from other applicants&apos;.
          </p>
          <button
            onClick={() => setFlaggedDismissed(true)}
            className="text-text-gray hover:text-text text-xs shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6">
        <div className="h-1.5 rounded-full bg-secondary-tint overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        </div>
        <p className="text-text-gray text-xs mt-1.5">
          Question {step + 1} of {totalSteps}
        </p>
      </div>

      {/* Previously an AnimatePresence with mode="wait" wrapped this: clicking
          Next/Skip faster than the exit transition could complete left the
          question text and textarea frozen on an earlier step while the
          progress counter kept advancing (framer-motion's exit-complete
          callback is what unmounts the old child, and rapid clicks -- or
          any environment where that callback doesn't fire promptly -- could
          desync it from `step`). A plain enter-only animation, keyed by
          `current.key`, removes that dependency entirely: React swaps the
          child the instant `step` changes, same as any normal render. */}
      <motion.div
        key={current.key}
        initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <div className="bg-card border border-border rounded-2xl p-6 mb-4">
          <label htmlFor={current.key} className="block text-text font-medium mb-3">
            {current.label}
          </label>
          <textarea
            id={current.key}
            value={currentValue}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [current.key]: e.target.value }))}
            placeholder={current.placeholder}
            rows={5}
            maxLength={3000}
            className="w-full rounded-xl bg-bg border border-border text-text text-sm px-3 py-2.5 focus:ring-1 focus:ring-primary outline-none resize-none"
          />
        </div>
      </motion.div>

      {error && (
        <p role="alert" className="text-red text-sm mb-4">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || loading}
          className="text-text-gray text-sm hover:text-text disabled:opacity-40"
        >
          Back
        </button>

        {step < totalSteps - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-2.5"
          >
            {currentValue.trim() ? "Next" : "Skip"}
          </button>
        ) : (
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !hasAnyAnswer}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-2.5 disabled:opacity-50"
          >
            {loading ? (
              <span role="status" className="inline-flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-bg ambient-star"
                  style={{ ["--twinkle-max" as string]: "1", ["--twinkle-duration" as string]: "1s" }}
                />
                Finding your throughline...
              </span>
            ) : (
              "Build my narrative"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
