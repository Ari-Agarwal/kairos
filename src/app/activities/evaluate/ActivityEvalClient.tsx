"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

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

export default function ActivityEvalClient({ activities: initialActivities }: { activities: string[] }) {
  const reduceMotion = useReducedMotion();
  const supabase = createClient();
  const [activities, setActivities] = useState(initialActivities.filter(Boolean));
  const [editingList, setEditingList] = useState(false);
  const [draftActivities, setDraftActivities] = useState(activities.join("\n"));
  const [savingActivities, setSavingActivities] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const activitiesText = activities.join("\n");
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
      body: JSON.stringify({ activitiesText }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to evaluate activities. Please try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setResult(data);
    setLoading(false);
    setHistory(null);
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
            <p className="text-text-gray text-sm">No past evaluations yet.</p>
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
            <ul className="space-y-1">
              {activities.map((a, i) => (
                <li key={i} className="text-text-gray text-sm">• {a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-text-gray text-sm">No activities yet. Use &quot;Edit list&quot; above to add some.</p>
          )}
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
                  <div key={idx} className="flex items-start justify-between gap-3 py-1.5 border-b border-border last:border-b-0">
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
