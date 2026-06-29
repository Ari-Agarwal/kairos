"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

interface FeedbackItem {
  label: string;
  text: string;
}

export default function EssayFeedbackClient() {
  const [essay, setEssay] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!essay.trim()) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    const res = await fetch("/api/essay/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to get feedback. Please try again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setFeedback(data.feedback);
    setLoading(false);
  }

  return (
    <div>
      <textarea
        value={essay}
        onChange={(e) => setEssay(e.target.value)}
        rows={10}
        placeholder="Paste your essay draft here..."
        className="w-full rounded-2xl bg-card border border-border px-4 py-3 text-text text-sm outline-none focus:border-primary resize-none mb-4"
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !essay.trim()}
        className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-2.5 disabled:opacity-50 mb-6"
      >
        {loading ? "Reading your draft..." : "Get Feedback"}
      </button>

      {error && (
        <div className="mb-4">
          <p className="text-red text-sm mb-2">{error}</p>
          <button onClick={handleSubmit} className="text-primary text-sm hover:text-primary-hover">
            Retry
          </button>
        </div>
      )}

      <AnimatePresence>
        {feedback && (
          <div className="space-y-3">
            <p className="text-text-gray text-xs">
              AI-generated feedback — use it as a starting point, not a final verdict on your essay.
            </p>
            {feedback.map((f, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE, delay: idx * 0.08 }}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <p className="text-primary text-sm font-medium mb-1">{f.label}</p>
                <p className="text-text-gray text-sm leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
