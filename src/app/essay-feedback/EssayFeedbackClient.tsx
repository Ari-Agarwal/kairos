"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

// The Common App personal statement limit -- the most common essay this
// feature is used for. Supplement-specific limits vary, so this is a
// reasonable default reference point, not a hard rule enforced anywhere.
const COMMON_APP_WORD_LIMIT = 650;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const DIMENSION_COLORS: Record<string, string> = {
  Specificity: "text-primary",
  Voice: "text-premium",
  Structure: "text-green",
  "Prompt Relevance": "text-red",
  Authenticity: "text-text-gray",
};

interface FeedbackItem {
  label: string;
  text: string;
  dimension?: string;
  quote?: string;
}

interface HistoryEntry {
  id: string;
  school: string | null;
  essay_text: string;
  feedback: FeedbackItem[];
  is_rubric: boolean;
  created_at: string;
}

interface BrainstormAngle {
  title: string;
  framing: string;
}

type Mode = "feedback" | "brainstorm";

export default function EssayFeedbackClient() {
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>("feedback");
  const [essay, setEssay] = useState("");
  const [school, setSchool] = useState("");
  const [supplementPrompt, setSupplementPrompt] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [isRubric, setIsRubric] = useState(false);
  const [angles, setAngles] = useState<BrainstormAngle[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history !== null) return;
    setLoadingHistory(true);
    const res = await fetch("/api/essay/feedback");
    if (res.ok) {
      const data = await res.json();
      setHistory(data.history ?? []);
    } else {
      setHistory([]);
    }
    setLoadingHistory(false);
  }

  function viewHistoryEntry(entry: HistoryEntry) {
    setMode("feedback");
    setEssay(entry.essay_text);
    setSchool(entry.school ?? "");
    setFeedback(entry.feedback);
    setIsRubric(entry.is_rubric);
    setAngles(null);
    setShowHistory(false);
  }

  async function handleFeedback() {
    if (!essay.trim()) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    const res = await fetch("/api/essay/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ essay, school: school.trim() || undefined, supplementPrompt: supplementPrompt.trim() || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to get feedback. Please try again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setFeedback(data.feedback);
    setIsRubric(!!data.rubric);
    setLoading(false);
    setHistory(null);
  }

  async function handleBrainstorm() {
    if (!supplementPrompt.trim()) return;
    setLoading(true);
    setError(null);
    setAngles(null);
    const res = await fetch("/api/essay/brainstorm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplementPrompt: supplementPrompt.trim(), school: school.trim() || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate brainstorm. Please try again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAngles(data.angles);
    setLoading(false);
  }

  function handleSubmit() {
    if (mode === "feedback") return handleFeedback();
    return handleBrainstorm();
  }

  const canSubmit = mode === "feedback" ? !!essay.trim() : !!supplementPrompt.trim();

  return (
    <div>
      <p className="text-text-gray text-xs bg-secondary-tint border border-border rounded-xl px-4 py-2.5 mb-5">
        Kairos helps you brainstorm and critique — you write the essay.
      </p>

      {/* Mode toggle */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex gap-2">
          {(["feedback", "brainstorm"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setFeedback(null); setAngles(null); setError(null); }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-primary text-bg"
                  : "bg-card border border-border text-text-gray hover:text-text"
              }`}
            >
              {m === "feedback" ? "Essay Feedback" : "Brainstorm Angles"}
            </button>
          ))}
        </div>
        {mode === "feedback" && (
          <button
            onClick={toggleHistory}
            className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-3 py-2 transition-colors shrink-0"
          >
            {showHistory ? "Hide History" : "History"}
          </button>
        )}
      </div>

      {showHistory && mode === "feedback" && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-5 space-y-2">
          {loadingHistory ? (
            <p className="text-text-gray text-sm">Loading history…</p>
          ) : !history || history.length === 0 ? (
            <p className="text-text-gray text-sm">No past feedback yet.</p>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                onClick={() => viewHistoryEntry(h)}
                className="w-full text-left rounded-xl border border-border px-3 py-2 hover:border-primary/40 transition-colors"
              >
                <p className="text-text text-sm truncate">{h.school || "No school specified"}</p>
                <p className="text-text-gray text-xs">
                  {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  {" — "}
                  {wordCount(h.essay_text)} words
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Context fields (both modes) */}
      <div className="flex gap-3 mb-3">
        <input
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="School name (optional)"
          maxLength={200}
          className="flex-1 rounded-xl bg-card border border-border px-4 py-2.5 text-text text-sm outline-none focus:border-primary"
        />
      </div>
      <textarea
        value={supplementPrompt}
        onChange={(e) => setSupplementPrompt(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={
          mode === "brainstorm"
            ? "Paste the supplement prompt you're responding to…"
            : "Supplement prompt (optional) — paste it here to get prompt-specific feedback"
        }
        className="w-full rounded-2xl bg-card border border-border px-4 py-3 text-text text-sm outline-none focus:border-primary resize-none mb-3"
      />

      {/* Essay draft (feedback mode only) */}
      {mode === "feedback" && (
        <>
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={10}
            aria-label="Essay draft"
            placeholder="Paste your essay draft here…"
            className="w-full rounded-2xl bg-card border border-border px-4 py-3 text-text text-sm outline-none focus:border-primary resize-none mb-1"
          />
          <p className={`text-xs mb-3 ${wordCount(essay) > COMMON_APP_WORD_LIMIT ? "text-red" : "text-text-gray"}`}>
            {wordCount(essay)} / {COMMON_APP_WORD_LIMIT} words (Common App personal statement limit — supplements vary)
          </p>
        </>
      )}

      <p className="text-text-gray text-xs mb-4">
        {mode === "brainstorm"
          ? "Angle suggestions are AI-generated using your saved profile and activities."
          : "Your draft is sent to our AI provider (Anthropic) to generate feedback."}
      </p>

      <button
        onClick={handleSubmit}
        disabled={loading || !canSubmit}
        className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-2.5 disabled:opacity-50 mb-6"
      >
        {loading ? (
          <span role="status" className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-bg ambient-star" style={{ ["--twinkle-max" as string]: "1", ["--twinkle-duration" as string]: "1s" }} />
            {mode === "brainstorm" ? "Generating angles…" : "Reading your draft…"}
          </span>
        ) : (
          mode === "brainstorm" ? "Generate Angles" : "Get Feedback"
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
        {feedback && (
          <div className="space-y-3">
            <p className="text-text-gray text-xs">
              AI-generated feedback — use it as a starting point, not a final verdict on your essay.
            </p>
            {feedback.map((f, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: reduceMotion ? 0 : idx * 0.12 }}
                className="bg-card border border-border rounded-2xl p-4"
              >
                {isRubric && f.dimension && (
                  <span className={`text-xs font-semibold uppercase tracking-wide ${DIMENSION_COLORS[f.dimension] ?? "text-text-gray"} mb-1 block`}>
                    {f.dimension}
                  </span>
                )}
                <p className="text-primary text-sm font-medium mb-1">{f.label}</p>
                {isRubric && f.quote && (
                  <p className="text-text-gray text-xs italic border-l-2 border-border pl-3 mb-2">&quot;{f.quote}&quot;</p>
                )}
                <p className="text-text-gray text-sm leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        )}

        {angles && (
          <div className="space-y-3">
            <p className="text-text-gray text-xs">
              AI-generated angle suggestions — these are starting points, not prescriptions.
            </p>
            {angles.map((a, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: reduceMotion ? 0 : idx * 0.12 }}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <p className="text-primary text-sm font-medium mb-1">{a.title}</p>
                <p className="text-text-gray text-sm leading-relaxed">{a.framing}</p>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
