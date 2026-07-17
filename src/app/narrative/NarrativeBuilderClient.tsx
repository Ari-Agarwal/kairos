"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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
}

const EMPTY_ANSWERS: Answers = {
  moment: "",
  revealed: "",
  pattern: "",
  struggle: "",
  differentiator: "",
  direction: "",
};

export default function NarrativeBuilderClient({ initial }: { initial: NarrativeSynthesis & { answers: Answers } | null }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initial?.answers ?? EMPTY_ANSWERS);
  const [result, setResult] = useState<NarrativeSynthesis | null>(
    initial
      ? {
          throughline: initial.throughline,
          core_values: initial.core_values,
          growth_arc: initial.growth_arc,
          differentiator: initial.differentiator,
          essay_angles: initial.essay_angles,
          gaps: initial.gaps,
        }
      : null
  );
  const [editing, setEditing] = useState(!initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = QUESTIONS.length;
  const current = QUESTIONS[step];
  const currentValue = answers[current.key];

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/narrative/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to generate your narrative. Please try again.");
      setLoading(false);
      return;
    }

    const data: NarrativeSynthesis = await res.json();
    setResult(data);
    setEditing(false);
    setLoading(false);
  }

  if (!editing && result) {
    return (
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="bg-card border border-border rounded-2xl p-6 mb-4">
          <p className="text-primary text-xs font-medium uppercase tracking-wide mb-2">Your throughline</p>
          <p className="font-serif text-xl text-text leading-snug">{result.throughline}</p>
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
              <p className="text-text-gray text-sm leading-relaxed">{a.framing}</p>
            </motion.div>
          ))}
        </div>

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

        <button
          onClick={() => {
            setEditing(true);
            setStep(0);
          }}
          className="text-primary text-sm hover:text-primary-hover"
        >
          Edit your answers
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <p className="text-text-gray text-xs bg-secondary-tint border border-border rounded-xl px-4 py-2.5 mb-5">
        Kairos helps you brainstorm and critique — you write the essay.
      </p>

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

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
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
      </AnimatePresence>

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
            disabled={!currentValue.trim()}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-6 py-2.5 disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || !currentValue.trim()}
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
