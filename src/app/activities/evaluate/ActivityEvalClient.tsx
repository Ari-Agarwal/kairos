"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

interface Suggestion {
  label: string;
  text: string;
}

interface EvalResult {
  score: number;
  score_rationale: string;
  suggestions: Suggestion[];
}

export default function ActivityEvalClient({ activities }: { activities: string[] }) {
  const reduceMotion = useReducedMotion();
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activitiesText = activities.filter(Boolean).join("\n");
  const hasActivities = activitiesText.trim().length > 0;

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
  }

  return (
    <div>
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        {hasActivities ? (
          <ul className="space-y-1">
            {activities.filter(Boolean).map((a, i) => (
              <li key={i} className="text-text-gray text-sm">• {a}</li>
            ))}
          </ul>
        ) : (
          <p className="text-text-gray text-sm">No activities on your profile yet. Add them in your profile first.</p>
        )}
      </div>

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
