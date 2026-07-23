"use client";

// Section 1 "Showcase / demo polish": a staged UI moment for cross-feature
// coalescence. crossFeatureWhyText() (src/lib/cross-feature-why.ts) marks the
// data side of these inserts (Career Path -> Matches, Narrative Builder ->
// Timeline); this is the visible confirmation that fires at the moment of
// insert, from the source screen, instead of a silent background write.
// Auto-dismisses; gated behind `motion-reduce:` (fades in place instead of
// sliding for reduced-motion users, per the restraint check).

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";

export default function CrossFeatureToast({
  message,
  show,
  onDone,
  durationMs = 3200,
}: {
  message: string;
  show: boolean;
  onDone: () => void;
  durationMs?: number;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [show, onDone, durationMs]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-card border border-primary/40 shadow-lg px-4 py-3 max-w-sm text-sm text-text"
        >
          <Sparkles className="size-4 text-primary shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
