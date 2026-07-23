"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import MissingFieldInputs from "@/components/MissingFieldInputs";
import { FIELD_LABELS } from "@/lib/mini-onboarding-fields";
import { track } from "@/lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;

// Full-screen pre-generate flow for Matches/Timeline, matching the primary
// onboarding's chrome (progress bar, one-round-at-a-time card, Back/Continue)
// rather than an inline panel dropped onto the feature page itself.
function hasValue(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return !!value?.trim();
}

export default function FeaturePrepFlow({
  backHref,
  heading,
  subheading,
  inlineFields,
  linkOutFields,
  feedbackQuestion,
  feedbackPlaceholder,
  completeLabel,
  generatingLabel,
  onComplete,
  required = false,
}: {
  backHref: string;
  heading: string;
  subheading: string;
  inlineFields: string[];
  linkOutFields: string[];
  feedbackQuestion: string;
  feedbackPlaceholder: string;
  completeLabel: string;
  generatingLabel: string;
  onComplete: (values: Record<string, string | string[]>, feedback: string) => Promise<{ error?: string }>;
  // When true, every inline-field round must be filled before advancing and
  // the "Skip these questions" escape hatch is removed entirely -- used for
  // the matches mini-onboarding, where the added profile detail measurably
  // improves match accuracy. Defaults to false so other callers (e.g. the
  // timeline prep flow) keep the original skippable behavior.
  required?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One round per missing field, then a final round for the optional
  // freeform feedback question -- mirrors the primary onboarding's structure.
  const totalRounds = inlineFields.length + 1;
  const isFeedbackRound = step === inlineFields.length;
  const isLastRound = step === totalRounds - 1;
  const progressPercent = Math.round(((step + 1) / totalRounds) * 100);
  const currentRoundFilled = isFeedbackRound || !required || hasValue(values[inlineFields[step]]);

  // Drop-off tracking (Software_Timeline.md 6b) -- this mini-onboarding flow
  // (matches/timeline prep) previously fired no analytics events at all,
  // unlike the primary onboarding's onboarding_step_viewed/onboarding_completed.
  // Same event shape, tagged by `heading` since each caller passes a distinct
  // one, so funnel drop-off can be measured per round without an extra prop.
  useEffect(() => {
    track("mini_onboarding_step_viewed", { flow: heading, step, total_steps: totalRounds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function goNext() {
    setStep((s) => Math.min(totalRounds - 1, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit(skippedFeedback?: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await onComplete(values, skippedFeedback ? "" : feedback);
      if (result.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      track("mini_onboarding_completed", { flow: heading, rounds_completed: totalRounds });
      // On success, onComplete is responsible for navigating away (this is a
      // dedicated pre-generate route, not an in-place panel) -- stay in the
      // "submitting" state until that navigation actually happens.
    } catch {
      // Any unhandled field left blank shouldn't be able to hang this in the
      // "submitting" spinner forever with no feedback -- always surface a
      // recoverable error instead.
      setError("Something went wrong on our end — your answers are still here, so just try again.");
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        <p role="status" className="font-serif text-2xl text-text mb-6">{generatingLabel}</p>
        <div className="h-1.5 w-64 max-w-full rounded-full bg-secondary-tint overflow-hidden">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-primary-deep"
            animate={
              reduceMotion
                ? undefined
                : { x: ["-100%", "220%"] }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-10 md:py-16 max-w-xl mx-auto w-full">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-text-gray hover:text-text text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>
      <motion.h1
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="font-serif text-3xl text-text mb-2"
      >
        {heading}
      </motion.h1>
      <p className="text-text-gray text-sm mb-6">{subheading}</p>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-text-gray">
            Round {step + 1} of {totalRounds}
          </p>
          <p className="text-xs text-text-gray">{progressPercent}% complete</p>
        </div>
        <div className="h-1.5 rounded-full bg-secondary-tint overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        </div>
      </div>

      <div className="space-y-5">
        {/* Keyed remount rather than AnimatePresence mode="wait" -- the
            exit/enter swap never completed reliably in this environment, so
            each round just fades/slides in fresh on mount instead. */}
        <motion.div
          key={step}
          initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          {isFeedbackRound ? (
            <>
              <p className="text-xs font-medium text-text-gray uppercase tracking-wide">Last thing</p>
              <div>
                <label className="block text-sm text-text-gray mb-1">
                  {feedbackQuestion} <span className="text-text-gray/70">(optional)</span>
                </label>
                <textarea
                  className="w-full rounded-xl bg-bg border border-border text-text text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-gray"
                  rows={3}
                  maxLength={1000}
                  placeholder={feedbackPlaceholder}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              {linkOutFields.length > 0 && (
                <p className="text-xs text-text-gray">
                  Also missing (edit full profile):{" "}
                  <Link href="/profile?edit=true" className="text-primary hover:underline">
                    {linkOutFields.map((f) => FIELD_LABELS[f]).join(", ")}
                  </Link>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-text-gray uppercase tracking-wide">
                {FIELD_LABELS[inlineFields[step]]}
              </p>
              <MissingFieldInputs
                fields={[inlineFields[step]]}
                values={values}
                onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
              />
            </>
          )}
        </motion.div>

        {error && (
          <div>
            <p role="alert" className="text-red text-sm">{error}</p>
            {error.toLowerCase().includes("upgrade to premium") && (
              <Link href="/upgrade" className="text-primary text-sm hover:text-primary-hover underline underline-offset-2">
                See Premium plans →
              </Link>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-border text-text-gray hover:text-text font-medium py-3 px-6"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLastRound ? submit() : goNext())}
            disabled={!currentRoundFilled}
            className="flex-1 rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLastRound ? completeLabel : "Continue"}
          </button>
        </div>
      </div>

      {!required && (
        <button
          type="button"
          onClick={() => submit(true)}
          className="text-text-gray hover:text-text text-xs underline underline-offset-2 mt-5 block mx-auto"
        >
          Skip these questions
        </button>
      )}
    </div>
  );
}
