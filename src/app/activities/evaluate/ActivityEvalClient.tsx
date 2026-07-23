"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { HistoryEmptyArt } from "@/components/EmptyStateIllustration";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Suggestion {
  label: string;
  text: string;
}

interface PerActivity {
  activity: string;
  strength: string;
  note: string;
}

interface EvalResult {
  score: number;
  score_rationale: string;
  suggestions: Suggestion[];
  per_activity?: PerActivity[];
}

interface HistoryEntry {
  id: string;
  score: number;
  score_rationale: string;
  created_at: string;
}

const STRENGTH_STYLES: Record<string, string> = {
  strong: "bg-green-tint text-green",
  average: "bg-amber-tint text-amber-text-on-tint",
  weak: "bg-red-tint text-red",
};

export default function ActivityEvalClient({
  activities: initialActivities,
  activityHours: initialActivityHours,
}: {
  activities: string[];
  activityHours: Record<string, number>;
}) {
  const reduceMotion = useReducedMotion();
  const supabase = createClient();
  const [activities, setActivities] = useState(initialActivities.filter(Boolean));
  const [activityHours, setActivityHours] = useState<Record<string, number>>(initialActivityHours);
  const [editingList, setEditingList] = useState(false);
  const [draftActivities, setDraftActivities] = useState(activities.join("\n"));
  const [savingActivities, setSavingActivities] = useState(false);

  async function updateActivityHours(activity: string, hours: string) {
    const parsed = hours === "" ? null : Math.max(0, Math.min(168, Number(hours)));
    setActivityHours((prev) => {
      const next = { ...prev };
      if (parsed === null || Number.isNaN(parsed)) delete next[activity];
      else next[activity] = parsed;
      return next;
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = { ...activityHours };
    if (parsed === null || Number.isNaN(parsed)) delete next[activity];
    else next[activity] = parsed;
    await supabase.from("profiles").update({ activity_hours: next }).eq("user_id", user.id);
  }
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // No distinct regenerate action -- resubmitting the same form is the only
  // way to get a new evaluation, so this only appears once a result already
  // exists (i.e. this submit would be a redo). Cleared on successful submit,
  // not on every activities-list edit.
  const [regenFeedback, setRegenFeedback] = useState("");

  const activitiesText = activities
    .map((a) => (activityHours[a] ? `${a} (${activityHours[a]} hrs/week)` : a))
    .join("\n");
  const hasActivities = activitiesText.trim().length > 0;

  async function handleSaveActivities() {
    const next = draftActivities.split("\n").map((s) => s.trim()).filter(Boolean);
    setSavingActivities(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ extracurriculars: next }).eq("user_id", user.id);
    }
    setActivities(next);
    setSavingActivities(false);
    setEditingList(false);
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history !== null) return;
    setLoadingHistory(true);
    const res = await fetch("/api/activities/evaluate");
    if (res.ok) {
      const data = await res.json();
      setHistory(data.history ?? []);
    } else {
      setHistory([]);
    }
    setLoadingHistory(false);
  }

  async function handleSubmit() {
    if (!hasActivities) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/activities/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activitiesText, regenFeedback: regenFeedback.trim() || undefined }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "We hit a snag evaluating your activities — try again in a moment.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setResult(data);
    setLoading(false);
    setHistory(null);
    setRegenFeedback("");
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-text-gray text-xs">Your activities</p>
        <div className="flex gap-3">
          <button onClick={() => setEditingList((v) => !v)} className="text-primary text-xs hover:text-primary-hover">
            {editingList ? "Cancel" : "Edit list"}
          </button>
          <button onClick={toggleHistory} className="text-primary text-xs hover:text-primary-hover">
            {showHistory ? "Hide History" : "History"}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-2">
          {loadingHistory ? (
            <p className="text-text-gray text-sm">Loading history…</p>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-2">
              <HistoryEmptyArt />
              <p className="text-text-gray text-sm mt-1">No past evaluations yet.</p>
            </div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-text-gray text-xs">
                    {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-text-gray text-xs truncate">{h.score_rationale}</p>
                </div>
                <span className="font-serif text-lg text-primary shrink-0">{h.score}/10</span>
              </div>
            ))
          )}
        </div>
      )}

      {editingList ? (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <textarea
            value={draftActivities}
            onChange={(e) => setDraftActivities(e.target.value)}
            rows={8}
            aria-label="Edit activities, one per line"
            placeholder="One activity per line…"
            className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary resize-none mb-3"
          />
          <button
            onClick={handleSaveActivities}
            disabled={savingActivities}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {savingActivities ? "Saving..." : "Save activities"}
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          {hasActivities ? (
            <ul className="space-y-2">
              {activities.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-text-gray text-sm">
                  <span className="truncate">• {a}</span>
                  <label className="flex items-center gap-1.5 text-xs shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={168}
                      value={activityHours[a] ?? ""}
                      onChange={(e) => updateActivityHours(a, e.target.value)}
                      placeholder="0"
                      aria-label={`Hours per week for ${a}`}
                      className="w-14 rounded-lg bg-bg border border-border px-2 py-1 text-text text-xs outline-none focus:border-primary"
                    />
                    hrs/wk
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-gray text-sm">No activities yet. Use &quot;Edit list&quot; above to add some.</p>
          )}
        </div>
      )}

      {result && (
        <div className="mb-4">
          <label htmlFor="activity-regen-feedback" className="block text-text font-medium text-sm mb-2">
            What should change from the last evaluation? <span className="text-text-gray font-normal">(optional)</span>
          </label>
          <textarea
            id="activity-regen-feedback"
            value={regenFeedback}
            onChange={(e) => setRegenFeedback(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="e.g. the leadership score felt too harsh, missed my role in the second activity"
            className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-text text-sm outline-none focus:border-primary resize-none"
          />
        </div>
      )}

      <p className="text-text-gray text-xs mb-4">
        Your activity list is sent to our AI provider (Anthropic) to generate an evaluation.
      </p>

      <button
        onClick={handleSubmit}
        disabled={loading || !hasActivities}
        className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-2.5 disabled:opacity-50 mb-6"
      >
        {loading ? (
          <span role="status" className="inline-flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-bg ambient-star"
              style={{ ["--twinkle-max" as string]: "1", ["--twinkle-duration" as string]: "1s" }}
            />
            Evaluating your activities...
          </span>
        ) : result ? (
          "Regenerate evaluation"
        ) : (
          "Evaluate my activities"
        )}
      </button>

      {error && (
        <div className="mb-4">
          <p role="alert" className="text-red text-sm mb-2">{error}</p>
          <button onClick={handleSubmit} className="text-primary text-sm hover:text-primary-hover">
            Retry
          </button>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="bg-card border border-border rounded-2xl p-5 mb-4 flex items-center gap-4">
              <p className="font-serif text-3xl text-primary">{result.score}<span className="text-text-gray text-lg font-sans">/10</span></p>
              <p className="text-text-gray text-sm leading-relaxed">{result.score_rationale}</p>
            </div>

            {result.per_activity && result.per_activity.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 mb-4 space-y-2">
                <p className="text-text font-medium text-sm mb-1">Per-activity breakdown</p>
                {result.per_activity.map((pa, idx) => (
                  <div key={idx} className="py-1.5 border-b border-border last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-text text-sm truncate">{pa.activity}</p>
                        <p className="text-text-gray text-xs">{pa.note}</p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STRENGTH_STYLES[pa.strength] ?? "bg-secondary-tint text-text-gray"}`}
                      >
                        {pa.strength}
                      </span>
                    </div>
                    {(pa.strength === "weak" || pa.strength === "average") && (
                      <a
                        href={`/narrative?flagged_activity=${encodeURIComponent(pa.activity)}&flagged_note=${encodeURIComponent(pa.note)}`}
                        className="inline-block mt-1 text-xs text-primary hover:text-primary-hover"
                      >
                        Explore this in Narrative Builder →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-text-gray text-xs">
                AI-generated patterns based on your submitted activity list — not a guaranteed admissions outcome.
              </p>
              {result.suggestions.map((s, idx) => (
                <motion.div
                  key={idx}
                  initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: reduceMotion ? 0 : idx * 0.1 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <p className="text-primary text-sm font-medium mb-1">{s.label}</p>
                  <p className="text-text-gray text-sm leading-relaxed">{s.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
